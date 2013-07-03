window.onload = function() {

    var messages = [];
    var socket = io.connect('http://localhost:3700');
    var field = document.querySelector('.field');
    var sendButton = document.querySelector('.send');
    var content = document.querySelector('.content');

    socket.on('message', function (data) {
        if(data.message) {
            messages.push(data.message);
            var html = '';
            for(var i=0; i<messages.length; i++) {
                html += messages[i] + '<br />';
            }
            content.innerHTML = html;
        } else {
            console.log("Houston, we have a problem: ", data);
        }
    });

    sendButton.onclick = function() {
        var text = field.value;
        socket.emit('send', { message: text });
    };
};
