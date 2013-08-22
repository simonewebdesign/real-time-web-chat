
/***** CLIENT *****/

define(['emoticons', 'socket.io'], function (emoticons) {

    var messages = [],
        users = [],
        webNotificationsEnabled = false,
        socket = io.connect('http://localhost:1337'),
        timer,
        delay = 3000,

        field = document.querySelector('.field'),
        sendButton = document.querySelector('.send'),
        content = document.querySelector('.messages'),
        notice = document.querySelector('.notice'),
        enableNotificationsButton = document.querySelector('.enable-notifications'),

        // gets nickname from localStorage:
        // return: string nickname, or null if nick hasn't been set yet.
        getNick = function() {
            return localStorage.getItem('name');                
                localStorage.setItem('name', randomName);
            }
            return localStorage.getItem('name');
        },

        // save nickname on localStorage
        // return: true on success, false otherwise.
        setNick = function (nick) {
            if (nick !== '' && nick !== undefined && nick !== null) {
                localStorage.setItem('name', nick);
                return true;
            }
            return false;
        },

        // generates a random nickname.
        // useful when an unknown user connects for the first time.
        // return: string random nick
        generateNick = function() {
            var _maxRandomInt = 99999,
                randomInt = Math.floor(Math.random()*_maxRandomInt+1),
                randomName = 'Guest' + randomInt;
            return randomName;
        },

        message = function() {

            var name = getNick(),
                text = field.value.trim(),
                type = 1,
                time = (new Date()).getTime();

            return {
                // nome di chi l'ha spedito
                name: name,
                // testo del messaggio
                text: text,
                // tipo di messaggio (NORMAL, SYSTEM, SCREAM?)
                type: type,
                // timestamp
                time: time
            }
        },

        searchAndReplaceEmoticonsIn = function (message) {
            // TODO msn
            for (var i=0; i<emoticons.skype.length; i++) {

                var search = '',
                    replacement = '';

                for (var k in emoticons.skype[i]) {
                    search = k,
                    replacement = emoticons.skype[i][k];
                }

                var isContained = !!(message.text.indexOf(search) != -1);
                if (isContained) {
                    var htmlReplacement = '<img src="img/skype/' + replacement +
                     '" alt="' + search + '" />';
                    message.text = message.text.replace(search, htmlReplacement);
                }                    
            }
            return message;
        },

        sendMessage = function (data) {

            // FIXME a message won't be sent if it doesn't come from field.
            if (field.value.trim() == '') {
                return;
            }
            
            var commandRegex = /^\/([a-z0-9_-]+)\s?([a-z0-9_-]+)?\s?([a-z0-9_-]+)?$/i,
                isCommand = commandRegex.test(data.text);

            if (isCommand) {

                var matches = commandRegex.exec(data.text);
                    commandName = matches[1]; 

                if (/nick/i.test(commandName)) { // TODO we will use a switch statement here

                    var newNickname = matches[2],
                        emptyNickname = !!(newNickname == undefined || newNickname == '');

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

                searchAndReplaceEmoticonsIn(data);
                
                // send the message
                socket.emit('send', data);
            }
            // clear input tag
            field.value = "";
        },

        printMessage = function (data) {

            if (!data.text) {
                return;
            }
            // create the HTML element
            var messageHTMLElement = document.createElement('div');
            messageHTMLElement.setAttribute('class', 'message clearfix');

            // create the wrappers
            var nicknameWrapperHTMLElement = document.createElement('div'),
                textWrapperHTMLElement = document.createElement('div'),
                timeWrapperHTMLElement = document.createElement('div');

            // set classes to wrappers
            nicknameWrapperHTMLElement.setAttribute('class', 'name');
            textWrapperHTMLElement.setAttribute('class', 'text');
            timeWrapperHTMLElement.setAttribute('class', 'time');

            // name
            var nicknameHTMLElement = document.createElement('b');
            nicknameHTMLElement.innerHTML = data.name;

            // text
            var textHTMLElement = document.createElement('span');
            textHTMLElement.innerHTML = data.text;

            // time
            var timeHTMLElement = document.createElement('time');
            timeHTMLElement.innerHTML = (new Date()).toLocaleTimeString();


            // append elements to the wrappers
            nicknameWrapperHTMLElement.appendChild(nicknameHTMLElement);
            textWrapperHTMLElement.appendChild(textHTMLElement);
            timeWrapperHTMLElement.appendChild(timeHTMLElement);

            // append wrappers to the .message
            messageHTMLElement.appendChild(nicknameWrapperHTMLElement);
            messageHTMLElement.appendChild(textWrapperHTMLElement);
            messageHTMLElement.appendChild(timeWrapperHTMLElement);

            // append the .message to content
            content.appendChild(messageHTMLElement);
        },

        resetTimer = function() {
            if (typeof timer != "undefined") {            
                clearTimeout(timer);
                timer = 0;
            }

            timer = setTimeout(function() {
                notice.innerHTML = '';
            }, delay);            
        }


    /***** server socket events *****/

    socket.on('connected', function (data) {
        console.log('client connected.');
        console.log(data);

        // NICKNAME
        var name = '';
        // new user?
        if (getNick() === null) {
            // set nickname for the first time
            name = generateNick();
        } else {
            // returning user
            name = getNick();
        }
        socket.emit('set nickname', name);
        //printMessage({
        //    name: 'Server',
        //    text: data.name + '(' + data.id + ')' + ' is now online!',
        //    type: 0,
        //    time: (new Date()).getTime()
        //});
    });

    socket.on('disconnected', function (data) {
        console.log('client disconnected. id: ' + data.id);
        printMessage({
            name: 'Server',
            text: data.name + ' disconnected.',
            type: 0,
            time: (new Date()).getTime()
        });
    });

    socket.on('nickname set', function (data) {

        // new user?
        if (getNick() === null) {

            printMessage({
                name: 'Server',
                text: data.name + ' is connected.',
                type: 0,
                time: (new Date()).getTime()
            });

        } else {

            printMessage({
                name: 'Server',
                text: getNick() ' changed his name to ' + data.name;
                type: 0,
                time: (new Date()).getTime(),
            });
        }

        setNick(data.name);
    });

    socket.on('message', function (data) {
        // add the message to messages
        messages.push(data);

        // print it!
        printMessage(data);

        // notifications
        try {

            notification = new Notification(data.name, {
               body: data.text,
               dir: 'auto',
               lang: 'en',
               tag: 'test',
               icon: 'https://0.gravatar.com/avatar/70034fa76ec3ada7dc95ecb8dc01f74f&s=420'
            });

            console.log('Permission is: ' + notification.permission);

        } catch (exception) {
           // Notifications not enabled or
           // browser does not support them.
           //console.log(exception);
        }

    });

    socket.on('written', function (data) {

        resetTimer();

        if (data.text == '') {
            notice.innerHTML = ''; 
        }else {
            notice.innerHTML = data.name + ' is writing...';
        }

    });


    /***** client-side event listeners *****/

    sendButton.addEventListener('click', function () {

        sendMessage(message());
        // alerts other users that this user is writing a message
        socket.emit('writing', message());

    }, false);

    field.addEventListener('keyup', function (event) {

        if (event.keyCode == 13) { // user pressed enter
            sendMessage(message());
        }
        // alerts other users that this user is writing a message
        socket.emit('writing', message());

    }, false);

    enableNotificationsButton.addEventListener('click', function (event) {

        console.log("button clicked, should now enable notifications");

        // FIXME not crossbrowser
        // FIXME not performant
        if (window.webkitNotifications) {

            Notification.requestPermission(function (perm) {
                console.log("perm: " + perm);
                if (perm === 'granted') {
                    // Tell your app it's OK to send notifications
                    webNotificationsEnabled = true;
                }
            });
        }

    }, false);

});
