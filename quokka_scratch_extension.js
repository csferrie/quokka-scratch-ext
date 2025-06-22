(function (Scratch) {
    'use strict';

    // ————————————————————————————
    // QASM Builder core (shared state)
    // ————————————————————————————
    class QasmBuilder {
        constructor() {
            this.lines          = [];
            this.latestCounts   = {};
            this.rawResults     = [];
            this.resultsReady   = false; // ← fires the hat block
        }

        // 1) script‑building helpers
        clearQasm()            { this.lines = []; }
        addHeader()            { this.lines.push('OPENQASM 2.0;', 'include "qelib1.inc";'); }
        declareQreg({ SIZE })  { this.lines.push(`qreg q[${SIZE}];`); }
        declareCreg({ SIZE })  { this.lines.push(`creg c[${SIZE}];`); }
        hGate({ Q })           { this.lines.push(`h q[${Q}];`); }
        xGate({ Q })           { this.lines.push(`x q[${Q}];`); }
        zGate({ Q })           { this.lines.push(`z q[${Q}];`); }
        sGate({ Q })           { this.lines.push(`s q[${Q}];`); }
        sdgGate({ Q })         { this.lines.push(`sdg q[${Q}];`); }
        tGate({ Q })           { this.lines.push(`t q[${Q}];`); }
        tdgGate({ Q })         { this.lines.push(`tdg q[${Q}];`); }
        ryGate({ ANGLE, Q })   { this.lines.push(`ry(${ANGLE}) q[${Q}];`); }
        swapGate({ Q1, Q2 })   { this.lines.push(`swap q[${Q1}],q[${Q2}];`); }
        cxGate({ Q1, Q2 })     { this.lines.push(`cx q[${Q1}],q[${Q2}];`); }
        ccxGate({ C1, C2, T }) { this.lines.push(`ccx q[${C1}],q[${C2}],q[${T}];`); }
        measureGate({ Q, C })  { this.lines.push(`measure q[${Q}] -> c[${C}];`); }

        // 2) run circuit on Quokka
        runQuantum({ SHOTS }) {
            const script = this.lines.join('\n');
            this.resultsReady = false; // reset before run
            return fetch('https://quokka3.quokkacomputing.com/qsim/qasm', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body    : JSON.stringify({ script, count: SHOTS })
            })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(json => {
                if (json.error_code !== 0) {
                    this.latestCounts = { error: json.error };
                    this.rawResults   = [];
                } else {
                    this.rawResults = json.result.c.map(bits => bits.join(''));
                    const counts = {};
                    this.rawResults.forEach(key => counts[key] = (counts[key] || 0) + 1);
                    this.latestCounts = counts;
                }
                this.resultsReady = true; // flag for hat
            })
            .catch(err => {
                this.latestCounts = { error: err.message };
                this.rawResults   = [];
                this.resultsReady = true; // still fire so UI can react
            });
        }

        // 3) state reporters
        clearResults() {
            this.latestCounts = {};
            this.rawResults   = [];
            this.resultsReady = false;
        }
        getQasm() { return this.lines.join('\n'); }

        getResults({ TYPE }) {
            const counts = this.latestCounts;
            const total  = Object.values(counts).reduce((a,b)=>a+b, 0) || 1;
            switch (TYPE) {
                case 'raw':        return JSON.stringify(this.rawResults);
                case 'summary':    return Object.entries(counts).map(([k,v]) => `${k}: ${v}`).join(', ');
                case 'percentage': return Object.entries(counts).map(([k,v]) => `${k}: ${((v/total)*100).toFixed(2)}%`).join(', ');
                case 'frequency':  return Object.entries(counts).map(([k,v]) => `${k}: ${(v/total).toFixed(4)}`).join(', ');
                default:           return JSON.stringify(counts);
            }
        }

        getOutcomeCount({ OUTCOME }) {
            return this.latestCounts[OUTCOME] || 0;
        }

        getProbability({ OUTCOME }) {
            const total = Object.values(this.latestCounts).reduce((a,b)=>a+b, 0) || 1;
            return (this.latestCounts[OUTCOME] || 0) / total;
        }
    }

    const builder = new QasmBuilder();

    // ————————————————————————————
    // 1) QASM Utilities (mid‑grey)
    // ————————————————————————————
    class QasmUtilities {
        getInfo() {
            return {
                id   : 'qasmUtilities',
                name : 'QASM Utilities',
                color1: '#A0A0A0', color2: '#808080',
                blocks: [
                    { opcode: 'clearQasm',   blockType: Scratch.BlockType.COMMAND, text: 'clear QASM' },
                    { opcode: 'addHeader',   blockType: Scratch.BlockType.COMMAND, text: 'add OPENQASM header' },
                    { opcode: 'declareQreg', blockType: Scratch.BlockType.COMMAND, text: 'qreg [SIZE]', arguments: {
                        SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                    }},
                    { opcode: 'declareCreg', blockType: Scratch.BlockType.COMMAND, text: 'creg [SIZE]', arguments: {
                        SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                    }},
                    { opcode: 'measureGate', blockType: Scratch.BlockType.COMMAND, text: 'measure qubit [Q] to bit [C]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'runQuantum',  blockType: Scratch.BlockType.COMMAND, text: 'run QASM with [SHOTS] shots', arguments: {
                        SHOTS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                    }},
                    { opcode: 'clearResults', blockType: Scratch.BlockType.COMMAND, text: 'clear results' },
                    { opcode: 'resultsReady', blockType: Scratch.BlockType.HAT,    text: 'when quantum results ready' }
                ]
            };
        }
        clearQasm(args)    { builder.clearQasm(args); }
        addHeader(args)    { builder.addHeader(args); }
        declareQreg(args)  { builder.declareQreg(args); }
        declareCreg(args)  { builder.declareCreg(args); }
        measureGate(args)  { builder.measureGate(args); }
        runQuantum(args)   { return builder.runQuantum(args); }
        clearResults()     { builder.clearResults(); }

        // Hat block fires once per result set
        resultsReady() {
            if (builder.resultsReady) {
                builder.resultsReady = false; // consume flag
                return true;
            }
            return false;
        }
    }

    // ————————————————————————————
    // 2) QASM Logic (dark grey)
    // ————————————————————————————
    class QasmLogic {
        getInfo() {
            return {
                id   : 'qasmLogic',
                name : 'QASM Logic',
                color1: '#616161', color2: '#424242',
                blocks: [
                    { opcode: 'xGate',   blockType: Scratch.BlockType.COMMAND, text: 'x on qubit [Q]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'zGate',   blockType: Scratch.BlockType.COMMAND, text: 'z on qubit [Q]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'hGate',   blockType: Scratch.BlockType.COMMAND, text: 'h on qubit [Q]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'sGate',   blockType: Scratch.BlockType.COMMAND, text: 's on qubit [Q]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'tGate',   blockType: Scratch.BlockType.COMMAND, text: 't on qubit [Q]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'sdgGate', blockType: Scratch.BlockType.COMMAND, text: 'sdg on qubit [Q]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'tdgGate', blockType: Scratch.BlockType.COMMAND, text: 'tdg on qubit [Q]', arguments: {
                        Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'ryGate',  blockType: Scratch.BlockType.COMMAND, text: 'ry ([ANGLE]) on qubit [Q]', arguments: {
                        ANGLE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        Q:     { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'ryDegGate', blockType: Scratch.BlockType.COMMAND, text: 'ry ° ([DEGREES]) on qubit [Q]', arguments: {
                        DEGREES: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        Q:       { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                    }},
                    { opcode: 'swapGate',  blockType: Scratch.BlockType.COMMAND, text: 'swap qubits [Q1] [Q2]', arguments: {
                        Q1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        Q2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                    }},
                    { opcode: 'cxGate',  blockType: Scratch.BlockType.COMMAND, text: 'cx control [Q1], target q [Q2]', arguments: {
                        Q1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        Q2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
                    }},
                    { opcode: 'ccxGate', blockType: Scratch.BlockType.COMMAND, text: 'ccx control1 [C1], control2 [C2], target [T]', arguments: {
                        C1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        C2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                        T:  { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 }
                    }}
                ]
            };
        }
        xGate(args)   { builder.xGate(args); }
        zGate(args)   { builder.zGate(args); }
        hGate(args)   { builder.hGate(args); }
        sGate(args)   { builder.sGate(args); }
        tGate(args)   { builder.tGate(args); }
        sdgGate(args) { builder.sdgGate(args); }
        tdgGate(args) { builder.tdgGate(args); }
        ryGate(args)  { builder.ryGate(args); }
        ryDegGate({ DEGREES, Q }) {
            const radians = DEGREES * (Math.PI / 180);
            builder.ryGate({ ANGLE: radians, Q });
        }
        swapGate(args){ builder.swapGate(args); }
        cxGate(args)  { builder.cxGate(args); }
        ccxGate(args) { builder.ccxGate(args); }
    }

    // ————————————————————————————
    // 3) QASM Results (yellow)
    // ————————————————————————————
    class QasmResults {
        getInfo() {
            return {
                id   : 'qasmResults',
                name : 'QASM Results',
                color1: '#F1C40F', color2: '#D4AC0D',
                blocks: [
                    { opcode: 'getQasm',      blockType: Scratch.BlockType.REPORTER, text: 'get QASM' },
                    { opcode: 'getResults',   blockType: Scratch.BlockType.REPORTER, text: 'get results [TYPE]', arguments: {
                        TYPE: { type: Scratch.ArgumentType.STRING, menu: 'RESULT_TYPE', defaultValue: 'raw' }
                    }},
                    { opcode: 'getOutcomeCount', blockType: Scratch.BlockType.REPORTER, text: 'get [OUTCOME] counts', arguments: {
                        OUTCOME: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
                    }},
                    { opcode: 'getProbability', blockType: Scratch.BlockType.REPORTER, text: 'get probability of [OUTCOME]', arguments: {
                        OUTCOME: { type: Scratch.ArgumentType.STRING, defaultValue: '' }
                    }}
                ],
                menus: {
                    RESULT_TYPE: ['raw', 'summary', 'percentage', 'frequency']
                }
            };
        }
        getQasm()            { return builder.getQasm(); }
        getResults(args)     { return builder.getResults(args); }
        getOutcomeCount(args){ return builder.getOutcomeCount(args); }
        getProbability(args) { return builder.getProbability(args); }
    }

    // Register all three
    Scratch.extensions.register(new QasmUtilities());
    Scratch.extensions.register(new QasmLogic());
    Scratch.extensions.register(new QasmResults());
})(window.Scratch);
