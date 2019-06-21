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
            const first = this.operands[0].result;
            return this.operators ?
                this.operators.reduce((prev, curr, index) =>
                    curr.text === "+" ?
                        prev + this.operands[index + 1].result :
                        prev - this.operands[index + 1].result,
                    first) :
                first;
        }
    },

    term: {
        get result() {
            const first = this.operands[0].result;
            return this.operators ?
                this.operators.reduce((prev, curr, index) =>
                    curr.text === "*" ?
                        prev * this.operands[index + 1].result :
                        prev / this.operands[index + 1].result,
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
const src = "56 + 37*2 - (8/75 + 904)";
const expr = parseCalc(src);

if (expr.error) {
    process.stderr.write(persil.error(src, expr) + "\n");
}

console.log(expr.data.toString());
console.log(`Result = ${expr.data.result}`);
console.log(`State count = ${expr.stateCount}`);
