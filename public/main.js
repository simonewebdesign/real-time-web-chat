requirejs.config({
	urlArgs: /localhost/.test(document.location.hostname) ? 'bust=' + (new Date()).getTime() : '',
	paths: {'socket.io': 'socket.io/socket.io'}
});

require(['chat']);
