import * as fs from "fs";
import * as persil from "../lib/persil";
import {error} from "../lib/logging";
import {actions} from "./calc";
import * as grammar from "./calc.bnf.grammar";

const parseCalc = persil.parser(grammar, {start: "start", actions});
const exprSrc = "56 + 37*2 - (     8 /   75 + 904)";
const expr = parseCalc(exprSrc);

if (expr.error) {
    error(exprSrc, expr);
}

console.log(expr.data);
console.log(`State count = ${expr.stateCount}`);
