(function (Scratch) {
  'use strict';

  class QuokkaExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.latest = null;  // will hold the last result JSON
    }

    getInfo() {
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
                  'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\nh q[0];'
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
          if (!response.ok) {
            return response.text().then(text => Promise.reject(text));
          }
          return response.json();
        })
        .then(json => {
          this.latest = json.result;
          // trigger the hat block
          this.runtime.startHats('quokka_whenResults');
        })
        .catch(err => {
          console.error('Quokka error:', err);
        });
    }

    whenResults() {
      // always returns true so the hat fires once per runQuantum
      return true;
    }

    getResults() {
      // returns the raw result JSON as a string
      return this.latest ? JSON.stringify(this.latest) : '';
    }
  }

  Scratch.extensions.register(new QuokkaExtension());
})(window.Scratch);
