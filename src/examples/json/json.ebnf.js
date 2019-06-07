import * as persil from "../../..";
import * as grammar from "./json.ebnf.grammar";
import * as terminals from "./json-terminals.ebnf.grammar";

const methods = {
    string_literal: {
        get result() {
            return JSON.parse(this.value.value);
        }
    },

    number_literal: {
        get result() {
            return JSON.parse(this.value.value);
        }
    },

    boolean_literal: {
        get result() {
            return this.value.value === "true";
        }
    },

    null_literal: {
        get result() {
            return null;
        }
    },

    array: {
        get result() {
            return this.elements.map(e => e.result);
        }
    },

    object: {
        get result() {
            let res = {};
            this.members.forEach(m => {
                res[JSON.parse(m.name.value)] = m.value.result;
            });
            return res;
        }
    }
};

const parseJson = persil.ast.parser(grammar, {methods, scan: persil.ast.scanner(terminals)});

function test(src) {
    const expr = parseJson(src);

    if (expr.error) {
        process.stderr.write(persil.error(src, expr) + "\n");
    }

    console.log(expr.scanResult.scanResult);
    console.log(expr.data.toString());
    console.log(expr.data.result);
}

test('"abc\\"d\\ua3b4e\\\\"');
test("0");
test("-204.31e56");
test("[1, 2, 3, 4]");
test(`{
    "origin": {"x": 5, "y": 12},
    "path": [{"dx": 10, "dy": 0}, {"dx": 0, "dy": 10}, {"dx": -10, "dy": 0}],
    "closed": true
}`);
