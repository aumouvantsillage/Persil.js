
export class Token {
    constructor(value, loc) {
        this.value = value;
        this.loc = loc;
    }
}

export function defaultScanner(str) {
    return {
        data: str.split("").map((value, loc) => new Token(value, loc))
    };
}
