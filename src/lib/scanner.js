
export class Token {
    constructor(type, value, loc) {
        this.type  = type;
        this.value = value;
        this.loc   = loc;
    }
}

export function defaultScanner(str) {
    return {
        data: str.split("").map((value, loc) => new Token("char", value, loc))
    };
}
