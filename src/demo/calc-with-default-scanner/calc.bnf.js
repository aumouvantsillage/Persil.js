import * as persil from "../../..";
import * as grammar from "./calc.bnf.grammar";
import {terminals} from "./calc-terminals";
import {actions} from "./calc";

const parseCalc = persil.parser(grammar, {actions, scan: persil.scanner(terminals)});
const src = "56 + 37*2 - (8/75 + 904)";
const expr = parseCalc(src);

if (expr.error) {
    process.stderr.write(persil.error(src, expr) + "\n");
}

console.log(`Result = ${expr.data}`);
console.log(`State count = ${expr.stateCount}`);

