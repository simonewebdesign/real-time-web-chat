requirejs.config({

	// cache bust! Please remove in a production environment
	urlArgs: 'bust=' + (new Date()).getTime(),

	paths: {
		'socket.io': 'socket.io/socket.io'
	}
});

require(['chat']);


//require(['foo'], function(foo){
//	console.log('foo has been successfully loaded.');
//	console.log(foo);
//});
