
/***** CLIENT *****/

localStorage.setItem('name', 'pluto');

var messages = [],
    socket = io.connect('http://localhost:3700'),
    field = document.querySelector('.field'),
    sendButton = document.querySelector('.send'),
    content = document.querySelector('.content'),
    message = function() {

        var name = localStorage.getItem('name'),
            text = field.value,
            type = 1;

        return {
            // nome di chi l'ha spedito
            name: name,
            // testo del messaggio
            text: text,
            // tipo di messaggio (NORMAL, SYSTEM, SCREAM?)
            type: type
        }
    },
    sendMessage = function (data) {
        socket.emit('send', data);
        field.value = ""; // clear input tag
    };


socket.on('message', function (data) {

    console.log(data);

    if (data.name && data.text) {
        messages.push(data);
        var html = '';
        for(var i=0; i<messages.length; i++) {
            html += "<b>" + messages[i].name + "</b>: " +
            messages[i].text + 
            ' (type: ' + messages[i].type 
            + ') <br />';
        }
        content.innerHTML = html;
    } else {
        console.log("Houston, we have a problem: ", data);
    }
})

sendButton.addEventListener("click", function(){

    sendMessage(message());

}, false);

field.addEventListener("keyup", function(event){
	if(event.keyCode == 13) { //user pressed enter
        sendMessage(message());
        // if message == "/nick new-nickname"
        //if (field.value == "/nick new-nickname") {
            //sendSystemMessage("new-nick");
        //    return;
        //}
	}
}, false);
