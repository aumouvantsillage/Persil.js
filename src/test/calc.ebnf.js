import * as fs from "fs";
import * as persil from "../lib/persil";
import * as bnf from "../lib/bnf";
import * as ebnf from "../lib/ebnf.bnf";
import {error} from "../lib/logging";

// Bootstrap EBNF parser
const ebnfBnfSrc = fs.readFileSync("src/lib/ebnf.bnf", {encoding: "utf-8"});
const ebnfBnf = bnf.compile(ebnfBnfSrc);

if (ebnfBnf.error) {
    error(ebnfBnfSrc, ebnfBnf);
}

const ebnfGrammar = ebnfBnf.data;
ebnfGrammar.postprocess = ebnf.postprocess;

// Create calc parser
const calcEbnfSrc = fs.readFileSync("src/test/calc.ebnf", {encoding: "utf-8"});
const calcEbnf = persil.parse(ebnfGrammar, "grammar", calcEbnfSrc);

if (calcEbnf.error) {
    error(calcEbnfSrc, calcEbnf);
}

const calcGrammar = calcEbnf.data.generate();

// Add behavior to AST nodes
calcGrammar.nodeTypes.start.extend({
    evaluate() {
        return this.body.evaluate();
    }
});

calcGrammar.nodeTypes.expr.extend({
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
});

calcGrammar.nodeTypes.term.extend({
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
});

calcGrammar.nodeTypes.primary.extend({
    evaluate() {
        return this.value.evaluate();
    }
});

calcGrammar.nodeTypes.int.extend({
    evaluate() {
        return parseInt(this.$text);
    }
});

// Parse a sample string

// FIXME space should be optional at the end
const exprSrc = "56 + 37*2 - (8 /75 + 904 ) ";
const expr = persil.parse(calcGrammar, "start", exprSrc);

if (expr.error) {
    error(exprSrc, expr);
}

console.log(expr.data.evaluate());

