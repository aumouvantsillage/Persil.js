
import * as persil from "../../..";
import * as grammar from "./calc-scanner.ebnf.grammar";

const parse = persil.ast.parser(grammar);

for (let t in grammar.nodeTypes) {
    grammar.nodeTypes[t].hasType = type => t === type;
}

export function scan(str) {
    let tokens = [];
    let loc = 0;
    let res = {};
    while (loc < str.length) {
        res = parse(str.slice(loc));
        if (!res.data) {
            break;
        }
        if ("value" in res.data.token) {
            tokens.push(persil.ast.extend(res.data.token, {loc}));
        }
        loc += res.data.token.$text.length;
    }
    res.loc = loc;
    res.data = tokens;
    return res;
}
