import * as persil from "./persil";
import * as grammar from "./ebnf.bnf.grammar.js";

function create(proto, props = {}) {
    return extend(Object.create(proto), props);
}

function extend(obj, props) {
    Object.getOwnPropertyNames(props).forEach(p => {
        Object.defineProperty(obj, p, Object.getOwnPropertyDescriptor(props, p));
    });
    return obj;
}

const nodeTypes = {
    grammar: {
        transform() {
            for (let i = 0; i < this.rules.length; i ++) {
                this.rules[i].definition.splitTerminals(this, {});
            }
            for (let i = 0; i < this.rules.length; i ++) {
                this.rules[i].definition.removeMultiplicity(this);
            }
            for (let i = 0; i < this.rules.length; i ++) {
                this.rules[i].definition.splitRanges();
            }
            for (let i = 0; i < this.rules.length; i ++) {
                this.rules[i].definition.removeInnerChoices(this);
            }
        },

        generate() {
            const nodeTypes = {};
            this.rules.forEach(rule => {
                nodeTypes[rule.name.text] = {};
            });

            this.transform();

            const symbols = this.rules.map(rule => rule.name.text);
            const rules = this.rules.map(rule => rule.definition.generate(symbols, {}));
            return {
                symbols,
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
        generate(symbols, regexps) {
            return this.elements.map(seq => seq.generate(symbols, regexps));
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

        splitRanges() {
            this.elements.forEach(seq => {
                seq.splitRanges();
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

        splitRanges() {
            this.elements.forEach(term => {
                term.splitRanges();
            });
        },

        removeInnerChoices(grammar) {
            this.elements.forEach(term => {
                term.removeInnerChoices(grammar);
            });
        },

        generate(symbols, regexps) {
            return this.elements.map(term => term.value.generate(symbols, regexps));
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

        splitRanges() {
            if (this.value.splitRanges) {
                this.value.splitRanges();
            }

            if (!nodeTypes.ranges.isPrototypeOf(this.value) || this.value.elements.length < 2) {
                return;
            }

            this.value = create(nodeTypes.choice, {
                elements: [
                    create(nodeTypes.sequence, {
                        elements: this.value.elements.map(range =>
                            create(nodeTypes.term, {
                                variable: null,
                                operator: null,
                                value: create(nodeTypes.ranges, {
                                    elements: [range]
                                }),
                                multiplicity: null
                            })
                        )
                    })
                ]
            });
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
        generate(symbols, regexps) {
            return symbols.indexOf(this.text);
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

    ranges: {
        generate(symbols, regexps) {
            return this.elements[0].generate(symbols, regexps);
        },

        toString() {
            return this.elements.map(range => range.toString()).join("");
        }
    },

    range: {
        generate(symbols, regexps) {
            if (!(this.text in regexps)) {
                regexps[this.text] = symbols.length;
                symbols.push(new RegExp(this.text));
            }
            return regexps[this.text];
        },

        toString() {
            return this.text;
        }
    }
};

export function actions(grammar, rule, production, data, start, end) {
    switch (grammar.symbols[rule]) {
        case "grammar":
            return create(nodeTypes.grammar, {
                rules: data[1]
            }).generate();

        case "rules":
            if (production === 0) {
                return data[0].concat([data[2]]);
            }
            break;

        case "rule":
            return create(nodeTypes.rule, {
                name: data[0],
                definition: data[4]
            });

        case "choice":
            switch (production) {
                case 0:
                    data[0].elements.push(data[4]);
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
                    data[0].elements.push(data[2]);
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
                value: data[2],
                multiplicity: data[4]
            });

        case "target":
            if (production === 0) {
                return {
                    variable: data[0],
                    operator: data[2]
                };
            }
            break;

        case "primary":
            switch (production) {
                case 0:
                case 1:
                case 2: return data[0];
                case 3: return data[1];
            }
            break;

        case "id":
            switch (production) {
                case 0:
                    data[0].text += data[1];
                    return data[0];

                case 1:
                    return create(nodeTypes.id, {
                        text: data[0]
                    });
            }
            break;

        case "string":
            return create(nodeTypes.string, {
                content: data[1]
            });

        case "ranges":
            switch (production) {
                case 0:
                    data[0].elements.push(data[1]);
                    return data[0];

                case 1:
                    return create(nodeTypes.ranges, {
                        elements: data
                    });
            }
            break;

        case "range":
            return create(nodeTypes.range, {
                text: data.join("")
            });

        case "assignment_operator":
        case "multiplicity":
        case "string_content":
        case "string_char":
        case "range_content":
        case "range_char":
            return data.join("");
    }
    return data;
}

function ebnfActions(grammar, rule, production, data, start, end) {
    const symbol = grammar.symbols[rule];
    const res = symbol[0] === "$" ? {} : create(grammar.nodeTypes[symbol]);
    res.$text = "";
    data.forEach((value, index) => {
        const mapping = grammar.astMappings[rule][production][index];
        if (mapping !== null) {
            if (!mapping.push) {
                res[mapping.to] = value;
            }
            else if(!(mapping.to in res)) {
                res[mapping.to] = [value];
            }
            else {
                res[mapping.to].push(value);
            }
        }
        else if (value !== null && typeof value !== "string") {
            Object.keys(value).forEach(prop => {
                if (prop[0] === "$") {
                    return;
                }
                if (prop in res && res[prop] instanceof Array) {
                    Array.prototype.push.apply(res[prop], value[prop]);
                }
                else {
                    res[prop] = value[prop];
                }
            });
        }

        if (typeof value === "string") {
            res.$text += value;
        }
        else if (value !== null) {
            res.$text += value.$text;
        }
    });

    return res;
}

export const compile = persil.parser(grammar, {actions});

export function parser(grammar, {start, methods}) {
    for (let n in methods) {
        extend(grammar.nodeTypes[n], methods[n]);
    }
    return persil.parser(grammar, {start, actions: ebnfActions});
}
