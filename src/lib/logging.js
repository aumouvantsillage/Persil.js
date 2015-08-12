export function error(src, obj) {
    const loc = location(src, obj.loc);
    throw `Parse error at ${obj.loc}\n` + obj.traces.map(t =>
        t.map(e => e.symbol.toString() + ":" + loc.line + "," + loc.col).join(" > ")
    ).join("\n");
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
