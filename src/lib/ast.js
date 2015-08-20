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

function actions(grammar, rule, production, data, options) {
    const symbol = grammar.symbols[rule];
    const res = symbol in grammar.nodeTypes ? create(grammar.nodeTypes[symbol]) : {};
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
        else if (typeof value !== "string") {
            for (let prop in value) {
                if (prop in res && res[prop] instanceof Array) {
                    Array.prototype.push.apply(res[prop], value[prop]);
                }
                else if (prop !== "$text") {
                    res[prop] = value[prop];
                }
            }
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

export function parser(grammar, {start, methods, scan}) {
    for (let n in methods) {
        extend(grammar.nodeTypes[n], methods[n]);
    }
    return core.parser(grammar, {start, actions, scan});
}
