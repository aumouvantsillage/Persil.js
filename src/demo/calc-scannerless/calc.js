import * as persil from "../../..";

const START = 0;
const EXPR = 1;
const TERM = 2;
const PRIMARY = 3;
const INT = 4;
const _ = 5;

const SPACE = 6;
const DIGIT = 7;
const LPAR = 8;
const RPAR = 9;
const MOP = 10;
const AOP = 11;

const grammar = {
    symbols: [
        // Non-terminal
        "start", "expr", "term", "primary", "int", "whitespace",
        // Terminal
        /[ \r\n\t]/, /[0-9]/, "(", ")", /[*/]/, /[+-]/
    ],
    rules: [
        // START: _ EXPR _
        [
            [_, EXPR, _]
        ],
        // EXPR: TERM (_ [+-] _ EXPR)*
        [
            [EXPR, _, AOP, _, TERM],
            [TERM]
        ],
        // TERM: PRIMARY (_ [*/] _ TERM)*
        [
            [TERM, _, MOP, _, PRIMARY],
            [PRIMARY]
        ],
        // PRIMARY: INT | "(" START ")"
        [
            [INT],
            [LPAR, START, RPAR]
        ],
        // INT: [0-9]+
        [
            [INT, DIGIT],
            [DIGIT]
        ],
        // _: [ \r\n\t]*
        [
            [_, SPACE],
            []
        ]
    ]
};

export function actions(grammar, rule, production, data, options) {
    switch (grammar.symbols[rule]) {
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

const parseCalc = persil.parser(grammar, {actions});

if (module === require.main) {
    const src = "56 + 37*2 - (8/75 + 904)";
    const expr = parseCalc(src);

    if (expr.error) {
        process.stderr.write(persil.error(src, expr) + "\n");
        process.exit();
    }

    console.log(expr.data);
    console.log(`State count = ${expr.stateCount}`);
}
