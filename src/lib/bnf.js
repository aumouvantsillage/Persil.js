import * as core from "./core";
import {error} from "./logging";
import {scanner} from "./lexer";

const GRAMMAR = 0;
const RULE_LIST = 1;
const RULE = 2;
const CHOICE = 3;
const SEQUENCE = 4;
const TERM = 5;
const IGNORE_LIST = 6;
const IGNORE_DEF = 7;
const IGNORE_TERM = 8;

const COLON = 9;
const PIPE = 10;
const DOT = 11;
const PERCENT = 12;
const TILDE = 13;
const ID = 14;
const STRING = 15;
const RANGE = 16;
const REGEXP = 17;

const grammar = {
    symbols: [
        // Non-terminal
        "grammar", "rule_list", "rule", "choice", "sequence", "term",
        "ignore_list", "ignore_def", "ignore_term",

        // Terminal
        ":", "|", ".", "%", "~",
        /^[a-zA-Z0-9_]+/,
        /^"([^"\\]|\\.)+"/,
        /^\[([^\]\\]|\\.)+\]/,
        /^\/([^/\\]|\\.)+\/[gimy]?/
    ],
    ignore: [/^[ \r\n\t]+/],
    rules: [
        // grammar: rule+ ignore_def*
        [
            [RULE_LIST, IGNORE_LIST]
        ],
        [
            [RULE_LIST, RULE],
            [RULE]
        ],
        // rule: id ":" sequence ("|" sequence)*
        [
            [ID, COLON, CHOICE]
        ],
        [
            [CHOICE, PIPE, SEQUENCE],
            [SEQUENCE]
        ],
        // sequence: (term | "%")+
        [
            [SEQUENCE, TERM],
            [TERM],
            [PERCENT]
        ],
        // term: id | character | range | '.'
        [
            [ID],
            [STRING],
            [RANGE],
            [DOT],
            [REGEXP]
        ],
        // ignore_list: ignore_def*
        [
            [IGNORE_LIST, IGNORE_DEF],
            []
        ],
        // ignore_def: "~" (string | range | regexp)
        [
            [TILDE, IGNORE_TERM]
        ],
        [
            [STRING],
            [RANGE],
            [REGEXP]
        ]

    ]
};

function actions(grammar, rule, production, data, options) {
    switch (rule) {
        case GRAMMAR:
            return generate(data);

        case RULE_LIST:
            if (production === 0) {
                data[0].push(data[1]);
                return data[0];
            }
            break;

        case RULE:
            return {
                rule: data[0],
                productions: data[2]
            };

        case CHOICE:
            if (production === 0) {
                data[0].push(data[2]);
                return data[0];
            }
            break;

        case SEQUENCE:
            switch (production) {
                case 0:
                    data[0].push(data[1]);
                    return data[0];
                case 2:
                    return [];
            }
            break;

        case TERM:
            switch (production) {
                case 0: return data[0];
                case 1: return JSON.parse(data[0]);
                case 2:
                case 3: return new RegExp("^" + data[0]);
                case 4:
                    let maybeFlag = data[0][data[0].length - 1];
                    if (maybeFlag === "/") {
                        return new RegExp("^" + data[0].slice(1, data[0].length - 1));
                    }
                    else {
                        return new RegExp("^" + data[0].slice(1, data[0].length - 2), maybeFlag);
                    }
            }
            break;

        case IGNORE_LIST:
            if (production === 0) {
                data[0].push(data[1]);
                return data[0];
            }
            break;

        case IGNORE_DEF:
            return data[1];

        case IGNORE_TERM:
            switch (production) {
                case 0: return JSON.parse(data[0]);
                case 1: return new RegExp("^" + data[0]);
                case 2:
                    let maybeFlag = data[0][data[0].length - 1];
                    if (maybeFlag === "/") {
                        return new RegExp("^" + data[0].slice(1, data[0].length - 1));
                    }
                    else {
                        return new RegExp("^" + data[0].slice(1, data[0].length - 2), maybeFlag);
                    }
            }
            break;
    }
    return data;
}

function generate(data) {
    const symbols = data[0].map(r => r.rule);
    const regexps = {};
    const rules = data[0].map(r =>
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

    return {symbols, ignore: data[1], rules};
}

export const compile = core.parser(grammar, {actions, scan: scanner(grammar)});
