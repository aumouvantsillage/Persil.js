import * as persil from "../..";
import * as grammar from "./calc.ebnf.grammar";

const methods = {
    start: {
        evaluate() {
            return this.body.evaluate();
        }
    },

    expr: {
        evaluate() {
            const first = this.first.evaluate();
            return this.operations ?
                this.operations.reduce((prev, curr) =>
                    curr.operator === "+" ?
                        prev + curr.operand.evaluate() :
                        prev - curr.operand.evaluate(),
                    first) :
                first;
        }
    },

    term: {
        evaluate() {
            const first = this.first.evaluate();
            return this.operations ?
                this.operations.reduce((prev, curr) =>
                    curr.operator === "*" ?
                        prev * curr.operand.evaluate() :
                        prev / curr.operand.evaluate(),
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

const parseCalc = persil.ast.parser(grammar, {methods});
const exprSrc = "56 + 37*2 - (8 /75 + 904 )";
const expr = parseCalc(exprSrc);

if (expr.error) {
    console.log(persil.error(exprSrc, expr));
}
else {
    console.log(expr.data.evaluate());
    console.log(`State count = ${expr.stateCount}`);
}
