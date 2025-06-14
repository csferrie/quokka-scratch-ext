(function (Scratch) {
  'use strict';
  console.log('🛠️ Debug QuokkaExtension starting…');
  console.log('Global Scratch object:', Scratch);
  
  class DebugQuokka {
    constructor(runtime) {
      this.runtime = runtime;
      console.log('🛠️ constructor, runtime passed:', runtime);
    }

    getInfo() {
      console.log('🛠️ getInfo called');
      // list out the prototype methods
      const proto = Object.getPrototypeOf(this);
      console.log('🛠️ prototype methods:', Object.getOwnPropertyNames(proto));
      
      const blocks = [
        'runQuantum',
        'whenResults',
        'getCounts'
      ].map(op => {
        console.log(`🛠️ checking method for opcode "${op}":`, typeof this[op]);
        return { opcode: op };
      });
      
      return {
        id: 'quokka',
        name: 'Quokka QASM (debug)',
        blocks: [
          {
            opcode: 'runQuantum',
            blockType: Scratch.BlockType.COMMAND,
            text: 'run QASM [CODE] shots [SHOTS]',
            arguments: {
              CODE: { type: Scratch.ArgumentType.STRING, defaultValue: '…' },
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
      console.log('🛠️ runQuantum invoked with', args);
      // don’t actually call fetch—just signal a result so you can test the hat
      this._counts = { debug: 1 };
      this._fired = true;
      if (this.runtime) {
        console.log('🛠️ firing hat via runtime.startHats');
        this.runtime.startHats('quokka_whenResults');
      }
    }

    whenResults() {
      if (this._fired) {
        this._fired = false;
        console.log('🛠️ whenResults returning true');
        return true;
      }
      return false;
    }

    getCounts() {
      console.log('🛠️ getCounts returning', this._counts);
      return JSON.stringify(this._counts || {});
    }
  }

  console.log('🛠️ registering DebugQuokka…');
  // Register the class so TurboWarp will instantiate it correctly
  Scratch.extensions.register(DebugQuokka);
})(window.Scratch);
