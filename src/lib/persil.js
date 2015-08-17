const State = {
    create(rule, production, dot = 0, origin = 0) {
        const res = Object.create(this);
        res.rule = rule;
        res.production = production;
        res.dot = dot;
        res.origin = origin;
        res.nextState = null;
        return res;
    },

    isDuplicateOf(other) {
        return this.production === other.production &&
               this.dot === other.dot &&
               this.origin === other.origin;
    },

    get isComplete() {
        return this.dot >= this.production.length;
    },

    get token() {
        return this.production[this.dot];
    },

    get next() {
        return this.nextState ||
              (this.nextState = State.create(this.rule, this.production, this.dot + 1, this.origin));
    }
};

/*
 * Mark nullable rules (Aycock and Horspool)
 *
 * This function can be called once for a given grammar.
 *
 * See explanations at http://loup-vaillant.fr/tutorials/earley-parsing/empty-rules
 * TODO Implement alternative from https://github.com/jeffreykegler/kollos/blob/master/notes/misc/loup2.md
 */
export function markNullableRules(grammar) {
    // Initialize the set of nullable rules as the set of rules
    // that contain an empty production.
    grammar.nullable = grammar.rules.map(r => r.some(p => !p.length));

    // A rule is nullable if it has at least one production
    // containing only nullable non-terminals.
    let undecided;
    do {
        undecided = false;
        grammar.rules.forEach((r, index) => {
            if (!grammar.nullable[index] && r.some(p => p.every(s => s < grammar.nullable.length && grammar.nullable[s]))) {
                grammar.nullable[index] = undecided = true;
            }
        });
    } while(undecided);
}

export function parse(grammar, rule, str) {
    rule = grammar.symbols.indexOf(rule);

    // Mark nullable rules if it has not already been done.
    if (!("nullable" in grammar)) {
        markNullableRules(grammar);
    }

    // Create the array for state sets
    const states = new Array(str.length + 1);

    // This function adds states to the state set at the given location.
    function enqueue(loc, sts) {
        if (!states[loc]) {
            states[loc] = [];
        }
        sts.forEach(s => {
            if (!states[loc].some(q => s.isDuplicateOf(q))) {
                states[loc].push(s);
            }
        });
    }

    // Create initial states for the productions of the rule to parse.
    enqueue(0, grammar.rules[rule].map(p => State.create(rule, p)));

    // Process each element of the input string.
    // Execute one more iteration after the last element
    // to perform a final completion step.
    // Stop if there is no remaining state at the current location.
    let loc;
    for (loc = 0; loc <= str.length && states[loc] && states[loc].length; loc ++) {
        // For each state at the current location.
        // We use an ordinary for loop since the loop body can
        // add new states to the current list.
        for (let j = 0; j < states[loc].length; j++) {
            const st = states[loc][j];

            if (st.isComplete) {
                // Completion
                // ----------
                // Advance all states where the current token is a non-terminal
                // referencing the rule of the current state.
                enqueue(loc, states[st.origin].filter(s => s.token === st.rule).map(s => s.next));
            }
            else if (st.token < grammar.rules.length) {
                // Prediction
                // ----------
                // For each production referenced by the NonTerminal,
                // create a new state at the beginning of that production.
                // Bypass nullable rules.
                enqueue(loc, grammar.rules[st.token].map(p => State.create(st.token, p, 0, loc)));
                if (grammar.nullable[st.token]) {
                    enqueue(loc, [st.next]);
                }
            }
            else if (loc < str.length) {
                // Scanning
                // --------
                // If the current state accepts the current character,
                // create a new state at the next location in the input stream.
                const symbol = grammar.symbols[st.token];
                if (symbol === str[loc] || symbol.test && symbol.test(str[loc])) {
                    enqueue(loc + 1, [st.next]);
                }
            }
        }
    }

    const completeStates = states[loc - 1].filter(s => s.rule === rule && s.origin === 0 && s.isComplete);
    const failedStates   = states[loc - 1].filter(s => !s.isComplete && s.token >= grammar.rules.length);
    const error = loc <= str.length || !completeStates.length;
    const stateCount = states.reduce((prev, s) => prev + s.length, 0);

    return {
        error,
        stateCount,
        loc: loc - 1,
        traces: error ? makeTraces(grammar, states, failedStates, loc - 1) : undefined,
        data: error ? undefined : postprocess(grammar, states, str, loc - 1, completeStates[0])
    };
}

function postprocess(grammar, states, str, fromLoc, fromState) {
    const data = [];
    let loc = fromLoc, st = fromState;
    while (st.dot > 0) {
        const token = st.production[st.dot - 1];
        if (token < grammar.rules.length) {
            const children = states[loc].filter(s =>
                s.rule === token && s.isComplete &&
                states[s.origin].some(s => st.isDuplicateOf(s.next))
            );
            if (children.length) {
                data.unshift(postprocess(grammar, states, str, loc, children[0]));
                loc = children[0].origin;
            }
            else {
                data.unshift(null);
            }
        }
        else {
            data.unshift(str[--loc]);
        }
        st = states[loc].filter(s => st.isDuplicateOf(s.next))[0];
    }

    return grammar.postprocess ?
        grammar.postprocess(fromState.rule, grammar.rules[fromState.rule].indexOf(fromState.production), data, fromState.origin, fromLoc) :
        data;
}

function makeTraces(grammar, states, fromStates, loc) {
    return fromStates.reduce((traces, st) => {
        const node = {
            symbol: grammar.symbols[st.token],
            loc: loc
        };
        const callers = states[st.origin].filter(q => q.token === st.rule);
        const ts = callers.length ?
            makeTraces(grammar, states, callers, st.origin) :
            [[]];
        return traces.concat(
            ts.map(t => t.concat([node])).filter(t =>
                !traces.some(u =>
                    u.length === t.length &&
                    u.every((n, i) => n.symbol === t[i].symbol && n.loc === t[i].loc)
                )
            )
        );
    }, []);
}
