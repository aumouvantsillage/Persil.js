import * as core from "./core";
import * as grammar from "./ebnf.bnf.grammar.js";
import {create} from "./ast";
import {scanner} from "./regexp-scanner";

const terminals = {
    delim: /^[:|()]/,
    assignment_operator: /^=|^\+=/,
    multiplicity: /^[?+*]/,
    special: /^\+\+/,
    id: /^[a-zA-Z0-9_]+/,
    string: /^"([^"\\]|\\.)+"/,
    range: [/^\[([^\]\\]|\\.)+\]/, "."],
    ignore: [/^[ \r\n\t]+/, /^\/\/[^\r\n]*/, /^\/\*([^*]|\*+[^*\/])*\*+\//]
};

const nodeTypes = {
    grammar: {
        transform(options) {
            if (!options.scanner) {
                for (let r of this.rules) {
                    if (r.definition.splitTerminals) {
                        r.definition.splitTerminals(this, {});
                    }
                }
            }
            for (let r of this.rules) {
                if (r.definition.removeMultiplicity) {
                    r.definition.removeMultiplicity(this);
                }
            }
            for (let r of this.rules) {
                if (r.definition.removeInnerChoices) {
                    r.definition.removeInnerChoices(this);
                }
            }
        },

        generate(options) {
            const nodeTypes = {};
            this.rules.forEach(rule => {
                nodeTypes[rule.name.text] = {$type: rule.name.text};
            });

            this.transform(options);

            const symbols = this.rules.map(rule => rule.name.text);
            const regexps = {};
            const external =  {};
            const rules = this.rules.map(rule => rule.definition.generate(this, symbols, regexps, external));

            console.log("Found references to external symbols: " + Object.keys(external).join(", "));

            return {
                symbols,
                rules,
                astMappings: this.rules.map(rule => rule.definition.astMappings),
                nodeTypes,
                sensitivity: options.sensitivity
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
        generate(grammar, symbols, regexps, external) {
            return this.elements.map(seq => seq.generate(grammar, symbols, regexps, external));
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

        generate(grammar, symbols, regexps, external) {
            return this.elements.map(term => term.value.generate(grammar, symbols, regexps, external));
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
            if (this.multiplicity && typeof this.multiplicity !== "string" && this.multiplicity.separator.splitTerminals) {
                this.multiplicity.separator.splitTerminals(grammar, terminals);
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
                                        value: create(nodeTypes.string, {
                                            content: ch
                                        })
                                    })
                                )
                            })
                        ]
                    })
                }));
            }
            this.value = ruleName;
        },

        // v=p?    => r ... r: v=p      | %
        // v+=p*   => r ... r: r v+=p   | %
        // v+=p+   => r ... r: r v+=p   | v+=p
        // v+=p++s => r ... r: r s v+=p | v+=p
        removeMultiplicity(grammar) {
            if (this.value.removeMultiplicity) {
                this.value.removeMultiplicity(grammar);
            }

            // If the term has no multiplicity, leave immediately.
            if (!this.multiplicity) {
                return;
            }

            // If the term is a separated list (using operator "++"),
            // move the separator definition to a new rule.
            let separatorRuleName;
            if (typeof this.multiplicity !== "string") {
                // Generate a new rule name for the separator subexpression.
                separatorRuleName = create(nodeTypes.id, {
                    text: "$" + grammar.rules.length
                });

                // Copy the separator subexpression to the new rule.
                grammar.rules.push(create(nodeTypes.rule, {
                    name: separatorRuleName,
                    definition: create(nodeTypes.choice, {
                        elements: [create(nodeTypes.sequence, {
                            elements: [create(nodeTypes.term, {
                                value: this.multiplicity.separator
                            })]
                        })]
                    })
                }));
            }

            // Generate a new rule name for the current term.
            const ruleName = create(nodeTypes.id, {
                text: "$" + grammar.rules.length
            });

            // Create the terms of the first production of the new rule.
            const p0 = [];
            if (this.multiplicity !== "?") {
                p0.push(create(nodeTypes.term, {value: ruleName}));
            }
            if (separatorRuleName) {
                p0.push(create(nodeTypes.term, {value: separatorRuleName}))
            }
            p0.push(create(nodeTypes.term, {
                variable: this.variable,
                operator: this.operator,
                value: this.value
            }));

            // Create the terms of the second production of the new rule.
            const p1 = [];
            if (this.multiplicity === "+" || separatorRuleName) {
                p1.push(create(nodeTypes.term, {
                    variable: this.variable,
                    operator: this.operator,
                    value: this.value
                }));
            }

            grammar.rules.push(create(nodeTypes.rule, {
                name: ruleName,
                definition: create(nodeTypes.choice, {
                    elements: [
                        create(nodeTypes.sequence, {elements: p0}),
                        create(nodeTypes.sequence, {elements: p1})
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
        generate(grammar, symbols, regexps, external) {
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
        generate(grammar, symbols, regexps) {
            let index = symbols.slice(grammar.rules.length).indexOf(this.content);
            if (index >= 0) {
                index += grammar.rules.length;
            }
            else {
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
        generate(grammar, symbols, regexps) {
            if (!(this.text in regexps)) {
                regexps[this.text] = symbols.length;
                symbols.push(new RegExp("^" + this.text));
            }
            return regexps[this.text];
        },

        toString() {
            return this.text;
        }
    }
};

export function actions(grammar, rule, production, data, options) {
    switch (grammar.symbols[rule]) {
        case "grammar":
            return create(nodeTypes.grammar, {
                rules: data[0]
            }).generate(options);

        case "rule_list":
            if (production === 0) {
                data[0].push(data[1]);
                return data[0];
            }
            break;

        case "rule":
            return create(nodeTypes.rule, {
                name: create(nodeTypes.id, {text: data[0].text}),
                definition: data[2]
            });

        case "choice":
            switch (production) {
                case 0:
                    data[0].elements.push(data[2]);
                    return data[0];

                case 1: return create(nodeTypes.choice, {elements: data});
            }
            break;

        case "sequence":
            switch (production) {
                case 0:
                    data[0].elements.push(data[1]);
                    return data[0];

                case 1:
                    return create(nodeTypes.sequence, {elements: data});
            }
            break;

        case "term":
            return create(nodeTypes.term, {
                variable: data[0] && create(nodeTypes.id, {text: data[0].variable}),
                operator: data[0] && data[0].operator,
                value: data[1],
                multiplicity: data[2]
            });

        case "target":
            switch (production) {
                case 0: return {variable: data[0].text, operator: data[1].text};
                case 1: return null;
            }
            break;

        case "primary":
            switch (production) {
                case 0: return create(nodeTypes.id, {text: data[0].text});
                case 1: return create(nodeTypes.string, {content: JSON.parse(data[0].text)});
                case 2: return create(nodeTypes.range, {text: data[0].text});
                case 3: return data[1];
            }
            break;

        case "multiplicity_opt":
            switch (production) {
                case 0: return data[0].text;
                case 1: return {separator: data[1]};
                case 2: return null;
            }
    }
    return data;
}

export const compile = core.parser(grammar, {actions, scan: scanner(terminals)});
