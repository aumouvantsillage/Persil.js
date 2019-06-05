
import {Token, defaultScanner} from "./scanner";

export function parser(grammar, {start, actions, scan} = {}) {
    // Mark nullable rules if it has not already been done.
    if (!("nullable" in grammar)) {
        markNullableRules(grammar);
    }

    let rule = grammar.symbols.indexOf(start);
    if (rule < 0) {
        rule = 0;
    }

    return (str, options = {}) => parse(grammar, scan || defaultScanner, actions, rule, str, options);
}

class State {
    constructor(rule, production, dot = 0, origin = 0) {
        this.rule       = rule;
        this.production = production;
        this.dot        = dot;
        this.origin     = origin;
        this.nextState  = null;
    }

    equals(other) {
        return this.production === other.production &&
               this.dot        === other.dot        &&
               this.origin     === other.origin;
    }

    get isComplete() {
        return this.dot >= this.production.length;
    }

    get token() {
        return this.production[this.dot];
    }

    get next() {
        if (!this.nextState) {
            this.nextState = new State(this.rule, this.production, this.dot + 1, this.origin);
        }
        return this.nextState;
    }
}

function parse(grammar, scan, actions, rule, str, options) {
    const scanResult = scan(str);
    const tokens = scanResult.data.filter(t => t.type !== "ignore") || [];

    // Create the array for state sets
    const states = new Array(tokens.length);

    // This function adds states to the state set at the given index.
    function enqueue(index, sts) {
        if (!states[index]) {
            states[index] = [];
        }
        sts.forEach(s => {
            if (!states[index].some(q => s.equals(q))) {
                states[index].push(s);
            }
        });
    }

    // Create initial states for the productions of the rule to parse.
    enqueue(0, grammar.rules[rule].map(p => new State(rule, p)));

    // Process each element of the input string.
    // Execute one more iteration after the last element
    // to perform a final completion step.
    // Stop if there is no remaining state at the current index.
    let lastCompletedIndex = -1;
    let lastCompletedState;
    let tokenIndex;
    for (tokenIndex = 0; tokenIndex <= tokens.length && states[tokenIndex] && states[tokenIndex].length; tokenIndex ++) {
        // For each state at the current index.
        // We use an ordinary for loop since the loop body can
        // add new states to the current list.
        for (let st of states[tokenIndex]) {
            if (st.isComplete) {
                // Completion
                // ----------
                // Advance all states where the current token is a non-terminal
                // referencing the rule of the current state.
                enqueue(tokenIndex, states[st.origin].filter(s => s.token === st.rule).map(s => s.next));

                // If the current state completes the start rule, update the last completion index
                if (st.rule === rule && st.origin === 0) {
                    lastCompletedIndex = tokenIndex;
                    lastCompletedState = st;
                }
            }
            else if (st.token < grammar.rules.length) {
                // Prediction
                // ----------
                // For each production referenced by the NonTerminal,
                // create a new state at the beginning of that production.
                // Bypass nullable rules.
                enqueue(tokenIndex, grammar.rules[st.token].map(p => new State(st.token, p, 0, tokenIndex)));
                if (grammar.nullable[st.token]) {
                    enqueue(tokenIndex, [st.next]);
                }
            }
            else if (tokenIndex < tokens.length) {
                // Scanning
                // --------
                // If the current state accepts the current character,
                // create a new state at the next location in the input stream.
                const symbol = grammar.symbols[st.token];
                const sensitivity = grammar.sensitivity || "variant";
                if (symbol.test && symbol.test(tokens[tokenIndex].value) ||
                    symbol.ext && symbol.ext === tokens[tokenIndex].type ||
                    symbol.localeCompare && !symbol.localeCompare(tokens[tokenIndex].value, undefined, {sensitivity})) {
                    enqueue(tokenIndex + 1, [st.next]);
                }
            }
        }
    }

    // Collect the states at the last index that expected a token
    const failedStates = states[tokenIndex - 1].filter(s => !s.isComplete && s.token >= grammar.rules.length);

    // Errors from the scanner are reported in priority.
    if (scanResult.error) {
        return scanResult;
    }

    // If the scanner did not report any error, we can override the result object
    // with error data for this parser.
    return {
        scanResult,
        // Parsing fails if the main rule did not complete
        // or completed before the end of the token array.
        error: lastCompletedIndex < tokens.length - 1,
        // The expected tokens at the index where parsing stopped.
        expected: grammar.symbols.filter((sym, i) => failedStates.some(s => s.token === i)),
        // The location where the parser stopped.
        token: tokenIndex - 1 < tokens.length ? tokens[tokenIndex - 1] : {type: "EOF", value: null, loc: str.length},
        // The postprocessed data, if the main rule completed
        data: lastCompletedState ? postprocess(grammar, actions, states, tokens.map(t => t.value), lastCompletedIndex, lastCompletedState, options) : null,
        // The number of states created by the parser
        stateCount: states.reduce((prev, s) => prev + s.length, 0)
    };
}

/*
 * Mark nullable rules (Aycock and Horspool)
 *
 * This function can be called once for a given grammar.
 *
 * See explanations at http://loup-vaillant.fr/tutorials/earley-parsing/empty-rules
 * TODO Implement alternative from https://github.com/jeffreykegler/kollos/blob/master/notes/misc/loup2.md
 */
function markNullableRules(grammar) {
    // Initialize the set of nullable rules as the set of rules
    // that contain an empty production.
    grammar.nullable = grammar.rules.map(r => r.some(p => !p.length));

    // A rule is nullable if it has at least one production
    // containing only nullable non-terminals.
    let changed;
    do {
        changed = false;
        grammar.rules.forEach((r, index) => {
            if (!grammar.nullable[index] && r.some(p => p.every(s => s < grammar.nullable.length && grammar.nullable[s]))) {
                grammar.nullable[index] = changed = true;
            }
        });
    } while(changed);
}

function postprocess(grammar, actions, states, str, fromLoc, fromState, options) {
    const data = [];
    let loc = fromLoc, st = fromState;
    while (st.dot > 0) {
        const token = st.production[st.dot - 1];
        if (token < grammar.rules.length) {
            const children = states[loc].filter(s =>
                s.rule === token && s.isComplete &&
                states[s.origin].some(s => st.equals(s.next))
            );
            if (children.length) {
                data.unshift(postprocess(grammar, actions, states, str, loc, children[0], options));
                loc = children[0].origin;
            }
            else {
                data.unshift(null);
            }
        }
        else {
            data.unshift(str[--loc]);
        }
        st = states[loc].filter(s => st.equals(s.next))[0];
    }

    return actions ?
        actions(grammar, fromState.rule, grammar.rules[fromState.rule].indexOf(fromState.production), data, options) :
        data;
}

export function stringify(grammar) {
    // Mark nullable rules if it has not already been done.
    if (!("nullable" in grammar)) {
        markNullableRules(grammar);
    }

    const symbolsAsStrings = grammar.symbols.map(s =>
        s instanceof RegExp ? s.toString() : JSON.stringify(s)
    );

    const props = Object.keys(grammar).map(key => key + ":" +
        (key === "symbols" ? "[" + symbolsAsStrings.join(",") + "]" :
         JSON.stringify(grammar[key]))
    );
    return `module.exports = {${props.join(",")}};`;
}
