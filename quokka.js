(function () {
    'use strict';
    console.log('✅ Quokka Extension loaded');

    class QuokkaExtension {
        constructor() {
            this.latestCounts = {};
            this._newResult = false;
            console.log('✅ QuokkaExtension constructor initialized');
        }

        getInfo() {
            console.log('✅ QuokkaExtension getInfo');
            return {
                id: 'quokka',
                name: 'Quokka QASM',
                blocks: [
                    {
                        opcode: 'runQuantum',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'run QASM [CODE] shots [SHOTS]',
                        arguments: {
                            CODE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\ncreg c[1];\nh q[0];\nmeasure q[0] -> c[0];'
                            },
                            SHOTS: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
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
            console.log('⏳ Sending to Quokka:', args);
            const payload = { script: args.CODE, count: args.SHOTS };
            fetch('https://quokka2.quokkacomputing.com/qsim/qasm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(json => {
                if (json.error_code !== 0) {
                    console.error('❌ Quokka returned error:', json.error);
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
                console.error('❌ Quokka fetch error:', err);
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

    // Register as a sandboxed extension (no runtime object)
    Scratch.extensions.register(new QuokkaExtension());
})();
