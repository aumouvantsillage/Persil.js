export function error(src, obj) {
    const loc = location(src, obj.loc);
    const expected = obj.expected.map(e => e instanceof RegExp ? e.toString() : JSON.stringify(e)).join(" | ");
    const found = JSON.stringify(src[obj.loc]);
    throw `Parse error at ${loc.line}:${loc.col}.\nExpected ${expected}\nFound ${found}.`;
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
