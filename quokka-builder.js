(function (Scratch) {
  'use strict';
  console.log('✅ QuokkaExtension loaded');

  class QuokkaExtension {
    constructor(runtime) {
      // In unsandboxed mode, the VM will pass you a real `runtime` here.
      this.runtime = runtime;
      this.latestCounts = {};
      this._newResult = false;
      console.log('✅ QuokkaExtension constructor, runtime ok?', !!runtime);
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
      console.log('⏳ Sending to Quokka:', args);
      fetch('https://quokka2.quokkacomputing.com/qsim/qasm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: args.CODE, count: args.SHOTS })
      })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        .then(json => {
          if (json.error_code !== 0) {
            console.error('❌ Quokka error:', json.error);
            this.latestCounts = { error: json.error };
          } else {
            const counts = {};
            json.result.c.forEach(bits => {
              const key = bits.join('');
              counts[key] = (counts[key] || 0) + 1;
            });
            this.latestCounts = counts;
          }
          this._newResult = true;
          // In unsandboxed mode you can still fire the hat explicitly:
          if (this.runtime) this.runtime.startHats('quokka_whenResults');
        })
        .catch(err => {
          console.error('❌ Quokka fetch error:', err);
          this.latestCounts = { error: err.message };
          this._newResult = true;
          if (this.runtime) this.runtime.startHats('quokka_whenResults');
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

  // ← **Register the class, not an instance**:
  Scratch.extensions.register(QuokkaExtension);
})(window.Scratch);
