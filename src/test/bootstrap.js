import * as persil from "./persil";
import * as fs from "fs";
import * as stage0 from "./bnf-stage0";

var bnf = fs.readFileSync("src/lib/bnf-stage1.g", {encoding: "utf-8"});

// Compile BNF with stage 0 parser
var stage1 = stage0.compile(bnf);

if (stage1.error) {
    error(stage1);
}

// Compile BNF with stage 1 parser
stage1.data.postprocess = stage0.postprocess;
var stage2 = persil.parse(stage1.data, "grammar", bnf);

if (stage2.error) {
    error(stage2);
}

// Compile BNF with stage 2 parser
stage2.data.postprocess = stage0.postprocess;
var stage3 = persil.parse(stage2.data, "grammar", bnf);

if (stage3.error) {
    error(stage3);
}
else {
    console.log(stage3.data);
}

// TODO check that stage 1 and stage 2 produce same parser
// TODO use stage 0, 1, and 2 parsers on another grammar

function error(obj) {
    throw `Parse error at ${obj.loc}\n` + obj.traces.map(t =>
        t.map(e => e.symbol.toString() + ":" + e.loc).join(" > ")
    ).join("\n");
}
