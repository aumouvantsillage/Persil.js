
export const symbols = [
    /^[0-9]+/,
    "(",
    ")",
    /^[*/]/,
    /^[+-]/
];

export function scan(str) {
    const res = [];
    let loc = 0;
    while (loc < str.length) {
        const substr = str.slice(loc);

        // Attempt to match whitespace.
        let match = /^[ \r\n\t]+/.exec(substr);
        if (match) {
            loc += match[0].length;
            continue;
        }

        // Attempt to match each symbol.
        for (let i = 0; i < symbols.length && !match; i ++) {
            let sym = symbols[i];
            if (sym instanceof RegExp) {
                match = sym.exec(substr);
            }
            else if (substr.slice(0, sym.length) === sym) {
                match = [sym];
            }
        }

        // If no symbol matches the current input, return an error.
        if (!match) {
            return {
                error: true,
                loc: loc,
                expected: symbols
            };
        }

        // If a symbol matches the current input, add the matched text
        // to the result.
        res.push(match[0]);
        loc += match[0].length;
    }
    return res;
}
