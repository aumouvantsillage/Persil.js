import * as core from "./core";
import {error} from "./logging";
import {scanner} from "./regexp-scanner";

const GRAMMAR = 0;
const RULE_LIST = 1;
const RULE = 2;
const CHOICE = 3;
const SEQUENCE = 4;
const TERM = 5;

const COLON = 6;
const PIPE = 7;
const PERCENT = 8;
const ID = 9;
const STRING = 10;
const RANGE = 11;

const grammar = {
    symbols: [
        // Non-terminal
        "grammar", "rule_list", "rule", "choice", "sequence", "term",

        // Terminal
        ":", "|", "%",
        {ext: "id"}, {ext: "string"}, {ext: "range"}
    ],
    rules: [
        // grammar: rule+
        [
            [RULE_LIST]
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
            [RANGE]
        ]
    ]
};

const terminals = {
    delim: /^[:|.%]/,
    id: /^[a-zA-Z0-9_]+/,
    string: /^"([^"\\]|\\.)+"/,
    range: [/^\[([^\]\\]|\\.)+\]/, "."],
    ignore: [/^[ \r\n\t]+/]
};

function actions(grammar, rule, production, data, options) {
    switch (rule) {
        case GRAMMAR:
            return generate(data, options);

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
                case 0: return {id: data[0]};
                case 1: return JSON.parse(data[0]);
                case 2: return new RegExp("^" + data[0]);
            }
            break;

    }
    return data;
}

function generate(data, options) {
    const symbols = data[0].map(r => r.rule);
    const ruleCount = data[0].length;
    const regexps = {};
    const external = {};
    const rules = data[0].map(r =>
        r.productions.map(p =>
            p.map(t => {
                let i;
                if (typeof t === "string") {
                    i = symbols.slice(ruleCount).indexOf(t);
                    if (i >= 0) {
                        i += ruleCount;
                    }
                }
                else if (t.id) {
                    if (t.id in external) {
                        i = external[t.id];
                    }
                    else {
                        i = symbols.indexOf(t.id);
                    }
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
                else if (t.id) {
                    external[t.id] = symbols.length;
                    symbols.push({ext: t.id});
                    return symbols.length - 1;
                }
                else {
                    symbols.push(t);
                    return symbols.length - 1;
                }
            })
        )
    );

    return {symbols, rules, sensitivity: options.sensitivity};
}

export const compile = core.parser(grammar, {actions, scan: scanner(terminals)});
