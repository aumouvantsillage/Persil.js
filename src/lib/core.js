
import {Token, defaultScanner} from "./scanner";

/** Create a new parser for a given grammar.
 *
 * \param grammar The grammar definition.
 * \param start   The name of the rule where to start (defaults to the first rule).
 * \param scan    A function to use as a scanner (defaults to a character scanner).
 * \param actions A function to execute in the postprocessing stage (optional).
 * \return A function that can parse a string with the given grammar.
 */
export function parser(grammar, {start, scan, actions} = {}) {
    // Mark nullable rules if it has not already been done.
    markNullableRules(grammar);

    // Find the grammar rule for the start symbol.
    // Use the first rule if no start symbol is provided.
    let rule = grammar.symbols.indexOf(start);
    if (rule < 0) {
        rule = 0;
    }

    // Return a function that parses a string with the given grammar.
    return (str, options = {}) => parse(grammar, rule, scan || defaultScanner, actions, options, str);
}

/// This class defines a state in the Earley parsing process.
class State {
    /** Create a new state.
     *
     * \param rule       The index of the current grammar rule.
     * \param production The index of the production in the current rule.
     * \param dot        The current location in the production.
     * \param origin     The token index corresponding to the beginning of the current rule.
     */
    constructor(rule, production, dot = 0, origin = 0) {
        this.rule       = rule;
        this.production = production;
        this.dot        = dot;
        this.origin     = origin;
        this.nextState  = null;
    }

    /** Compare this state to another.
     *
     * \param other The state to compare.
     * \return true if the current state is identical to the given state.
     */
    equals(other) {
        return this.rule       === other.rule       &&
               this.production === other.production &&
               this.dot        === other.dot        &&
               this.origin     === other.origin;
    }

    /** The completion status of the current state.
     *
     * \return true if the current state is past the end of its production.
     */
    get isComplete() {
        return this.dot >= this.production.length;
    }

    /// The symbol after the current location in the production.
    get symbol() {
        return this.production[this.dot];
    }

    /** Create a new state after the current state.
     *
     * \return A new state, or a reference to the already created next state.
     */
    get next() {
        if (!this.nextState) {
            this.nextState = new State(this.rule, this.production, this.dot + 1, this.origin);
        }
        return this.nextState;
    }
}

/** The Earley parsing algorithm.
 *
 * \param grammar The grammar to use.
 * \param rule    The index of the start rule.
 * \param scan    A function that converts the given string to an array of tokens.
 * \param actions A function to process the parsing result (optional).
 * \param options Options to pass to the actions function.
 * \param str     The string to parse.
 */
function parse(grammar, rule, scan, actions, options, str) {
    // Convert the string into a sequence of tokens.
    const scanResult = scan(str);
    const tokens = scanResult.data.filter(t => t.type !== "ignore") || [];

    // Create the initial array for state sets.
    const states = new Array(tokens.length);

    // Add states to the state set at the given index.
    function enqueue(index, sts) {
        if (!states[index]) {
            states[index] = [];
        }
        for (let s of sts) {
            if (!states[index].some(q => q.equals(s))) {
                states[index].push(s);
            }
        }
    }

    // Create initial states for the productions of the starting rule.
    enqueue(0, grammar.rules[rule].map(p => new State(rule, p)));

    // Process each token.
    // Execute one more iteration after the last element to perform a final completion step.
    // Stop if there is no remaining state at the current index.
    let lastCompletedIndex = -1;
    let lastCompletedState;
    let tokenIndex;
    for (tokenIndex = 0; tokenIndex <= tokens.length && states[tokenIndex] && states[tokenIndex].length; tokenIndex ++) {
        // For each state at the current token index.
        for (let st of states[tokenIndex]) {
            if (st.isComplete) {
                // Completion
                // ----------
                // Advance all states where the current expected symbol is a non-terminal
                // referencing the rule of the current state.
                enqueue(tokenIndex, states[st.origin].filter(s => s.symbol === st.rule).map(s => s.next));

                // If the current state completes the start rule, update the last completion index
                if (st.rule === rule && st.origin === 0) {
                    lastCompletedIndex = tokenIndex;
                    lastCompletedState = st;
                }
            }
            else if (st.symbol < grammar.rules.length) {
                // Prediction
                // ----------
                // For each production referenced by the current non-terminal symbol,
                // create a new state at the beginning of that production.
                // Bypass nullable rules.
                enqueue(tokenIndex, grammar.rules[st.symbol].map(p => new State(st.symbol, p, 0, tokenIndex)));
                if (grammar.nullable[st.symbol]) {
                    enqueue(tokenIndex, [st.next]);
                }
            }
            else if (tokenIndex < tokens.length) {
                // Scanning
                // --------
                // If the current state accepts the current terminal symbol,
                // create a new state at the next location in the input stream.
                const symbol = grammar.symbols[st.symbol];
                const sensitivity = grammar.sensitivity || "variant";
                if (symbol.test && symbol.test(tokens[tokenIndex].value) ||
                    symbol.ext && symbol.ext === tokens[tokenIndex].type ||
                    symbol.localeCompare && !symbol.localeCompare(tokens[tokenIndex].value, undefined, {sensitivity})) {
                    enqueue(tokenIndex + 1, [st.next]);
                }
            }
        }
    }

    // Move to the index of the last processed token.
    tokenIndex --;

    // Collect the states at the last index that expected a terminal symbol.
    const failedStates = states[tokenIndex].filter(s => !s.isComplete && s.symbol >= grammar.rules.length);

    return {
        scanResult,
        // Parsing fails if the main rule did not complete
        // or completed before the end of the token array.
        error: scanResult.error || lastCompletedIndex < tokens.length - 1,
        // The expected symbols at the index where parsing stopped.
        expected: grammar.symbols.filter((sym, i) => failedStates.some(s => s.symbol === i)),
        // The location where the parser stopped.
        token: tokens[tokenIndex],
        // The postprocessed data, if the main rule completed
        data: lastCompletedState ? postprocess(grammar, actions, options, states, tokens, lastCompletedIndex, lastCompletedState) : null,
        // The number of states created by the parser
        stateCount: states.reduce((prev, s) => prev + s.length, 0)
    };
}

