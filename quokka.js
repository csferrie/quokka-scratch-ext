(function (Scratch) {
  'use strict';
  console.log('✅ QuokkaExtension loaded');

  class QuokkaExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.latest = null;      // last result JSON
      this._newResult = false; // flag for a fresh result
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
            opcode: 'getResults',
            blockType: Scratch.BlockType.REPORTER,
            text: 'quokka results'
          }
        ]
      };
    }

    runQuantum(args) {
      console.log('⏳ Sending to Quokka:', args);
      const payload = {
        script: args.CODE,
        count: args.SHOTS
      };
      fetch('https://quokka2.quokkacomputing.com/qsim/qasm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(response => {
          console.log('⏳ HTTP status:', response.status, response.statusText);
          return response.json();
        })
        .then(json => {
          console.log('✅ Quokka replied:', json);
          this.latest = json.result || {};
          this._newResult = true;
          // fire the hat block once
          this.runtime.startHats('quokka_whenResults', {});
        })
        .catch(err => {
          console.error('❌ Quokka error:', err);
        });
    }

    whenResults() {
      if (this._newResult) {
        this._newResult = false;
        return true;
      }
      return false;
    }

    getResults() {
      console.log('📝 getResults reporter called, returning:', this.latest);
      return JSON.stringify(this.latest);
    }
  }

  Scratch.extensions.register(new QuokkaExtension());
})(window.Scratch);
