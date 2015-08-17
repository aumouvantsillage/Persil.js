import * as persil from "./persil";

const GRAMMAR = 0;
const RULES = 1;
const RULE = 2;
const CHOICE = 3;
const SEQUENCE = 4;
const TERM = 5;

const ID = 6;
const CHARACTER = 7;
const RANGE = 8;
const RANGE_CONTENT = 9;
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
const NOT_RBRACKET = 23;
const SPACE = 24;
const ANY_CHAR = 25;

const grammar = {
    symbols: [
        // Non-terminal
        "grammar", "rules", "rule", "choice", "sequence", "term",
        "id", "character", "range", "range_chars", "range_char",
        "whitespace", "optional_whitespace",
        // Terminal
        ":", "|", ".", "%", "\"", "[", "]", "\\",
        /[a-zA-Z0-9_]/, /[^"\\]/, /[^\]\\]/, /[ \r\n\t]/, /./
    ],
    rules: [
        // grammar: _ rule (__ rule)* _
        [
            [_, RULES, _]
        ],
        [
            [RULES, __, RULE],
            [RULE]
        ],
        // rule: id _ ":" _ sequence (_ "|" _ sequence)*
        [
            [ID, _, COLON, _, CHOICE]
        ],
        [
            [CHOICE, _, PIPE, _, SEQUENCE],
            [SEQUENCE]
        ],
        // sequence: term (__ term)*
        [
            [SEQUENCE, __, TERM],
            [TERM],
            [PERCENT]
        ],
        // term: id | character | range | '.' | '%'
        [
            [ID],
            [CHARACTER],
            [RANGE],
            [DOT]
        ],
        // id: [a-zA-Z_]+
        [
            [ID, ID_CHAR],
            [ID_CHAR]
        ],
        // character: "'" . "'"
        [
            [QUOTE, NOT_QUOTE, QUOTE],
            [QUOTE, BACKSLASH, ANY_CHAR, QUOTE]
        ],
        // range: "[" ([^\]\\] | \\.)+ "]"
        [
            [LBRACKET, RANGE_CONTENT, RBRACKET]
        ],
        [
            [RANGE_CONTENT, RANGE_CHAR],
            [RANGE_CHAR]
        ],
        [
            [NOT_RBRACKET],
            [BACKSLASH, ANY_CHAR]
        ],
        // __: [ \r\n\t]+
        [
            [_, SPACE]
        ],
        // _: __?
        [
            [__],
            []
        ]
    ],
    postprocess
};

function postprocess(rule, production, data, start, end) {
    switch (rule) {
        case GRAMMAR:
            return generate(data[1]);
        case RULES:
            if (production === 0) {
                return data[0].concat([data[2]]);
            }
            break;
        case RULE:
            return {
                rule: data[0],
                productions: data[4]
            };
        case CHOICE:
            if (production === 0) {
                return data[0].concat([data[4]]);
            }
            break;
        case SEQUENCE:
            switch (production) {
                case 0: return data[0].concat([data[2]]);
                case 2: return [];
            }
            break;
        case TERM:
            switch (production) {
                case 0: return data[0];
                case 1: return JSON.parse(data[0]);
                case 2:
                case 3: return new RegExp(data[0]);
            }
            break;
        case ID:
        case CHARACTER:
        case RANGE:
        case RANGE_CONTENT:
        case RANGE_CHAR:
            return data.join("");
    }
    return data;
}

function generate(data) {
    const symbols = data.map(r => r.rule);
    const regexps = {};
    const rules = data.map(r =>
        r.productions.map(p =>
            p.map(t => {
                let i;
                if (typeof t === "string") {
                    i = symbols.indexOf(t);
                }
                else if (t.toString() in regexps) {
                    i = regexps[t.toString()];
                }
                else {
                    regexps[t.toString()] = symbols.length;
                    i = -1;
                }

                if (i >= 0) {
                    return i;
                }
                else {
                    symbols.push(t);
                    return symbols.length - 1;
                }
            })
        )
    );

    const res = {
        symbols,
        rules,
        postprocess(rule, production, data, start, end) {
            return data;
        }
    };

    persil.markNullableRules(res);

    return res;
}

export function compile(src) {
    return persil.parse(grammar, "grammar", src);
}
