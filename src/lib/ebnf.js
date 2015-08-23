import * as core from "./core";
import * as grammar from "./ebnf.bnf.grammar.js";
import {create} from "./ast";
import {scanner} from "./lexer";

const nodeTypes = {
    grammar: {
        transform(options) {
            if (!options.scanner) {
                for (let i = 0; i < this.rules.length; i ++) {
                    this.rules[i].definition.splitTerminals(this, {});
                }
            }
            for (let i = 0; i < this.rules.length; i ++) {
                this.rules[i].definition.removeMultiplicity(this);
            }
            for (let i = 0; i < this.rules.length; i ++) {
                this.rules[i].definition.removeInnerChoices(this);
            }
        },

        generate(options) {
            const nodeTypes = {};
            this.rules.forEach(rule => {
                nodeTypes[rule.name.text] = {};
            });

            this.transform(options);

            const symbols = this.rules.map(rule => rule.name.text);
            const rules = this.rules.map(rule => rule.definition.generate(symbols, {}, {}));
            const ignore = [];
            this.ignore.forEach(sym => sym.generate(ignore, {}));

            return {
                symbols,
                ignore,
                rules,
                astMappings: this.rules.map(rule => rule.definition.astMappings),
                nodeTypes
            };
        },

        toString() {
            return this.rules.map(rule => rule.toString()).join("\n\n");
        }
    },

    rule: {
        toString() {
            return `${this.name}:\n\t${this.definition.toString()}`;
        }
    },

    choice: {
        generate(symbols, regexps, external) {
            return this.elements.map(seq => seq.generate(symbols, regexps, external));
        },

        splitTerminals(grammar, terminals) {
            this.elements.forEach(seq => {
                seq.splitTerminals(grammar, terminals);
            });
        },

        removeMultiplicity(grammar) {
            this.elements.forEach(seq => {
                seq.removeMultiplicity(grammar);
            });
        },

        removeInnerChoices(grammar) {
            this.elements.forEach(seq => {
                seq.removeInnerChoices(grammar);
            });
        },

        get astMappings() {
            return this.elements.map(seq => seq.astMappings);
        },

        toString() {
            return this.elements.map(seq => seq.toString()).join("\n\t| ");
        }
    },

    sequence: {
        splitTerminals(grammar, terminals) {
            this.elements.forEach(term => {
                term.splitTerminals(grammar, terminals);
            });
        },

        removeMultiplicity(grammar) {
            this.elements.forEach(term => {
                term.removeMultiplicity(grammar);
            });
        },

        removeInnerChoices(grammar) {
            this.elements.forEach(term => {
                term.removeInnerChoices(grammar);
            });
        },

        generate(symbols, regexps, external) {
            return this.elements.map(term => term.value.generate(symbols, regexps, external));
        },

        get astMappings() {
            return this.elements.map(term => term.variable ? {
                to: term.variable.text,
                push: term.operator === "+="
            } : null);
        },

        toString() {
            return this.elements.map(term => term.toString()).join(" ");
        }
    },

    term: {
        splitTerminals(grammar, terminals) {
            if (this.value.splitTerminals) {
                this.value.splitTerminals(grammar, terminals);
            }
            if (!nodeTypes.string.isPrototypeOf(this.value) || this.value.content.length < 2) {
                return;
            }
            let ruleName;
            if (this.value.content in terminals) {
                ruleName = terminals[this.value.content];
            }
            else {
                ruleName = terminals[this.value.content] = create(nodeTypes.id, {
                    text: "$" + grammar.rules.length
                });
                grammar.rules.push(create(nodeTypes.rule, {
                    name: ruleName,
                    definition: create(nodeTypes.choice, {
                        elements: [
                            create(nodeTypes.sequence, {
                                elements: this.value.content.split("").map(ch =>
                                    create(nodeTypes.term, {
                                        variable: null,
                                        operator: null,
                                        value: create(nodeTypes.string, {
                                            content: ch
                                        }),
                                        multiplicity: null
                                    })
                                )
                            })
                        ]
                    })
                }));
            }
            this.value = ruleName;
        },

        // v=p?  => r ... r: v=p    | %
        // v+=p* => r ... r: r v+=p | %
        // v+=p+ => r ... r: r v+=p | v+=p
        removeMultiplicity(grammar) {
            if (this.value.removeMultiplicity) {
                this.value.removeMultiplicity(grammar);
            }
            if (!this.multiplicity) {
                return;
            }

            const ruleName = create(nodeTypes.id, {
                text: "$" + grammar.rules.length
            });
            grammar.rules.push(create(nodeTypes.rule, {
                name: ruleName,
                definition: create(nodeTypes.choice, {
                    elements: [
                        create(nodeTypes.sequence, {
                            elements:
                                (
                                    this.multiplicity === "?" ?
                                        [] :
                                        [
                                            create(nodeTypes.term, {
                                                value: ruleName
                                            })
                                        ]
                                ).concat([
                                    create(nodeTypes.term, {
                                        variable: this.variable,
                                        operator: this.operator,
                                        value: this.value,
                                        multiplicity: null
                                    })
                                ])
                        }),
                        create(nodeTypes.sequence, {
                            elements: this.multiplicity === "+" ?
                                [
                                    create(nodeTypes.term, {
                                        variable: this.variable,
                                        operator: this.operator,
                                        value: this.value,
                                        multiplicity: null
                                    })
                                ] :
                                []
                        })
                    ]
                })
            }));

            this.value = ruleName;
            this.variable = this.operator = this.multiplicity = null;
        },

        // v=a|b => v=r ... r: a|b
        removeInnerChoices(grammar) {
            if (this.value.removeInnerChoices) {
                this.value.removeInnerChoices(grammar);
            }

            if (!nodeTypes.choice.isPrototypeOf(this.value)) {
                return;
            }

            const ruleName = create(nodeTypes.id, {
                text: "$" + grammar.rules.length
            });
            grammar.rules.push(create(nodeTypes.rule, {
                name: ruleName,
                definition: this.value
            }));
            this.value = ruleName;
        },

        toString() {
            const valueAsString = nodeTypes.choice.isPrototypeOf(this.value) ?
                `(${this.value.toString()})` :
                this.value.toString();
            return `${this.variable || ""}${this.operator || ""}${valueAsString}${this.multiplicity || ""}`;
        }
    },

    id: {
        generate(symbols, regexps, external) {
            let res = symbols.indexOf(this.text);
            if (res >= 0) {
                return res;
            }
            if (!(this.text in external)) {
                external[this.text] = symbols.length;
                symbols.push({ext: this.text});
            }
            return external[this.text];
        },

        toString() {
            return this.text;
        }
    },

    string: {
        splitTerminals(grammar, terminals) {
            this.content = JSON.parse(`"${this.content}"`);
        },

        generate(symbols, regexps) {
            let index = symbols.indexOf(this.content);
            if (index < 0) {
                index = symbols.length;
                symbols.push(this.content);
            }
            return index;
        },

        toString() {
            return `"${this.content}"`;
        }
    },

    range: {
        generate(symbols, regexps) {
            if (!(this.text in regexps)) {
                regexps[this.text] = symbols.length;
                symbols.push(new RegExp("^" + this.text));
            }
            return regexps[this.text];
        },

        toString() {
            return this.text;
        }
    },

    regexp: {
        generate(symbols, regexps) {
            if (!(this.text in regexps)) {
                regexps[this.text] = symbols.length;
                const maybeFlag = this.text[this.text.length - 1];
                let re = maybeFlag === "/" ?
                    new RegExp("^" + this.text.slice(1, this.text.length - 1)) :
                    new RegExp("^" + this.text.slice(1, this.text.length - 2), maybeFlag);
                symbols.push(re);
            }
            return regexps[this.text];
        }
    }
};

