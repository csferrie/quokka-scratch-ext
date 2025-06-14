(function () {
    'use strict';
    console.log('✅ QASM Builder Extension loaded');

    class QasmBuilder {
        constructor() {
            this.lines = [];
            this.latestCounts = {};
            this._newResult = false;
            console.log('✅ QasmBuilder constructor initialized');
        }

        getInfo() {
            console.log('✅ QasmBuilder getInfo called');
            return {
                id: 'qasmBuilder',
                name: 'QASM Builder',
                blocks: [
                    { opcode: 'clearQasm', blockType: Scratch.BlockType.COMMAND, text: 'clear QASM' },
                    { opcode: 'addHeader', blockType: Scratch.BlockType.COMMAND, text: 'add OPENQASM header' },
                    { opcode: 'declareQreg', blockType: Scratch.BlockType.COMMAND, text: 'qreg [NAME] [SIZE]', arguments: { NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'q' }, SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'declareCreg', blockType: Scratch.BlockType.COMMAND, text: 'creg [NAME] [SIZE]', arguments: { NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'c' }, SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'hGate', blockType: Scratch.BlockType.COMMAND, text: 'H q [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'xGate', blockType: Scratch.BlockType.COMMAND, text: 'X q [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'cxGate', blockType: Scratch.BlockType.COMMAND, text: 'CX q [Q1] , q [Q2]', arguments: { Q1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, Q2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'ccxGate', blockType: Scratch.BlockType.COMMAND, text: 'CCX q [C1] , q [C2] , q [T]', arguments: { C1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, C2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }, T: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 } } },
                    { opcode: 'rxGate', blockType: Scratch.BlockType.COMMAND, text: 'RX ( [ANGLE] ) q [Q]', arguments: { ANGLE: { type: Scratch.ArgumentType.NUMBER, defaultValue: Math.PI }, Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'ryGate', blockType: Scratch.BlockType.COMMAND, text: 'RY ( [ANGLE] ) q [Q]', arguments: { ANGLE: { type: Scratch.ArgumentType.NUMBER, defaultValue: Math.PI }, Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'rzGate', blockType: Scratch.BlockType.COMMAND, text: 'RZ ( [ANGLE] ) q [Q]', arguments: { ANGLE: { type: Scratch.ArgumentType.NUMBER, defaultValue: Math.PI }, Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'measure', blockType: Scratch.BlockType.COMMAND, text: 'measure q [Q] -> c [C]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'getQasm', blockType: Scratch.BlockType.REPORTER, text: 'get QASM' },
                    { opcode: 'runQuantum', blockType: Scratch.BlockType.COMMAND, text: 'run QASM with [SHOTS] shots', arguments: { SHOTS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } } },
                    { opcode: 'whenResults', blockType: Scratch.BlockType.HAT, text: 'when quantum results received' },
                    { opcode: 'getCounts', blockType: Scratch.BlockType.REPORTER, text: 'get counts' }
                ]
            };
        }

        // QASM builder
        clearQasm() {
            this.lines = [];
        }
        addHeader() {
            this.lines.push('OPENQASM 2.0;');
            this.lines.push('include "qelib1.inc";');
        }
        declareQreg({ NAME, SIZE }) {
            this.lines.push(`qreg ${NAME}[${SIZE}];`);
        }
        declareCreg({ NAME, SIZE }) {
            this.lines.push(`creg ${NAME}[${SIZE}];`);
        }
        hGate({ Q }) { this.lines.push(`h q[${Q}];`); }
        xGate({ Q }) { this.lines.push(`x q[${Q}];`); }
        cxGate({ Q1, Q2 }) { this.lines.push(`cx q[${Q1}],q[${Q2}];`); }
        ccxGate({ C1, C2, T }) { this.lines.push(`ccx q[${C1}],q[${C2}],q[${T}];`); }
        rxGate({ ANGLE, Q }) { this.lines.push(`rx(${ANGLE}) q[${Q}];`); }
        ryGate({ ANGLE, Q }) { this.lines.push(`ry(${ANGLE}) q[${Q}];`); }
        rzGate({ ANGLE, Q }) { this.lines.push(`rz(${ANGLE}) q[${Q}];`); }
        measure({ Q, C }) { this.lines.push(`measure q[${Q}] -> c[${C}];`); }
        getQasm() {
            return this.lines.join('\n');
        }

        // Execution (sandboxed, no runtime.startHats)
        runQuantum({ SHOTS }) {
            const script = this.getQasm();
            console.log('⏳ Running QASM:\n' + script + `\nwith ${SHOTS} shots`);
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
                } else if (json.result && Array.isArray(json.result.c)) {
                    const counts = {};
                    json.result.c.forEach(bits => {
                        const key = bits.join('');
                        counts[key] = (counts[key] || 0) + 1;
                    });
                    this.latestCounts = counts;
                } else {
                    this.latestCounts = {};
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
    }

    // Register instance for sandboxed extension (no runtime)
    Scratch.extensions.register(new QasmBuilder());
})();
