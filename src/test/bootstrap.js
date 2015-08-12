import * as fs from "fs";
import * as persil from "../lib/persil";
import * as bnf from "../lib/bnf";
import * as ebnf from "../lib/ebnf.bnf";

var ebnfBnf = fs.readFileSync("src/lib/ebnf.bnf", {encoding: "utf-8"});
var ebnfEbnf = fs.readFileSync("src/lib/ebnf.ebnf", {encoding: "utf-8"});

// Compile EBNF grammar with bootstrap parser
var stage1 = bnf.compile(ebnfBnf);

if (stage1.error) {
    error(ebnfBnf, stage1);
}

// Compile EBNF grammar with EBNF parser
stage1.data.postprocess = ebnf.postprocess;
var stage2 = persil.parse(stage1.data, "grammar", ebnfEbnf);

if (stage2.error) {
    error(ebnfEbnf, stage2);
}

var stage2grammar = stage2.data.generate();

console.log(stage2.data.toString());

// Compile EBNF grammar with generated EBNF parser
var stage3 = persil.parse(stage2grammar, "grammar", ebnfEbnf);

if (stage3.error) {
    error(ebnfEbnf, stage3);
}

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
