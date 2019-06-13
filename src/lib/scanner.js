
export class Token {
    constructor(type, text, loc) {
        this.type = type;
        this.text = text;
        this.loc  = loc;
    }

    concat(other) {
        this.text += other instanceof Token ? other.text : other;
    }
}

export function defaultScanner(str) {
    return {
        data: str.split("").map((text, loc) => new Token("char", text, loc))
    };
}