export function actions(grammar, rule, production, data, options) {
    switch (grammar.symbols[rule]) {
        case "grammar":
            return create(nodeTypes.grammar, {
                rules: data[0],
                ignore: data[1]
            }).generate(options);

        case "rule_list":
        case "ignore_list":
            if (production === 0) {
                data[0].push(data[1]);
                return data[0];
            }
            break;

        case "rule":
            return create(nodeTypes.rule, {
                name: data[0],
                definition: data[2]
            });

        case "choice":
            switch (production) {
                case 0:
                    data[0].elements.push(data[2]);
                    return data[0];

                case 1:
                    return create(nodeTypes.choice, {
                        elements: data
                    });
            }
            break;

        case "sequence":
            switch (production) {
                case 0:
                    data[0].elements.push(data[1]);
                    return data[0];

                case 1:
                    return create(nodeTypes.sequence, {
                        elements: data
                    });
            }
            break;

        case "term":
            return create(nodeTypes.term, {
                variable: data[0] && data[0].variable,
                operator: data[0] && data[0].operator,
                value: data[1],
                multiplicity: data[2]
            });

        case "target":
            if (production === 0) {
                return {
                    variable: data[0],
                    operator: data[1]
                };
            }
            break;

        case "primary":
            switch (production) {
                case 0:
                case 1:
                case 2:
                case 3: return data[0];
                case 4: return data[1];
            }
            break;

        case "id":
            return create(nodeTypes.id, {
                text: data[0]
            });

        case "string":
            return create(nodeTypes.string, {
                content: data[0].slice(1, data[0].length - 1)
            });

        case "range":
            return create(nodeTypes.range, {
                text: data[0]
            });

        case "regexp":
            return create(nodeTypes.regexp, {
                text: data[0]
            });

        case "ignore_def":
            return data[1];

        case "assignment_operator":
        case "multiplicity":
        case "ignore_term":
            return data[0];
    }
    return data;
}

export const compile = core.parser(grammar, {actions, scan: scanner(grammar)});
