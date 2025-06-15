(function (Scratch) {
    'use strict';
    console.log('✅ QASM Builder Extension (sandbox) with Inverse loaded');

    class QasmBuilder {
        constructor() {
            console.log('✅ QasmBuilder constructor');
            this.lines = [];
            this.latestCounts = {};
            this._newResult = false;
        }

        getInfo() {
            console.log('✅ QasmBuilder getInfo');
            return {
                id: 'qasmBuilder',
                name: 'QASM Builder',
                blocks: [
                    { opcode: 'clearQasm',   blockType: Scratch.BlockType.COMMAND,  text: 'clear QASM' },
                    { opcode: 'addHeader',    blockType: Scratch.BlockType.COMMAND,  text: 'add OPENQASM header' },
                    { opcode: 'declareQreg',  blockType: Scratch.BlockType.COMMAND,  text: 'qreg [SIZE]', arguments: { SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'declareCreg',  blockType: Scratch.BlockType.COMMAND,  text: 'creg [SIZE]', arguments: { SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'hGate',        blockType: Scratch.BlockType.COMMAND,  text: 'h on qubit [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'xGate',        blockType: Scratch.BlockType.COMMAND,  text: 'x on qubit [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'zGate',        blockType: Scratch.BlockType.COMMAND,  text: 'z on qubit [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'cxGate',       blockType: Scratch.BlockType.COMMAND,  text: 'cx control [Q1], target q [Q2]', arguments: { Q1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, Q2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'ccxGate',      blockType: Scratch.BlockType.COMMAND,  text: 'ccx c1 [C1], c2 [C2], tgt [T]', arguments: { C1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, C2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }, T: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 } } },
                    { opcode: 'ryGate',       blockType: Scratch.BlockType.COMMAND,  text: 'ry ([ANGLE]) on qubit [Q]', arguments: { ANGLE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'sGate',        blockType: Scratch.BlockType.COMMAND,  text: 's on qubit [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'sdgGate',      blockType: Scratch.BlockType.COMMAND,  text: 'sdg on qubit [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'tGate',        blockType: Scratch.BlockType.COMMAND,  text: 't on qubit [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'tdgGate',      blockType: Scratch.BlockType.COMMAND,  text: 'tdg on qubit [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'measureGate',  blockType: Scratch.BlockType.COMMAND,  text: 'measure qubit [Q] to bit [C]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'inverse', blockType: Scratch.BlockType.LOOP, text: 'inverse', arguments: { SUBSTACK: { type: Scratch.ArgumentType.SUBSTACK } } },
                    { opcode: 'getQasm',      blockType: Scratch.BlockType.REPORTER, text: 'get QASM' },
                    { opcode: 'runQuantum',   blockType: Scratch.BlockType.COMMAND,  text: 'run QASM with [SHOTS] shots', arguments: { SHOTS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } } },
                    { opcode: 'whenResults',  blockType: Scratch.BlockType.HAT,      text: 'when quantum results received' },
                    { opcode: 'getCounts',    blockType: Scratch.BlockType.REPORTER, text: 'get counts' }
                ]
            };
        }

        // QASM builder methods
        clearQasm() { this.lines = []; }
        addHeader() { this.lines.push('OPENQASM 2.0;','include "qelib1.inc";'); }
        declareQreg({ SIZE }) { this.lines.push(`qreg q[${SIZE}];`); }
        declareCreg({ SIZE }) { this.lines.push(`creg c[${SIZE}];`); }
        hGate({ Q }) { this.lines.push(`h q[${Q}];`); }
        xGate({ Q }) { this.lines.push(`x q[${Q}];`); }
        zGate({ Q }) { this.lines.push(`z q[${Q}];`); }
        cxGate({ Q1, Q2 }) { this.lines.push(`cx q[${Q1}],q[${Q2}];`); }
        ccxGate({ C1, C2, T }) { this.lines.push(`ccx q[${C1}],q[${C2}],q[${T}];`); }
        ryGate({ ANGLE, Q }) { this.lines.push(`ry(${ANGLE}) q[${Q}];`); }
        sGate({ Q }) { this.lines.push(`s q[${Q}];`); }
        sdgGate({ Q }) { this.lines.push(`sdg q[${Q}];`); }
        tGate({ Q }) { this.lines.push(`t q[${Q}];`); }
        tdgGate({ Q }) { this.lines.push(`tdg q[${Q}];`); }
        measureGate({ Q, C }) { this.lines.push(`measure q[${Q}] -> c[${C}];`); }

        // Inverse container: run nested branches then invert
        inverse(args, util) {
            // two-phase loop: first run nested blocks, then invert
            if (util.stackFrame._invertPhase === undefined) {
                util.stackFrame._invertPhase = 0;
                util.stackFrame._startIndex = this.lines.length;
            }
            if (util.stackFrame._invertPhase === 0) {
                util.stackFrame._invertPhase = 1;
                return true;  // run substack once
            }
            // second phase: invert the segment
            const start = util.stackFrame._startIndex;
            const segment = this.lines.slice(start);
            // remove original commands
            this.lines.splice(start, segment.length);
            // append inverted commands
            for (let i = segment.length - 1; i >= 0; i--) {
                this.lines.push(this._invertLine(segment[i]));
            }
            // cleanup
            delete util.stackFrame._invertPhase;
            delete util.stackFrame._startIndex;
            return false;
        }
        // Inversion logic Execution methods
        runQuantum({ SHOTS }) {
            const script = this.lines.join('\n');
            fetch('https://quokka2.quokkacomputing.com/qsim/qasm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script, count: SHOTS })
            })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(json => {
                if (json.error_code !== 0) {
                    console.error('❌ Quokka error:', json.error);
                    this.latestCounts = { error: json.error };
                } else {
                    const counts = {};
                    json.result.c.forEach(bits => {
                        const key = bits.join('');
                        counts[key] = (counts[key]||0) + 1;
                    });
                    this.latestCounts = counts;
                }
                this._newResult = true;
            })
            .catch(err => {
                console.error('❌ QASM run failed:', err);
                this.latestCounts = { error: err.message };
                this._newResult = true;
            });
        }

        whenResults() {
            if (this._newResult) {
                this._newResult = false;
                return true;
            }
            return false;
        }

        getCounts() {
            return JSON.stringify(this.latestCounts);
        }

        getQasm() {
            return this.lines.join('\n');
        }
    }

    Scratch.extensions.register(new QasmBuilder());
})(window.Scratch);
