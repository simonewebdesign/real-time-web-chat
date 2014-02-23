define(function() {

  // A timer. Useful to display notices in our web chat app.
  // function callback
  // object   options
  var Timer = function(callback, options) {

    var self = this,
        options = options || {};

    this.delay = options.delay || 3000;
    this.isRunning = false;

    this.start = function() {

      this.isRunning = true;

      setTimeout(function() {
        self.onFinish();
      }, this.delay);
    }

    this.reset = function() {
      clearTimeout(this);
    }

    this.onFinish = function() {
      if (typeof callback == 'function') {
        callback();
      }
      this.isRunning = false;
    }
  }

  return Timer;

});