/** Mark nullable rules (Aycock and Horspool)
 *
 * This function will be executed only once for a given grammar.
 *
 * See explanations at http://loup-vaillant.fr/tutorials/earley-parsing/empty-rules
 * TODO Implement alternative from https://github.com/jeffreykegler/kollos/blob/master/notes/misc/loup2.md
 */
function markNullableRules(grammar) {
    if ("nullable" in grammar) {
        return;
    }

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

/** Generate a parsing result based on the Earley state sets.
 *
 * \param grammar   The grammar used for parsing.
 * \param actions   The function to execute on the parse tree.
 * \param options   Options to pass to the actions function.
 * \param states    The state sets generated by the parsing algorithm.
 * \param tokens    The sequence of tokens from the scanner.
 * \param fromLoc   The index after the last token used in the completed state.
 * \param fromState The last completed state.
 * \return The result of the actions function if provided, or a parse tree.
 */
function postprocess(grammar, actions, options, states, tokens, fromLoc, fromState) {
    const tree = [];
    let loc = fromLoc, st = fromState;
    while (st.dot > 0) {
        // Get the expected symbol at the current state.
        const symbol = st.production[st.dot - 1];

        // If the symbol is a non-terminal, process it recursively,
        // else, add it to the current parse tree.
        if (symbol < grammar.rules.length) {
            // In the current location, find a completed state s for the
            // the non-terminal, such that there are states at the origin of s
            // leading to the current state st.
            const child = states[loc].find(s =>
                s.rule === symbol && s.isComplete &&
                states[s.origin].some(q => q.next.equals(st))
            );
            // If a child state exists, postprocess it recursively,
            // prepend the result to the parse tree and move back to the
            // origin of the child state.
            if (child) {
                tree.unshift(postprocess(grammar, actions, options, states, tokens, loc, child));
                loc = child.origin;
            }
            else {
                tree.unshift(null);
            }
        }
        else {
            // Tokens are added to the parse tree from the end to the beginning.
            tree.unshift(tokens[--loc]);
        }

        // Move the current state to one of its predecessors at the new location.
        st = states[loc].find(s => s.next.equals(st));
    }

    // If applicable, run the actions on the parse tree.
    return actions ?
        actions(grammar, fromState.rule, grammar.rules[fromState.rule].indexOf(fromState.production), tree, options) :
        tree;
}

export function stringify(grammar) {
    // Mark nullable rules if it has not already been done.
    markNullableRules(grammar);

    const symbolsAsStrings = grammar.symbols.map(s =>
        s instanceof RegExp ? s.toString() : JSON.stringify(s)
    );

    const props = Object.keys(grammar).map(key => key + ":" +
        (key === "symbols" ? "[" + symbolsAsStrings.join(",") + "]" :
         JSON.stringify(grammar[key]))
    );
    return `module.exports = {${props.join(",")}};`;
}
