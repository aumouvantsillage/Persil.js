
function scanError(src, obj) {
    return {
        loc:      location(src, obj.loc),
        expected: obj.expected.map(e => e instanceof RegExp ? e.toString() : JSON.stringify(e)).join(" | "),
        found:    JSON.stringify(src[obj.loc])
    };
}

function parseError(src, obj) {
    const found = [];
    if (obj.token.type) {
        found.push(obj.token.type);
    }
    if (obj.token.text !== null) {
        found.push(JSON.stringify(obj.token.text));
    }
    return {
        loc:      location(src, obj.token.loc),
        expected: obj.expected.map(e => e instanceof RegExp ? e.toString() : JSON.stringify(e)).join(" | "),
        found:    found.join(":")
    };
}

export function error(src, obj) {
    const {loc, expected, found} = obj.scanResult.error ? scanError(src, obj.scanResult) : parseError(src, obj);
    return `Syntax error at ${loc.line}:${loc.col}.\nExpected ${expected}\nFound ${found}.`;
}

function location(src, loc) {
    let line = 1;
    let col = 1;
    for (let i = 0; i < loc; i ++) {
        switch (src[i]) {
            case "\r":
                line ++;
                col = 1;
                if (src[i+1] === "\n") {
                    i ++;
                }
                break;
            case "\n":
                line ++;
                col = 1;
                if (src[i+1] === "\r") {
                    i ++;
                }
                break;
            default:
                col ++;
        }
    }
    return {line, col};
}
