(function (Scratch) {
    'use strict';
    console.log('✅ QASM Extension with Control & Inverse loaded');

    class QasmExtension {
        constructor() {
            this.lines = [];
        }

        getInfo() {
            return {
                id: 'qasmX',
                name: 'QASM Builder X',
                blocks: [
                    { opcode: 'clear', blockType: Scratch.BlockType.COMMAND, text: 'clear QASM' },
                    { opcode: 'addHeader', blockType: Scratch.BlockType.COMMAND, text: 'add OPENQASM header' },
                    { opcode: 'qreg', blockType: Scratch.BlockType.COMMAND, text: 'qreg [NAME] [SIZE]', arguments: { NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'q' }, SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'creg', blockType: Scratch.BlockType.COMMAND, text: 'creg [NAME] [SIZE]', arguments: { NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'c' }, SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'h', blockType: Scratch.BlockType.COMMAND, text: 'H q [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'x', blockType: Scratch.BlockType.COMMAND, text: 'X q [Q]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'cx', blockType: Scratch.BlockType.COMMAND, text: 'CX q [C] , q [T]', arguments: { C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, T: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } } },
                    { opcode: 'measure', blockType: Scratch.BlockType.COMMAND, text: 'measure q [Q] -> c [C]', arguments: { Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, C: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
                    { opcode: 'getQasm', blockType: Scratch.BlockType.REPORTER, text: 'get QASM' },
                    { opcode: 'controlQasm', blockType: Scratch.BlockType.REPORTER, text: 'control [CONTROLS] of [CODE]', arguments: { CONTROLS: { type: Scratch.ArgumentType.STRING, defaultValue: '0' }, CODE: { type: Scratch.ArgumentType.STRING, defaultValue: '' } } },
                    { opcode: 'inverseQasm', blockType: Scratch.BlockType.REPORTER, text: 'inverse of [CODE]', arguments: { CODE: { type: Scratch.ArgumentType.STRING, defaultValue: '' } } }
                ]
            };
        }

        clear() { this.lines = []; }
        addHeader() {
            this.lines.push('OPENQASM 2.0;');
            this.lines.push('include "qelib1.inc";');
        }
        qreg({ NAME, SIZE }) { this.lines.push(`qreg ${NAME}[${SIZE}];`); }
        creg({ NAME, SIZE }) { this.lines.push(`creg ${NAME}[${SIZE}];`); }
        h({ Q })   { this.lines.push(`h q[${Q}];`); }
        x({ Q })   { this.lines.push(`x q[${Q}];`); }
        cx({ C, T }) { this.lines.push(`cx q[${C}],q[${T}];`); }
        measure({ Q, C }) { this.lines.push(`measure q[${Q}] -> c[${C}];`); }
        getQasm() { return this.lines.join('\n'); }

        // Controlled QASM reporter
        controlQasm({ CONTROLS, CODE }) {
            const ctrls = CONTROLS.split(',')
                .map(s => parseInt(s.trim(),10))
                .filter(n => !isNaN(n));
            const lines = CODE.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
            const out = [];
            out.push(`// Start controlled on [${ctrls.join(',')}]`);
            for (const l of lines) {
                out.push(this._genControlledLine(ctrls, l));
            }
            out.push(`// End controlled`);
            return out.join('\n');
        }

        _genControlledLine(ctrls, line) {
            // parse "op args;"
            const m = /^([a-zA-Z]+)\s+(.*);$/.exec(line);
            if (!m) return `// cannot control: ${line}`;
            const op = m[1];
            const args = m[2].split(/[, ]+/).filter(Boolean);
            // single control only
            const c = ctrls[0];
            switch (op.toLowerCase()) {
                case 'x': return `cx q[${c}],${line}`;
                case 'y': return `cy q[${c}],${line}`;
                case 'z': return `cz q[${c}],${line}`;
                case 'h': {
                    const t = args[0];
                    return [
                        `sdg q[${t}]; cx q[${c}],q[${t}]; h q[${t}]; t q[${t}]; cx q[${c}],q[${t}]; t q[${t}]; h q[${t}]; s q[${t}];`
                    ].join('\n');
                }
                default:
                    return `// controlled-${op} not supported`;
            }
        }

        // Inverse QASM reporter
        inverseQasm({ CODE }) {
            const lines = CODE.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
            const inv = [];
            for (let i = lines.length-1; i>=0; i--) {
                inv.push(this._invertLine(lines[i]));
            }
            return inv.join('\n');
        }

        _invertLine(line) {
            const m = /^([a-zA-Z]+)(?:\(([^)]+)\))?\s+q\[(\d+)\];$/.exec(line);
            if (!m) return `// cannot invert: ${line}`;
            let [_, op, param, q] = m;
            const v = q;
            switch (op.toLowerCase()) {
                case 'h': case 'x': case 'y': case 'z': return `${op} q[${v}];`;
                case 's': return `sdg q[${v}];`;
                case 'sdg': return `s q[${v}];`;
                case 't': return `tdg q[${v}];`;
                case 'tdg': return `t q[${v}];`;
                case 'rx': return `rx(${-parseFloat(param)}) q[${v}];`;
                case 'ry': return `ry(${-parseFloat(param)}) q[${v}];`;
                case 'rz': return `rz(${-parseFloat(param)}) q[${v}];`;
                default: return `// inverse-${op} not supported: ${line}`;
            }
        }
    }

    Scratch.extensions.register(new QasmExtension());
})(window.Scratch);
