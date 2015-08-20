import * as persil from "../../..";
import * as grammar from "./calc.bnf.grammar";
import {actions} from "./calc";

const parseCalc = persil.parser(grammar, {start: "start", actions});
const src = "56 + 37*2 - (8/75 + 904)";
const expr = parseCalc(src);

if (expr.error) {
    process.stderr.write(persil.error(src, expr) + "\n");
    process.exit();
}

console.log(expr.data);
console.log(`State count = ${expr.stateCount}`);

