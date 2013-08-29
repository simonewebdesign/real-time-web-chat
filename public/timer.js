define([], function() {

  // il timer ci serve per mostrare le notice 

  // function callback
  // object   options
  var Timer = function(callback, options) {

    if (!options) {
      options = {};
    }

    this.delay = options.delay ? options.delay : 3000;
//  this.user = options.user ? options.user : '';
    this.isRunning = false;

    this.start = function() {

      this.isRunning = true;

      var that = this;
      setTimeout(function() {
        that.onFinish();
      }, this.delay);
    };

    this.reset = function() {
      clearTimeout(this);
      //delete this;
    };

    this.onFinish = function() {
//      console.log('timer finished!');
      if (typeof callback == 'function') {
//        console.log('[Timer onFinish] calling callback function...')
        callback();
      }

      this.isRunning = false;
    };


  }

  return Timer;

});
