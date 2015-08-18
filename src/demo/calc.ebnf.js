import * as fs from "fs";
import * as ebnf from "../lib/ebnf";
import {error} from "../lib/logging";
import * as grammar from "./calc.ebnf.grammar";

const methods = {
    start: {
        evaluate() {
            return this.body.evaluate();
        }
    },

    expr: {
        evaluate() {
            const first = this.operands[0].evaluate();
            return this.operators ?
                this.operators.reduce((prev, curr, index) =>
                    curr === "+" ?
                        prev + this.operands[index + 1].evaluate() :
                        prev - this.operands[index + 1].evaluate(),
                    first) :
                first;
        }
    },

    term: {
        evaluate() {
            const first = this.operands[0].evaluate();
            return this.operators ?
                this.operators.reduce((prev, curr, index) =>
                    curr === "*" ?
                        prev * this.operands[index + 1].evaluate() :
                        prev / this.operands[index + 1].evaluate(),
                    first) :
                first;
        }
    },

    primary: {
        evaluate() {
            return this.value.evaluate();
        }
    },

    int: {
        evaluate() {
            return parseInt(this.$text);
        }
    }
};

const parseCalc = ebnf.parser(grammar, {methods});
const exprSrc = "56 + 37*2 - (8 /75 + 904 )";
const expr = parseCalc(exprSrc);

if (expr.error) {
    error(exprSrc, expr);
}

console.log(expr.data.evaluate());
console.log(`State count = ${expr.stateCount}`);

