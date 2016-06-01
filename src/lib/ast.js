import * as core from "./core";

export function create(proto, props = {}) {
    return extend(Object.create(proto), props);
}

export function extend(obj, props) {
    Object.getOwnPropertyNames(props).forEach(p => {
        Object.defineProperty(obj, p, Object.getOwnPropertyDescriptor(props, p));
    });
    return obj;
}

function flatten(arr) {
    let res = arr.reduce((prev, elt) => prev.concat(elt instanceof Array ? flatten(elt) : [elt]), []);
    return res.length === 0 ? null :
           res.length === 1 ? res[0] :
           res;
}

function actions(grammar, rule, production, data, options) {
    const symbol = grammar.symbols[rule];

    if (!(symbol in grammar.nodeTypes) && grammar.astMappings[rule][production].every(m => m === null)) {
        return flatten(data);
    }

    const res = symbol in grammar.nodeTypes ? create(grammar.nodeTypes[symbol]) : {};
    res.$text = "";

    data.forEach((value, index) => {
        const mapping = grammar.astMappings[rule][production][index];

        // If there is a mapping, assign the current value directly
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

        // Assume that value is an array of elements
        if (!(value instanceof Array)) {
            value = [value];
        }

        value.forEach(elt => {
            if (typeof elt === "string") {
                res.$text += elt;
            }
            else if (elt !== null) {
                res.$text += elt.$text;

                // If there is no mapping, inline all properties of each element
                // into the current AST node
                if (mapping === null) {
                    for (let prop in elt) {
                        if (prop[0] !== "$") {
                            if (prop in res && res[prop] instanceof Array) {
                                res[prop].push(...elt[prop]);
                            }
                            else {
                                res[prop] = elt[prop];
                            }
                        }
                    }
                }
            }
        });
    });

    return res;
}

export function parser(grammar, {start, methods, scan} = {}) {
    for (let t in methods) {
        if (t in grammar.nodeTypes) {
            extend(grammar.nodeTypes[t], methods[t]);
        }
    }
    return core.parser(grammar, {start, actions, scan});
}

export function scanner(grammar) {
    for (let t in grammar.nodeTypes) {
        grammar.nodeTypes[t].type = t;
    }

    const parse = parser(grammar);

    function collapseValue(value) {
        if (value === null) {
            return "";
        }
        else if (typeof value === "string") {
            return value;
        }
        else if (value.join) {
            return value.map(collapseValue).join("");
        }
        else {
            return value.$text;
        }
    }

    return (str) => {
        let tokens = [];
        let loc = 0;
        let res = {};
        while (loc < str.length) {
            res = parse(str.slice(loc));
            if (!res.data) {
                break;
            }
            if ("value" in res.data.token) {
                tokens.push({
                    type: res.data.token.type,
                    value: collapseValue(res.data.token.value),
                    loc
                });
            }
            loc += res.data.token.$text.length;
        }
        res.loc = loc;
        res.data = tokens;
        return res;
    };
}
