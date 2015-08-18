import * as persil from "../../..";
import * as grammar from "./calc.ebnf.grammar";

const methods = {
    start: {
        get result() {
            return this.body.result;
        }
    },

    expr: {
        get result() {
            const first = this.first.result;
            return this.operations ?
                this.operations.reduce((prev, curr) =>
                    curr.operator === "+" ?
                        prev + curr.operand.result :
                        prev - curr.operand.result,
                    first) :
                first;
        }
    },

    term: {
        get result() {
            const first = this.first.result;
            return this.operations ?
                this.operations.reduce((prev, curr) =>
                    curr.operator === "*" ?
                        prev * curr.operand.result :
                        prev / curr.operand.result,
                    first) :
                first;
        }
    },

    primary: {
        get result() {
            return this.value.result;
        }
    },

    int: {
        get result() {
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
    console.log(expr.data.result);
    console.log(`State count = ${expr.stateCount}`);
}
