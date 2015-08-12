import * as fs from "fs";
import * as persil from "../lib/persil";
import * as bnf from "../lib/bnf";
import * as ebnf from "../lib/ebnf.bnf";

var ebnfBnf = fs.readFileSync("src/lib/ebnf.bnf", {encoding: "utf-8"});
var calcEbnf = fs.readFileSync("src/test/calc.ebnf", {encoding: "utf-8"});

var stage1 = bnf.compile(ebnfBnf);

if (stage1.error) {
    error(ebnfBnf, stage1);
}

stage1.data.postprocess = ebnf.postprocess;

var stage2 = persil.parse(stage1.data, "grammar", calcEbnf);

if (stage2.error) {
    error(calcEbnf, stage2);
}

var stage2bnf = stage2.data.generate();

stage2bnf.nodeTypes.start.extend({
    evaluate() {
        return this.body.evaluate();
    }
});

stage2bnf.nodeTypes.expr.extend({
    evaluate() {
        let first = this.operands[0].evaluate();
        return this.operators ?
            this.operators.reduce((prev, curr, index) =>
                curr === "+" ?
                    prev + this.operands[index + 1].evaluate() :
                    prev - this.operands[index + 1].evaluate(),
                first) :
            first;
    }
});

stage2bnf.nodeTypes.term.extend({
    evaluate() {
        let first = this.operands[0].evaluate();
        return this.operators ?
            this.operators.reduce((prev, curr, index) =>
                curr === "*" ?
                    prev * this.operands[index + 1].evaluate() :
                    prev / this.operands[index + 1].evaluate(),
                first) :
            first;
    }
});

stage2bnf.nodeTypes.primary.extend({
    evaluate() {
        return this.value.evaluate();
    }
});

stage2bnf.nodeTypes.int.extend({
    evaluate() {
        return parseInt(this.$text);
    }
});

// FIXME space is required at the end
var str = "56 + 37*2 - (8 /75 + 904 ) ";
var stage3 = persil.parse(stage2bnf, "start", str);

if (stage3.error) {
    error(str, stage3);
}

console.log(stage3.data.evaluate());

function location(src, loc) {
    var line = 1;
    var col = 1;
    for (var i = 0; i < loc; i ++) {
        switch (src[i]) {
            case "\r":
                line ++;
                col = 1;
                if (src[i+1] === "\n") {
                    i ++;
                }
                break;
            case "\n":
                line ++;
                col = 1;
                if (src[i+1] === "\r") {
                    i ++;
                }
                break;
            default:
                col ++;
        }
    }
    return {line, col};
}

function error(src, obj) {
    var loc = location(src, obj.loc);
    throw `Parse error at ${obj.loc}\n` + obj.traces.map(t =>
        t.map(e => e.symbol.toString() + ":" + loc.line + "," + loc.col).join(" > ")
    ).join("\n");
}
