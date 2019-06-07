import * as core from "./core";
import {Token} from "./scanner";

export function create(proto, props = {}) {
    return extend(Object.create(proto), props);
}

export function extend(obj, props) {
    Object.getOwnPropertyNames(props).forEach(p => {
        const desc = Object.getOwnPropertyDescriptor(props, p);
        desc.enumerable = false;
        Object.defineProperty(obj, p, desc);
    });
    return obj;
}

function flatten(arr) {
    let res = arr.reduce((prev, elt) => prev.concat(elt instanceof Array ? flatten(elt) : [elt]), []);
    return res.length === 0 ? null :
           res.length === 1 ? res[0] :
           res;
}

function actions(grammar, rule, production, data, options, str) {
    const symbol = grammar.symbols[rule];

    // If the current rule has no property mapping:
    // if the current rule does not map to an explicit AST node, or
    // if the current production contains a single element that maps to an AST node,
    // return the flattened input data.
    if (grammar.astMappings[rule][production].every(m => m === null) &&
        (!(symbol in grammar.nodeTypes) || grammar.rules[rule][production].length === 1 && grammar.symbols[grammar.rules[rule][production][0]] in grammar.nodeTypes)) {
        return flatten(data);
    }

    // Create a new AST node or a plain object.
    const res = symbol in grammar.nodeTypes ? create(grammar.nodeTypes[symbol]) : {};
    res.$loc = 0;
    res.$len = 0;
    res.$str = str;

    // Inspect each child item and fill the result object.
    data.forEach((child, index) => {
        // If there is a property mapping for the given production at the current index,
        // assign the current child directly.
        const mapping = grammar.astMappings[rule][production][index];
        if (mapping !== null) {
            if (!mapping.push) {
                res[mapping.to] = child;
            }
            else if(!(mapping.to in res)) {
                res[mapping.to] = [child];
            }
            else {
                res[mapping.to].push(child);
            }
        }

        // Force the child to be an array of elements
        if (!(child instanceof Array)) {
            child = [child];
        }

        // Update the text representation of the current node.
        for (let elt of child) {
            if (elt instanceof Token) {
                if (!res.$len) {
                    res.$loc = elt.loc;
                }
                res.$len += elt.text.length + elt.loc - res.$loc;
            }
            else if (elt) {
                if (!res.$len) {
                    res.$loc = elt.$loc;
                }
                res.$len += elt.$len + elt.$loc - res.$loc;

                // If there is no mapping, inline all properties of each element
                // into the current node. This allows to decompose a rule into
                // fragments without creating an AST node for each fragment.
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
        }
    });

    return res;
}

function indent(level) {
    let res = "";
    for (let i = 0; i < level; i ++) {
        res += "\t";
    }
    return res;
}

function valueToString(value, level) {
    const i = "\n" + indent(level + 1);
    if (value instanceof Array) {
        return "[" + i +
            value.map(item => valueToString(item, level + 1)).join(i) +
            "\n" + indent(level) + "]";
    }
    if (typeof value === "object") {
        if (value.toString === Object.prototype.toString) {
            return "{" + i +
                Object.entries(value)
                    .filter(([k, v]) => typeof v !== "function")
                    .map(([k, v]) => k + ": " + valueToString(v, level + 1))
                    .join(i) +
                "\n" + indent(level) + "}";
        }
        else {
            return value.toString(level);
        }
    }
    return JSON.stringify(value);
}

const defaultMethods = {
    toString(level=0) {
        const i = "\n" + indent(level + 1);
        return this.$type + " {" + i +
            Object.entries(this).map(([key, value]) => key + ": " + valueToString(value, level + 1)).join(i) +
            "\n" + indent(level) + "}";
    },

    get $text() {
        return this.$str.slice(this.$loc, this.$loc + this.$len);
    }
};

export function parser(grammar, {start, methods, scan} = {}) {
    for (let t in methods) {
        if (t in grammar.nodeTypes) {
            extend(grammar.nodeTypes[t], defaultMethods);
            extend(grammar.nodeTypes[t], methods[t]);
        }
    }
    return core.parser(grammar, {start, actions, scan});
}

export function scanner(grammar) {
    const parse = parser(grammar);

    return str => {
        let tokens = [];
        let loc = 0;
        let res = {};
        while (loc < str.length) {
            res = parse(str.slice(loc));
            if (!res.data) {
                break;
            }

            const newLoc = res.token ? loc + res.token.loc : str.length;
            tokens.push(new Token(res.data.token.$type, str.slice(loc, newLoc), loc));
            loc = newLoc;
        }
        res.loc = loc;
        res.data = tokens;
        return res;
    };
}
