import * as fs from "fs";
import * as persil from "../lib/persil";
import * as bnf from "../lib/bnf";
import {error} from "../lib/logging";
import {postprocess} from "./calc";

// Create calc parser
const calcBnfSrc = fs.readFileSync("src/test/calc.bnf", {encoding: "utf-8"});
const calcBnf = bnf.compile(calcBnfSrc);

if (calcBnf.error) {
    error(calcBnfSrc, calcBnf);
}

const calcGrammar = calcBnf.data;
calcGrammar.postprocess = postprocess;

// Parse a sample string
const exprSrc = "56 + 37*2 - (     8 /   75 + 904)";
const expr = persil.parse(calcGrammar, "start", exprSrc);

if (expr.error) {
    error(exprSrc, expr);
}

console.log(expr.data);
console.log(`State count = ${expr.stateCount}`);
