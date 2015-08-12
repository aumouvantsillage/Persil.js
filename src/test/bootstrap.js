import * as fs from "fs";
import * as persil from "../lib/persil";
import * as bnf from "../lib/bnf";
import * as ebnf from "../lib/ebnf.bnf";
import {error} from "../lib/logging";

// Compile EBNF grammar with bootstrap parser
const ebnfBnfSrc = fs.readFileSync("src/lib/ebnf.bnf", {encoding: "utf-8"});
const ebnfBnf = bnf.compile(ebnfBnfSrc);

if (ebnfBnf.error) {
    error(ebnfBnfSrc, ebnfBnf);
}

const ebnfGrammar1 = ebnfBnf.data;
ebnfGrammar1.postprocess = ebnf.postprocess;

// Compile EBNF grammar with native EBNF parser
const ebnfEbnfSrc = fs.readFileSync("src/lib/ebnf.ebnf", {encoding: "utf-8"});
const ebnfEbnf1 = persil.parse(ebnfGrammar1, "grammar", ebnfEbnfSrc);

if (ebnfEbnf1.error) {
    error(ebnfEbnfSrc, ebnfEbnf1);
}

const ebnfGrammar2 = ebnfEbnf1.data.generate();

console.log(ebnfEbnf1.data.toString());

// Compile EBNF grammar with generated EBNF parser
const ebnfEbnf2 = persil.parse(ebnfGrammar2, "grammar", ebnfEbnfSrc);

if (ebnfEbnf2.error) {
    error(ebnfEbnfSrc, ebnfEbnf2);
}
