
export function scanner(grammar) {
    const symbols = grammar.symbols.slice(grammar.rules.length);
    return str => scan(symbols, grammar.ignore || [], str);
}

function search(symbols, str) {
    return symbols.reduce((prev, sym) => {
        const match = sym instanceof RegExp ? sym.exec(str) :
                      str.slice(0, sym.length) === sym ? [sym] :
                      null;
        return match && (!prev || match[0].length > prev.length) ? match[0] : prev;
    }, null);
}

function scan(symbols, ignore, str) {
    const tokens = [];
    let loc = 0;
    while (loc < str.length) {
        const substr = str.slice(loc);

        // Attempt to match ignorable text.
        let match = search(ignore, substr);
        if (match) {
            loc += match.length;
            continue;
        }

        // Attempt to match a symbol. Keep the longest match.
        match = search(symbols, substr);

        // If no symbol matches the current input, return an error.
        if (!match) {
            break;
        }

        // If a symbol matches the current input, add the matched text
        // to the result.
        tokens.push({value: match, loc});
        loc += match.length;
    }

    return {
        error: loc < str.length,
        loc,
        expected: symbols,
        data: tokens
    };
}
