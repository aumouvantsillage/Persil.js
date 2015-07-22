class State {
    constructor(rule, production, previous = null, dot = 0, origin = 0) {
        this.rule = rule;
        this.production = production;
        this.previous = previous;
        this.dot = dot;
        this.origin = origin;
        this.nextState = null;
    }

    isDuplicateOf(other) {
        return this.production === other.production &&
               this.previous === other.previous &&
               this.dot === other.dot &&
               this.origin === other.origin;
    }

    get isComplete() {
        return this.dot >= this.production.length;
    }

    get token() {
        return this.production[this.dot];
    }

    get next() {
        return this.nextState ||
              (this.nextState = new State(this.rule, this.production, this, this.dot + 1, this.origin));
    }

    get first() {
        return this.dot ? this.previous.first : this;
    }
}

export function parse(grammar, rule, str) {
    var states = new Array(str.length + 1);

    // Add states for the given location.
    // Do not add duplicates.
    function enqueue(col, arr) {
        if (!states[col]) {
            states[col] = [];
        }
        arr.forEach(s => {
            if (!states[col].some(q => s.isDuplicateOf(q))) {
                states[col].push(s);
            }
        });
    }

    // Create initial states for the productions of the rule to parse.
    enqueue(0, grammar.rules[rule].map(p => new State(rule, p)));

    // Process each element of the input string.
    // Execute one more iteration after the last element
    // to perform a final completion step.
    // Stop if there is no remaining state at the current location.
    for (var col = 0; col <= str.length && states[col] && states[col].length; col++) {
        // For each state at the current location.
        // We use an ordinary for loop since the loop body can
        // add new states to the current list.
        for (var j = 0; j < states[col].length; j++) {
            var st = states[col][j];

            if (st.isComplete) {
                // Completion
                // ----------
                // Advance all states where the current token is a non-terminal
                // referencing the rule of the current state.
                enqueue(col, states[st.origin].filter(s => s.token === st.rule).map(s => s.next));
            } else if (st.token < grammar.rules.length) {
                // Prediction
                // ----------
                // For each production referenced by the NonTerminal,
                // create a new state at the beginning of that production.
                enqueue(col, grammar.rules[st.token].map(p => new State(st.token, p, st, 0, col)));
            } else if (col < str.length) {
                // Scanning
                // --------
                // If the current state accepts the current character,
                // create a new state at the next location in the input stream.
                var symbol = grammar.symbols[st.token];
                if (symbol === str[col] || symbol.test && symbol.test(str[col])) {
                    enqueue(col + 1, [st.next]);
                }
            }
        }
    }

    var completeStates = states[col - 1].filter(s => s.rule === rule && s.origin === 0 && s.isComplete);
    var error = col <= str.length || !completeStates.length;

    return {
        error,
        location: col - 1,
        traces: error ? makeTraces(grammar, states, col - 1) : undefined,
        data: error ? undefined : postprocess(grammar, states, str, col - 1, completeStates[0])
    };
}

function postprocess(grammar, states, str, fromCol, fromState) {
    var data = [];

    for (var col = fromCol, st = fromState; st.dot > 0; st = st.previous) {
        var token = st.production[st.dot - 1];
        if (token < grammar.rules.length) {
            var child = states[col].filter(s =>
                s.rule === token && s.isComplete && states[s.origin].indexOf(st.previous) >= 0
            )[0];
            data.unshift(postprocess(grammar, states, str, col, child));
            col = child.origin;
        } else {
            data.unshift(str[--col]);
        }
    }

    if (data.length === 1) {
        data = data[0];
    }
    if (grammar.postprocess) {
        data = grammar.postprocess(fromState.rule, grammar.rules[fromState.rule].indexOf(fromState.production), data, fromState.origin, fromCol);
    }
    return data;
}

function makeTraces(grammar, states, col) {
    var traces = [];
    states[col]
        .filter(s => !s.isComplete && s.token >= grammar.rules.length)
        .forEach(s => {
            var path = [grammar.symbols[s.token]];
            for (var q = s; q; q = q.first.previous) {
                var sym = { rule: grammar.symbols[q.rule], loc: q.origin };
                if (sym !== path[0]) {
                    path.unshift(sym);
                }
            }
            if (!traces.some(p => p.length === path.length &&
                                  p.every((e, i) => e === path[i] ||
                                                    e.rule && e.rule === path[i].rule &&
                                                    e.loc === path[i].loc))) {
                traces.push(path);
            }
        });
    return traces.sort((a, b) => a.length - b.length);
}
