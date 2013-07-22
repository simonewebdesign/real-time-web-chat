window.onload = function() {

    var rows = [];
    var socket = io.connect('http://localhost:3700');
    var field = document.querySelector('.field');
    var sendButton = document.querySelector('.send');
    var content = document.querySelector('.content');

    socket.on('message', function (data) {

        console.log(data);

        if (data.name && data.message) {
            rows.push(data);
            var html = '';
            for(var i=0; i<rows.length; i++) {
                html += "<b>" + rows[i].name + "</b>: " +
                rows[i].message + '<br />';
            }
            content.innerHTML = html;
        } else {
            console.log("Houston, we have a problem: ", data);
        }
    });

    var sendRow = function() {
   		var text = field.value;
        var row = { name: 'pippo', message: text };
        socket.emit('send', row);
        field.value = "";
    }

    sendButton.onclick = sendRow();

    field.addEventListener("keyup", function(event){
    	if(event.keyCode == 13) { //user pressed enter
    		sendRow();
    	}
    });
};
