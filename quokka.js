(function (Scratch) {
  'use strict';
  console.log('✅ QuokkaExtension loaded');

  class QuokkaExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.latestCounts = {};    // most-recent counts { "00":23, "01":77, ... }
      this._newResult = false;   // flag to trigger the hat exactly once
      console.log('✅ QuokkaExtension constructor');
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
                defaultValue:
                  'OPENQASM 2.0;\n' +
                  'include "qelib1.inc";\n' +
                  'qreg q[1];\n' +
                  'creg c[1];\n' +
                  'h q[0];\n' +
                  'measure q[0] -> c[0];'
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
          // aggregate the raw bit-arrays into counts
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
        this.runtime.startHats('quokka_whenResults');
      })
      .catch(err => {
        console.error('❌ Quokka fetch error:', err);
        this.latestCounts = { error: err.message };
        this._newResult = true;
        this.runtime.startHats('quokka_whenResults');
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
      // No console.log here, so a dragged-out monitor won’t spam the console.
      return JSON.stringify(this.latestCounts);
    }
  }

  Scratch.extensions.register(new QuokkaExtension());
})(window.Scratch);
