
let ASTNode = {
    create(obj) {
        return Object.create(this).extend(obj);
    },

    extend(obj) {
        Object.getOwnPropertyNames(obj).forEach(prop => {
            Object.defineProperty(this, prop, Object.getOwnPropertyDescriptor(obj, prop));
        });
        return this;
    }
};

let nodeTypes = {
    grammar: ASTNode.create({
        transform() {
            this.rules.forEach(rule => {
                rule.definition.removeMultiplicity(this);
            });
        }
    }),

    rule: ASTNode.create({}),

    choice: ASTNode.create({
        removeMultiplicity(grammar) {
            this.elements.forEach(seq => {
                seq.removeMultiplicity(grammar);
            });
        }
    }),

    sequence: ASTNode.create({
        removeMultiplicity(grammar) {
            this.elements.forEach(term => {
                term.removeMultiplicity(grammar);
            });
        }
    }),

    term: ASTNode.create({
        // p? => r ... r: p   | %
        // p* => r ... r: p r | %
        // p+ => r ... r: p r | p
        removeMultiplicity(grammar) {
            if (this.value.removeMultiplicity) {
                this.value.removeMultiplicity(grammar);
            }
            if (!this.multiplicity) {
                return;
            }

            let ruleName = "$" + grammar.rules.length;
            grammar.rules.push(nodeTypes.rule.create({
                name: ruleName,
                definition: nodeTypes.choice.create({
                    elements: [
                        nodeTypes.sequence.create({
                            elements: [
                                nodeTypes.term.create({
                                    variable: this.variable,
                                    value: this.value,
                                    multiplicity: null
                                })
                            ].concat(
                                this.multiplicity === "?" ?
                                    [] :
                                    [
                                        nodeTypes.term.create({
                                            value: nodeTypes.id.create({
                                                text: ruleName
                                            })
                                        })
                                    ]
                            )
                        }),
                        nodeTypes.sequence.create({
                            elements: this.multiplicity === "+" ?
                                [
                                    nodeTypes.term.create({
                                        variable: this.variable,
                                        value: this.value,
                                        multiplicity: null
                                    })
                                ] :
                                []
                        })
                    ]
                })
            }));

            this.value = nodeTypes.id.create({
                text: ruleName
            });
            this.variable = this.multiplicity = null;
        }


    }),

    id: ASTNode.create({}),
    string: ASTNode.create({}),
    ranges: ASTNode.create({}),
    range: ASTNode.create({})
};

export function postprocess(rule, production, data, start, end) {
    switch (this.symbols[rule]) {
        case "grammar":
            return nodeTypes.grammar.create({
                rules: data[1]
            });

        case "rules":
            if (production === 0) {
                return [data[0]].concat(data[2]);
            }
            break;

        case "rule":
            return nodeTypes.rule.create({
                name: data[0],
                definition: data[4]
            });

        case "choice":
            switch (production) {
                case 0:
                    data[4].elements.unshift(data[0]);
                    return data[4];

                case 1:
                    return nodeTypes.choice.create({
                        elements: data
                    });
            }
            break;

        case "sequence":
            switch (production) {
                case 0:
                    data[2].elements.unshift(data[0]);
                    return data[2];

                case 1:
                    return nodeTypes.sequence.create({
                        elements: data
                    });
            }
            break;

        case "term":
            return nodeTypes.term.create({
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
                    data[1].text = data[0] + data[1].text;
                    return data[1];

                case 1:
                    return nodeTypes.id.create({
                        text: data[0]
                    });
            }
            break;

        case "string":
            return nodeTypes.string.create({
                content: data[1]
            });

        case "ranges":
            switch (production) {
                case 0:
                    data[1].elements.unshift(data[0]);
                    return data[1];

                case 1:
                    return nodeTypes.ranges.create({
                        elements: data
                    });
            }
            break;

        case "range":
            return nodeTypes.range.create({
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

    // Transform sub-expressions
    // a | (b | c) => a | b | c
    // a (b c) => a b c
    // a (b | c) => a r ... r: b | c
//    for (var r = 0; r < ast.rules.length; r ++) {
//        ast.rules[r].definition.elements.forEach(seq => {
//            seq.elements.forEach(term => {
//
//            });
//        });
//    }

