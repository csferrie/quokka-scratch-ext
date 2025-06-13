(function (Scratch) {
  'use strict';
  // Should fire as soon as the script loads
  console.log('✅ QuokkaExtension loaded');

  class QuokkaExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.latest = null;  // will hold the last result JSON
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
                  'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\ncreg c[1];\nh q[0];\nmeasure q[0] -> c[0];'
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
          this.latest = json.result;
          // fire the hat block
          this.runtime.startHats('quokka_whenResults', {});
        })
        .catch(err => {
          console.error('❌ Quokka error:', err);
        });
    }

    whenResults() {
      // always returns true so the hat fires once per runQuantum
      return true;
    }

    getResults() {
      console.log('📝 getResults reporter called, returning:', this.latest);
      return this.latest ? JSON.stringify(this.latest) : '';
    }
  }

  Scratch.extensions.register(new QuokkaExtension());
})(window.Scratch);
