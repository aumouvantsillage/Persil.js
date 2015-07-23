import * as persil from "./persil";
import * as fs from "fs";

const GRAMMAR = 0;
const RULE_LIST = 1;
const RULE = 2;
const PRODUCTION_LIST = 3;
const PRODUCTION = 4;
const TERM = 5;

const ID = 6;
const CHARACTER = 7;
const RANGE = 8;
const RANGE_EXP = 9;
const RANGE_CHAR = 10;
const __ = 11;
const _ = 12;

const COLON = 13;
const PIPE = 14;
const DOT = 15;
const PERCENT = 16;
const QUOTE = 17;
const LBRACKET = 18;
const RBRACKET = 19;
const BACKSLASH = 20;

const ID_CHAR = 21;
const NOT_QUOTE = 22;
const RANGE_SIMPLE_CHAR = 23;
const SPACE = 24;
const ANY_CHAR = 25;

var grammar = {
    symbols: [
        // Non-terminal
        "grammar", "rule_list", "rule", "production_list", "production", "term",
        "id", "character", "range", "range_exp", "range_char",
        "whitespace", "optional_whitespace",
        // Terminal
        ":", "|", ".", "%", "'", "[", "]", "\\",
        /[a-zA-Z_]/, /[^']/, /[^\]\\]/, /[ \r\n\t]/, /./
    ],
    rules: [
        // grammar: _ rule (__ rule)* _
        [
            [_, RULE_LIST, _]
        ],
        [
            [RULE, __, RULE_LIST],
            [RULE]
        ],
        // rule: id _ ":" _ production (_ "|" _ production)*
        [
            [ID, _, COLON, _, PRODUCTION_LIST]
        ],
        [
            [PRODUCTION, _, PIPE, _, PRODUCTION_LIST],
            [PRODUCTION]
        ],
        // production: term (__ term)*
        [
            [TERM, __, PRODUCTION],
            [TERM]
        ],
        // term: id | character | range | '.' | '%'
        [
            [ID],
            [CHARACTER],
            [RANGE],
            [DOT],
            [PERCENT]
        ],
        // id: [a-zA-Z_]+
        [
            [ID_CHAR, ID],
            [ID_CHAR]
        ],
        // character: "'" . "'"
        [
            [QUOTE, NOT_QUOTE, QUOTE],
            [QUOTE, BACKSLASH, ANY_CHAR, QUOTE]
        ],
        // range: "[" ([^\]\\] | \\.)+ "]"
        [
            [LBRACKET, RANGE_EXP, RBRACKET]
        ],
        [
            [RANGE_CHAR, RANGE_EXP],
            [RANGE_CHAR]
        ],
        [
            [RANGE_SIMPLE_CHAR],
            [BACKSLASH, ANY_CHAR]
        ],
        // __: [ \r\n\t]+
        [
            [SPACE, _]
        ],
        // _: __?
        [
            [__],
            []
        ]
    ],
    postprocess(rule, production, data, start, end) {
        switch (rule) {
            case GRAMMAR:
                return data[1];
            case RULE_LIST:
                if (production === 0) {
                    return [data[0]].concat(data[2]);
                }
                break;
            case RULE:
                return {
                    rule: data[0],
                    productions: data[4]
                };
            case PRODUCTION_LIST:
                if (production === 0) {
                    return [data[0]].concat(data[4]);
                }
                break;
            case PRODUCTION:
                if (production === 0) {
                    return [data[0]].concat(data[2]);
                }
                break;
            case TERM:
                return data[0];
            case ID:
            case CHARACTER:
            case RANGE:
            case RANGE_EXP:
            case RANGE_CHAR:
                if (typeof data !== "string") {
                    return data.join("");
                }
                break;
        }
        return data;
    }
};

fs.readFile(process.argv[2], {encoding: "utf-8"}, (err, data) => {
    var res = persil.parse(grammar, GRAMMAR, data);
    if (res.error) {
        console.log("Parse error at " + res.location);
        console.log(res.traces.map(t =>
            t.map(e => e.rule ? e.rule + ":" + e.loc : e.toString()).join(" > ")
        ).join("\n"));
    } else {
        console.log(JSON.stringify(res.data));
    }
});
