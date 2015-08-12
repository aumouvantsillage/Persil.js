let State = {
    create(rule, production, dot = 0, origin = 0) {
        let res = Object.create(this);
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

export function parse(grammar, rule, str) {
    rule = grammar.symbols.indexOf(rule);

    let states = new Array(str.length + 1);

    // Add states for the given location.
    // Do not add duplicates.
    function enqueue(loc, arr) {
        if (!states[loc]) {
            states[loc] = [];
        }
        arr.forEach(s => {
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
            let st = states[loc][j];

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
                // Bypass empty productions.
                enqueue(loc, grammar.rules[st.token].map(p =>
                    p.length ? State.create(st.token, p, 0, loc) : st.next)
                );
            }
            else if (loc < str.length) {
                // Scanning
                // --------
                // If the current state accepts the current character,
                // create a new state at the next location in the input stream.
                let symbol = grammar.symbols[st.token];
                if (symbol === str[loc] || symbol.test && symbol.test(str[loc])) {
                    enqueue(loc + 1, [st.next]);
                }
            }
        }
    }

    let completeStates = states[loc - 1].filter(s => s.rule === rule && s.origin === 0 && s.isComplete);
    let failedStates   = states[loc - 1].filter(s => !s.isComplete && s.token >= grammar.rules.length);
    let error = loc <= str.length || !completeStates.length;

    return {
        error,
        loc: loc - 1,
        traces: error ? makeTraces(grammar, states, failedStates, loc - 1) : undefined,
        data: error ? undefined : postprocess(grammar, states, str, loc - 1, completeStates[0])
    };
}

function postprocess(grammar, states, str, fromLoc, fromState) {
    let data = [];
    let loc = fromLoc, st = fromState;
    while (st.dot > 0) {
        let token = st.production[st.dot - 1];
        if (token < grammar.rules.length) {
            let children = states[loc].filter(s =>
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

    if (grammar.postprocess) {
        data = grammar.postprocess(fromState.rule, grammar.rules[fromState.rule].indexOf(fromState.production), data, fromState.origin, fromLoc);
    }
    return data;
}

function makeTraces(grammar, states, fromStates, loc) {
    return fromStates.reduce((traces, st) => {
        let node = {
            symbol: grammar.symbols[st.token],
            loc: loc
        };
        let callers = states[st.origin].filter(q => q.token === st.rule);
        let ts = callers.length ?
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
