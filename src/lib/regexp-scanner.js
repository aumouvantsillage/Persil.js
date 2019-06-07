
import {Token} from "./scanner";

export function scanner(terminals) {
    const list = [];
    for (let type in terminals) {
        if (terminals[type] instanceof Array) {
            list.push(...terminals[type].map(def => ({type, def})));
        }
        else {
            list.push({type, def: terminals[type]});
        }
    }
    return str => scan(list, str);
}

function search(list, str, loc) {
    return list.reduce((prev, curr) => {
        const match = curr.def instanceof RegExp ? curr.def.exec(str) :
                      str.slice(0, curr.def.length) === curr.def ? [curr.def] :
                      null;
        return match && (!prev || match[0].length > prev.value.length) ? new Token(curr.type, match[0], loc) : prev;
    }, null);
}

function scan(list, str) {
    const tokens = [];
    let loc = 0;
    while (loc < str.length) {
        const substr = str.slice(loc);

        let res = search(list, substr, loc);
        if (!res) {
            break;
        }

        tokens.push(res);

        loc += res.value.length;
    }

    return {
        error: loc < str.length,
        loc,
        expected: list.map(elt => elt.def),
        data: tokens
    };
}
