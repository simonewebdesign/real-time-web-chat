// # The Client

define(['emoticons', 'timer', 'types', 'socket.io'], function(emoticons, Timer, types) {

    var socket = io.connect('http://' + document.location.host),

        writingUsers = [],
        timers = [],

        // ### References to DOM elements
        field =      document.querySelector('.field'),
        sendButton = document.querySelector('.send'),
        content =    document.querySelector('.messages'),
        notice =     document.querySelector('.notice'),

        cmdRegex = /^\/([a-z0-9_-]+)\s?([a-z0-9_-]+)?\s?([a-z0-9_-]+)?$/i,

        // ## Functions

        // ### Getters and Setters

        // getters return `null` if the value hasn't been set first.

        // setters return `true` on success, `false` otherwise.

        getNick = function() {
            return localStorage.getItem('name');
        },

        // saves nickname in localStorage.
        setNick = function(nick) {
            if (nick) {
                localStorage.setItem('name', nick);
                return true;
            }
            return false;
        },

        // gets the Socket ID.
        getId = function() {
            return localStorage.getItem('id');
        },

        // sets the Socket ID.
        setId = function(id) {
            if (id) {
                localStorage.setItem('id', id);
                return true;
            }
            return false;
        },

        // ### Utility functions

        // generates a random nickname:
        // useful when an unknown user connects for the first time.
        generateNick = function() {
            var _maxRandomInt = 99999,
                randomInt = Math.floor(Math.random()*_maxRandomInt+1),
                randomName = 'Guest' + randomInt;
            return randomName;
        },

        // creates a new message.
        message = function(options) {

            var options = options 	|| {},
            	id   = options.id   || getId(),
                name = options.name || getNick(),
                text = options.text || field.value.trim(),
                type = options.type || types.NORMAL,
                time = options.time || (new Date()).getTime();

            return {
                id:   id,
                name: name,
                text: text,
                type: type,
                time: time
            }
        },

        // eats a message object, and returns the same object
        // with the text's placeholders replaced with images.
        // The images actually are just plain HTML.
        searchAndReplaceEmoticonsIn = function(message) {

            for (var i=0; i<emoticons.skype.length; i++) {

                var search, replacement;
                for (var k in emoticons.skype[i]) {
                    search = k,
                    replacement = emoticons.skype[i][k];
                }

                // the `search` emoticon is contained in `message`
                if (message.text.indexOf(search) != -1) {
                    var htmlReplacement = '<img src="img/skype/' + replacement +
                     '" alt="' + search + '" />';
                    message.text = message.text.replace(search, htmlReplacement);
                }                    
            }
            return message;
        },

        // is it a command?
        isCommand = function(text) {
            return cmdRegex.test(text);
        },

        // gets command name and arguments from the provided text,
        // assuming that the text is an actual command.
        // You should call isCommand() before this.
        getCommandFrom = function(text) {
            var matches = cmdRegex.exec(text),
                name = matches[1],
                args = [
                    matches[2], 
                    matches[3]
                ];

            return {
                name: name,
                args: args
            }
        },

        // evaluates a command. 
        // the first parameter is the command name, while
        // the second is an array containing the arguments.
        evaluate = function(command, args) {

            // #### Commands

            // ##### Nick
            // sets the nickname.
            // Usage: `/nick <nickname>`
            if (/nick/i.test(command)) {

                var name = args[0];

                // here we just make sure the user has specified the new name.
                // name is certainly valid because the command regex has
                // already validated it.
                if (name) {

                    // notify the server
                    socket.emit('set nickname', {
                        oldName: getNick(), 
                        newName: name
                    });

                    // update nickname locally
                    setNick(name);

                    return true;
                }
                return false;
            }

            // ##### Foo
            // just a test command.
            // Usage: `/foo [arg1] [arg2]`
            if (/foo/i.test(command)) {
                alert(args[0]);
                return true;
            }

            // not a valid command...
            printMessage({
                name: 'Server',
                text: command + ' is not a valid command.',
                type: types.SYSTEM,
                time: (new Date()).getTime()
            });
            maybeScrollToBottom();

            return false;
        },

        // reads the field.value. if it's empty, it just does nothing.
        // checks whether the field.value is a command. If so, it executes it.
        // else it just searches for emoticons and finally it notifies the server
        // that the user wants to send the message.
        // it also clears the field.value (input tag).
        send = function(data) {

            if (data.text == '') {
                return;
            }

            if (isCommand(data.text)) {

                var command = getCommandFrom(data.text);
                evaluate(command.name, command.args);
                // maybe add here a socket.emit('execute command')
                // where the evaluate() returns true.
            } else {
                socket.emit('send message', data);
            }
            // clear input tag
            field.value = "";
        },

        // generates the HTML element representing a message, and prints it.
        // data is the message object to print.
        printMessage = function(data) {

            if (!data.text) {
                return;
            }

            var messageHTMLElement = document.createElement('div');
            var messageType;
            switch(data.type) {
                case types.SYSTEM:
                    messageType = 'system';
                    break;
                case types.PRIVATE:
                    messageType = 'private';
                    break;
                default:
                    messageType = '';
            }

            messageHTMLElement.setAttribute('class', 'message clearfix ' + messageType);

            // create the wrappers
            var nicknameWrapperHTMLElement = document.createElement('div'),
                textWrapperHTMLElement     = document.createElement('div'),
                timeWrapperHTMLElement     = document.createElement('div');

            nicknameWrapperHTMLElement.setAttribute('class', 'name');
            textWrapperHTMLElement    .setAttribute('class', 'text');
            timeWrapperHTMLElement    .setAttribute('class', 'time');

            var nicknameHTMLElement = document.createElement('b'),
                idHTMLElement       = document.createElement('span'),
            //  textHTMLElement     = document.createElement('span'),
                timeHTMLElement     = document.createElement('time');

            nicknameHTMLElement.innerHTML = data.name;
            idHTMLElement.innerHTML = data.id;
            textWrapperHTMLElement.innerHTML = data.text;
            timeHTMLElement.innerHTML = (new Date(data.time)).toLocaleTimeString();

            // append elements to the wrappers
            nicknameWrapperHTMLElement.appendChild(nicknameHTMLElement);
            nicknameWrapperHTMLElement.appendChild(idHTMLElement);
            //textWrapperHTMLElement.appendChild(textHTMLElement);
            timeWrapperHTMLElement.appendChild(timeHTMLElement);

            // append wrappers to the .message
            messageHTMLElement.appendChild(nicknameWrapperHTMLElement);
            messageHTMLElement.appendChild(textWrapperHTMLElement);
            messageHTMLElement.appendChild(timeWrapperHTMLElement);

            // append the .message to content
            content.appendChild(messageHTMLElement);
        },

        // displays a notice like: *john is writing...*
        // the argument is an array of the users that 
        // are currently writing something.
        printNotice = function(users) {

            if (users.length < 1) {
                notice.innerHTML = '';
                return;
            }

            var str = users.join(', ');
            
            if (users.length > 1) {
                str += ' are ';
            } else {
                str += ' is ';
            }
            str += 'writing...';

            notice.innerHTML = str;
        },

        // Scroll to the bottom.
        // scrollHeight is always higher than scrollTop, so it
        // will certainly bring us to the bottom.
        scrollToBottom = function() {
            var content = document.querySelector('.content');
            content.scrollTop = content.scrollHeight;
        }

        // Scroll to the bottom if user is in the viewport.
        maybeScrollToBottom = function() {
            var content = document.querySelector('.content');
            // the maximum value scrollTop can assume.
            content.maxScrollTop = content.scrollHeight - content.offsetHeight;
            if (content.maxScrollTop - content.scrollTop <= content.offsetHeight) scrollToBottom();
        },

        // Checks if Notification is available in the browser. Then, asks to
        // the user the permission to send notifications, if it doesn't have it
        // already. Finally it sends a notification.
        // If you don't provide the data parameter, it will just enable notifications.
        sendNotification = function(data) {
            if (typeof Notification === "function") {
                if (!Notification.permission || Notification.permission === "default") {
                    Notification.requestPermission(function(perm){
                        // for Chrome and Safari
                        // (because they haven't implemented Notification.permission yet)
                        if (Notification.permission !== perm) {
                            Notification.permission = perm;
                        }
                    });
                }
                if (Notification.permission === "granted" && data.text) {
                    var notification = new Notification(data.name, {
                       body: data.text,
                       tag: data.name
                    });
                }
            }
        }

        // Removes an element from writingUsers.
        // value is the string to remove from the array.
        // Returns an array with the removed element; false otherwise.
        writingUsers.remove = function(value) {
            var idx = this.indexOf(value);
            if (idx != -1) {
                return this.splice(idx, 1);
            }
            return false;
        }


    // ### Web Socket events

    socket.on('connected', function(data) {

        // First of all, let's recognize the user.
        var user = {
            id: data.id
        };

        // store Socket ID in client, for later use
        setId(data.id);

        // returning user?
        if (getNick()) {

            user.name = getNick();
            user.isNewish = false;

        } else {
            // set nickname for the first time
            user.name = generateNick();
            user.isNewish = true;

            // and save it client-side
            setNick(user.name);

        }
        socket.emit('recognizing user', user);
    });

    socket.on('user recognized', function(user) {

        var welcomeMessage = {
            name: 'Server',
            text: user.name + ' has joined the chat. ',
            type: types.SYSTEM;
            time: (new Date()).getTime()
        };

        welcomeMessage.text += user.isNewish ? 'Welcome!' : 'Welcome back!';
        printMessage(welcomeMessage);
        maybeScrollToBottom();

    });

    // this is a broadcast
    socket.on('nickname set', function(user) {

        printMessage({
            name: 'Server',
            text: user.oldName + ' changed his name to ' + user.newName,
            type: types.SYSTEM;
            time: (new Date()).getTime(),
        });
        maybeScrollToBottom();
    });

    // this is a broadcast too
    socket.on('disconnected', function(data) {

        printMessage({
            name: 'Server',
            text: data.name + ' disconnected.',
            type: types.SYSTEM;
            time: (new Date()).getTime()
        });
        maybeScrollToBottom();
    });

    socket.on('message', function(data) {
        searchAndReplaceEmoticonsIn(data);
        printMessage(data);
        maybeScrollToBottom();
        sendNotification(data);
    });

    socket.on('written', function(data) {
        // if we don't have a timer for the user,
        // we instantiate one on the fly.
        // otherwise, we reset it.
        if (timers[data.name]) {
            timers[data.name].reset();
        } else {
            timers[data.name] = new Timer(function() {
                // removes an user because the time has expired
                writingUsers.remove(data.name);
                // redisplays the notice
                printNotice(writingUsers);
                // maybe destroy the timer?
                timers[data.name] = 0;
            });

            timers[data.name].start();
        }

        // remove the user if it's in writingUsers
        if (data.text == '' || data.text.substring(0,1) == '/') {
            writingUsers.remove(data.name);
        } else {
            // add the user to writingUsers array, if it isn't in already
            if (writingUsers.indexOf(data.name) == -1) {
                writingUsers.push(data.name);
            }
        }

        printNotice(writingUsers);
    });

    socket.on('messages loaded', function(data) {
        for (var i=0; i<data.length; i++) {
            printMessage(data[i]);
        }
        scrollToBottom();
    });

    // ### Event listeners

    sendButton.addEventListener('click', function() {
        send(message());
        // alerts the server that this user is writing a message
        socket.emit('writing', message());

        // enable Notifications (for WebKit users only)
        sendNotification();
    }, false);

    field.addEventListener('keyup', function(event) {
        // user pressed enter? then it's a message.
        if (event.keyCode == 13) {
            send(message());
        }
        // alerts the server that this user is writing a message
        socket.emit('writing', message());

    }, false);

// *"The last 29 days of the month are the hardest." - Nikola Tesla*
});
