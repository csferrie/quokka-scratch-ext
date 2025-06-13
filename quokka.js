(function (Scratch) {
  'use strict';

  class QuokkaExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.latestCounts = {};
      this._newResult = false;
    }

    getInfo() { /* … */ }

    runQuantum(args) {
      /* … */
      .then(json => {
        /* set this.latestCounts … */
        this._newResult = true;
        // now this.runtime is defined, so this works:
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

    getCounts() { return JSON.stringify(this.latestCounts); }
  }

  // ← register the class, not an instance:
  Scratch.extensions.register(QuokkaExtension);
})(window.Scratch);
