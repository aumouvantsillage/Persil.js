
export function postprocess(rule, production, data, start, end) {
    switch (this.symbols[rule]) {
        case "grammar":
            return {
                type: "grammar",
                rules: data[1]
            };

        case "rules":
            if (production === 0) {
                return [data[0]].concat(data[2]);
            }
            break;

        case "rule":
            return {
                type: "rule",
                name: data[0],
                definition: data[4]
            };

        case "choice":
            switch (production) {
                case 0: data[4].elements.unshift(data[0]); return data[4];
                case 1: return {type: "choice", elements: data};
            }
            break;

        case "sequence":
            switch (production) {
                case 0: data[2].elements.unshift(data[0]); return data[2];
                case 1: return {type: "sequence", elements: data};
            }
            break;

        case "term":
            return {
                type: "term",
                variable: data[0] && data[0].variable,
                operator: data[0] && data[0].operator,
                value: data[2],
                multiplicity: data[4]
            };

        case "target":
            if (production === 0) {
                return {
                    variable: data[0],
                    operator: data[2]
                };
            }
            break;

        case "primary":
            if (production === 3) {
                return data[1];
            }
            return data[0];

        case "id":
            switch (production) {
                case 0: data[1].text = data[0] + data[1].text; return data[1];
                case 1: return {type: "id", text: data[0]};
            }
            break;

        case "string":
            return {
                type: "string",
                text: `"${data[1]}"`,
                content: data[1]
            };

        case "ranges":
            switch (production) {
                case 0: data[1].elements.unshift(data[0]); return data[1];
                case 1: return {type: "ranges", elements: data};
            }
            break;

        case "range":
            return {
                type: "range",
                text: data.join("")
            };

        case "assignment_operator":
        case "multiplicity":
        case "string_content":
        case "string_char":
        case "range_content":
        case "range_char":
            return data.join("");

        case "__": break;
        case "_": break;
        case "comment": break;
        case "single_line_comment_content": break;
        case "multiline_comment_content": break;
    }
    return data;
}
