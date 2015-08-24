import * as persil from "../../..";
import * as grammar from "./calc.ebnf.grammar";
import * as terminals from "./calc-terminals.ebnf.grammar";

const methods = {
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
            return typeof this.value === "string" ? parseInt(this.value) : this.value.result;
        }
    }
};

const parseCalc = persil.ast.parser(grammar, {methods, scan: persil.ast.scanner(terminals)});
const src = "56 + 37*2 - (8/75 + 904)";
const expr = parseCalc(src);

if (expr.error) {
    process.stderr.write(persil.error(src, expr) + "\n");
}

console.log(`Result = ${expr.data.result}`);
console.log(`State count = ${expr.stateCount}`);
