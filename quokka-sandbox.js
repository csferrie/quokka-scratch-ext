(function (Scratch) {
    'use strict';
    console.log('🛠️ QuokkaExtension (sandbox) starting…');

    class QuokkaExtension {
        constructor() {
            console.log('🛠️ QuokkaExtension constructor');
            this.latestCounts = {};
            this._newResult = false;
        }

        getInfo() {
            console.log('🛠️ getInfo called');
            return {
                id: 'quokka',
                name: 'Quokka QASM (sandbox)',
                blocks: [
                    {
                        opcode: 'runQuantum',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'run QASM [CODE] shots [SHOTS]',
                        arguments: {
                            CODE: { type: Scratch.ArgumentType.STRING, defaultValue: 'OPENQASM 2.0; include "qelib1.inc"; qreg q[1]; creg c[1]; h q[0]; measure q[0] -> c[0];' },
                            SHOTS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
                        }
                    },
                    {
                        opcode: 'whenResults',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when quantum results received'
                    },
                    {
                        opcode: 'getCounts',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'quokka counts'
                    }
                ]
            };
        }

        runQuantum(args) {
            console.log('🛠️ runQuantum with', args);
            // simulate result immediately so you can test
            this.latestCounts = { debug: 1 };
            this._newResult = true;
        }

        whenResults() {
            if (this._newResult) {
                this._newResult = false;
                console.log('🛠️ whenResults → true');
                return true;
            }
            return false;
        }

        getCounts() {
            console.log('🛠️ getCounts →', this.latestCounts);
            return JSON.stringify(this.latestCounts);
        }
    }

    // ———> **Sandboxed mode: register an instance** <———
    Scratch.extensions.register(new QuokkaExtension());

})(window.Scratch);
