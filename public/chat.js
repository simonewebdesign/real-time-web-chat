
/***** CLIENT *****/

define(['emoticons', 'socket.io'], function (emoticons) {

    var socket = io.connect('http://localhost:1337'),
        timer,
        delay = 3000,
//        users = [],
//        messages = [],
//        webNotificationsEnabled = false,        

        field = document.querySelector('.field'),
        sendButton = document.querySelector('.send'),
        content = document.querySelector('.messages'),
        notice = document.querySelector('.notice'),
        enableNotificationsButton = document.querySelector('.enable-notifications'),

        // gets nickname from localStorage:
        // return: string nickname, or null if nick hasn't been set yet.
        getNick = function() {
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

        // creates a new message.
        // return: object the message
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

        // evaluates a command.
        // string command the command name.
        // array args the command arguments.
        // return: void
        evaluateCommand = function (command, args) {
            // command name: nick
            // description: set a new nickname
            // usage: /nick <nickname>
            if (/nick/i.test(command)) { // TODO we will use a switch statement here

                var name = args[0];

                if (name !== undefined && name !== '') {

                    // name is certainly valid because the command regex has
                    // already validated it.

                    // notify the server and everything else that
                    // I just changed the nick
                    socket.emit('set nickname', {
                        oldName: getNick(), // if we are setting a new nickname, we certainly have a nickname already.
                        newName: name
                    });

                    // update my nickname
                    setNick(name);
                }
            }
        },

        // reads the field.value. if it's empty, it just does nothing.
        // checks whether the field.value is a command. If so, it executes it.
        // else it just searches for emoticons and finally it notifies the server
        // that the user wants to send the message.
        // it also clears the field.value (input tag).
        sendMessage = function (data) {

            if (data.text == '') {
                return;
            }
            
            var commandRegex = /^\/([a-z0-9_-]+)\s?([a-z0-9_-]+)?\s?([a-z0-9_-]+)?$/i,
                isCommand = commandRegex.test(data.text);

            if (isCommand) {

                var matches = commandRegex.exec(data.text);
                    command = matches[1],
                    args = [matches[2], matches[3]];

                evaluateCommand(command, args);

            } else {

                searchAndReplaceEmoticonsIn(data);
                socket.emit('send message', data);
            }
            // clear input tag
            field.value = "";
        },

        // generates the HTML element representing a message, and prints it.
        // object data the message to print.
        // return: void
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

        // for the "user is writing..." feature
        // return: void
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

        //console.log('client connected.');
        //console.log(data);

        // First of all, let's set the nickname.
        // NICKNAME
        var user = {
            name: '',
            isNewish: false
        };
        // new user?
        if (getNick() === null) {
            // set nickname for the first time
            user.name = generateNick();
            user.isNewish = true;
            setNick(user.name);
        } else {
            // returning user
            user.name = getNick();
            user.isNewish = false;
        }
        socket.emit('recognizing user', user);
        //printMessage({
        //    name: 'Server',
        //    text: data.name + '(' + data.id + ')' + ' is now online!',
        //    type: 0,
        //    time: (new Date()).getTime()
        //});
    });

    socket.on('user recognized', function (user) {

        if (user.isNewish) {
            // print a welcome message
            printMessage({
                name: 'Server',
                text: user.name + ' is connected. Welcome!',
                type: 0,
                time: (new Date()).getTime()
            });
            // and save the nickname on client-side
            setNick(user.name);

        } else {
            // print a welcome back message
            printMessage({
                name: 'Server',
                text: 'Welcome back, ' + user.name + '!',
                type: 0,
                time: (new Date()).getTime()
            });
        }
    });

    socket.on('nickname set', function (user) {

        // This is a received broadcast

        printMessage({
            name: 'Server',
            text: user.oldName + ' changed his name to ' + user.newName,
            type: 0,
            time: (new Date()).getTime(),
        });
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

    socket.on('message sent', function (data) {
        // add the message to messages
        // messages.push(data);

        // print it!
        printMessage(data);

        // notifications
//        try {
//
//            notification = new Notification(data.name, {
//               body: data.text,
//               dir: 'auto',
//               lang: 'en',
//               tag: 'test',
//               icon: 'https://0.gravatar.com/avatar/70034fa76ec3ada7dc95ecb8dc01f74f&s=420'
//            });
//
//            console.log('Permission is: ' + notification.permission);
//
//        } catch (exception) {
//           // Notifications not enabled or
//           // browser does not support them.
//           //console.log(exception);
//        }
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

//    enableNotificationsButton.addEventListener('click', function (event) {
//
//        console.log("button clicked, should now enable notifications");
//
//        // FIXME not crossbrowser
//        // FIXME not performant
//        if (window.webkitNotifications) {
//
//            Notification.requestPermission(function (perm) {
//                console.log("perm: " + perm);
//                if (perm === 'granted') {
//                    // Tell your app it's OK to send notifications
//                    webNotificationsEnabled = true;
//                }
//            });
//        }
//
//    }, false);

});
