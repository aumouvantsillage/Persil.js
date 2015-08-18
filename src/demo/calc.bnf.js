import * as persil from "../..";
import * as grammar from "./calc.bnf.grammar";
import {actions} from "./calc";

const parseCalc = persil.parser(grammar, {start: "start", actions});
const exprSrc = "56 + 37*2 - (     8 /   75 + 904)";
const expr = parseCalc(exprSrc);

if (expr.error) {
    console.log(persil.error(exprSrc, expr));
}
else {
    console.log(expr.data);
    console.log(`State count = ${expr.stateCount}`);
}

