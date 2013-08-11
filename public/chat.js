
/***** CLIENT *****/

localStorage.setItem('name', 'pluto');

var messages = [],
    socket = io.connect('http://localhost:1337'),

    field = document.querySelector('.field'),
    sendButton = document.querySelector('.send'),
    content = document.querySelector('.messages'),
    notice = document.querySelector('.notice'),

    getNick = function() {
        return localStorage.getItem('name');
    },
    setNick = function(nick){
        localStorage.setItem('name', nick);
    },

    message = function() {

        var name = getNick(),
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
        
        var commandRegex = /^\/([a-z0-9_-]+)\s?([a-z0-9_-]+)?\s?([a-z0-9_-]+)?$/i,
            isCommand = commandRegex.test(data.text);

        if (isCommand) {

            var matches = commandRegex.exec(data.text);
                commandName = matches[1]; // TODO we will use a switch statement here
            if (/nick/i.test(commandName)) {
                var newNickname = matches[2];
                console.log(newNickname);
                var emptyNickname = !!(newNickname == undefined || newNickname == '');
                console.log(emptyNickname)
                if (!emptyNickname) {

                    socket.emit('send', {
                        name: 'Server',
                        text: getNick() + ' changed his name to ' + newNickname,
                        type: 0
                    });

                    setNick(newNickname);
                }
            }

        } else {
            // send the message
            socket.emit('send', data);
        }
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
});

sendButton.addEventListener("click", function(){
    sendMessage(message());
}, false);

field.addEventListener("keyup", function(event){

    console.log(field.value);

    if (field.value != '') {
        console.log("NOT empty");
        notice.innerHTML = "Sta scrivendo...";

    } else {
        console.log("empty");
        notice.innerHTML = '';
    }


	if(event.keyCode == 13) { //user pressed enter
        sendMessage(message());
        notice.innerHTML = '';
        // if message == "/nick new-nickname"
        //if (field.value == "/nick new-nickname") {
            //sendSystemMessage("new-nick");
        //    return;
        //}
	}
}, false);
