import * as earley from "../lib/earley";

var _ = 0;
var INT = 1;
var PRIMARY = 2;
var TERM = 3;
var EXPR = 4;
var START = 5;

var SPACE = 6;
var DIGIT = 7;
var LPAR = 8;
var RPAR = 9;
var MOP = 10;
var AOP = 11;

var calc = {
    symbols: [
        // Non-terminal
        "_", "int", "primary", "term", "expr", "start",
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
    postprocess(rule, production, data, start, end) {
        switch (rule) {
            case INT:
                if (production === 0) {
                    return data[0] + data[1];
                }
                break;
            case PRIMARY:
                switch (production) {
                    case 0:
                        return parseInt(data);
                    case 1:
                        return data[1];
                }
                break;
            case TERM:
                if (production === 0) {
                    switch (data[2]) {
                        case "*":
                            return data[0] * data[4];
                        case "/":
                            return data[0] / data[4];
                    }
                }
                break;
            case EXPR:
                if (production === 0) {
                    switch (data[2]) {
                        case "+":
                            return data[0] + data[4];
                        case "-":
                            return data[0] - data[4];
                    }
                }
                break;
            case START:
                return data[1];
        }
        return data;
    }
};

var str = "56 + 37*2 - (8 /";//75 + 904 )";
var res = earley.parse(calc, START, str);

if (res.error) {
    console.log("Parse error at " + res.location);
    console.log(res.traces.map(t =>
        t.map(e => e.rule ? e.rule + ":" + e.loc : e.toString()).join(" > ")
    ).join("\n"));
} else {
    console.log(res.data);
}
