import * as persil from "../lib/persil";
import {error} from "../lib/logging";

const _ = 0;
const INT = 1;
const PRIMARY = 2;
const TERM = 3;
const EXPR = 4;
const START = 5;

const SPACE = 6;
const DIGIT = 7;
const LPAR = 8;
const RPAR = 9;
const MOP = 10;
const AOP = 11;

const calcGrammar = {
    symbols: [
        // Non-terminal
        "whitespace", "int", "primary", "term", "expr", "start",
        // Terminal
        /[ \r\n\t]/, /[0-9]/, "(", ")", /[*/]/, /[+-]/
    ],
    rules: [
        // _: [ \r\n\t]*
        [
            [SPACE, _],
            []
        ],
        // INT: [0-9]+
        [
            [DIGIT, INT],
            [DIGIT]
        ],
        // PRIMARY: INT | "(" START ")"
        [
            [INT],
            [LPAR, START, RPAR]
        ],
        // TERM: PRIMARY (_ [*/] _ TERM)*
        [
            [PRIMARY, _, MOP, _, TERM],
            [PRIMARY]
        ],
        // EXPR: TERM (_ [+-] _ EXPR)*
        [
            [TERM, _, AOP, _, EXPR],
            [TERM]
        ],
        // START: _ EXPR _
        [
            [_, EXPR, _]
        ]
    ],
    postprocess
};

export function postprocess(rule, production, data, start, end) {
    switch (this.symbols[rule]) {
        case "int":
            if (production === 0) {
                return data[0] + data[1];
            }
            break;
        case "primary":
            switch (production) {
                case 0:
                    return parseInt(data[0]);
                case 1:
                    return data[1];
            }
            break;
        case "term":
            if (production === 0) {
                switch (data[2]) {
                    case "*":
                        return data[0] * data[4];
                    case "/":
                        return data[0] / data[4];
                }
            }
            break;
        case "expr":
            if (production === 0) {
                switch (data[2]) {
                    case "+":
                        return data[0] + data[4];
                    case "-":
                        return data[0] - data[4];
                }
            }
            break;
        case "start":
            return data[1];
    }
    return data[0];
}

if (module === require.main) {
    const exprSrc = "56 + 37*2 - (8 /75 + 904 )";
    const expr = persil.parse(calcGrammar, "start", exprSrc);

    if (expr.error) {
        error(exprSrc, expr);
    }

    console.log(expr.data);
}
