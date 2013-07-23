
/***** CLIENT *****/

//window.onload = function() {

// message 
// { name: // nome di chi l'ha spedito
//   text: // testo del messaggio
//   type: // tipo di messaggio
//      [
//          0: 'SYSTEM',
//          1: 'NORMAL',
//          2: 'SCREAM'
// ] }

var messages = [];
var socket = io.connect('http://localhost:3700');
var field = document.querySelector('.field');
var sendButton = document.querySelector('.send');
var content = document.querySelector('.content');

console.log($(field));

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
});

var sendMessage = function(data) {
    socket.emit('send', data);
    field.value = ""; // clear input tag
}

sendButton.addEventListener("click", function(){

    sendMessage({
        name: 'paperino',
        text: field.value,
        type: 1
    });

}, false);

field.addEventListener("keyup", function(event){
	if(event.keyCode == 13) { //user pressed enter
        sendMessage({

        })
        // if message == "/nick new-nickname"
        //if (field.value == "/nick new-nickname") {
            //sendSystemMessage("new-nick");
        //    return;
        //}
        //sendMessage("pippoHaPigiatoEnter", field.value);
	}
}, false);


//};
