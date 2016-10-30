// # The Client

define(['emoticons', 'timer', 'types', 'socket.io'], function(emoticons, Timer, types) {

    var socket = io.connect('http://' + document.location.hostname + ':8000'),

        writingUsers = [],
        timers = [],

        // ### References to DOM elements
        field =      document.querySelector('.field'),
        sendButton = document.querySelector('.send'),
        content =    document.querySelector('.messages'),
        notice =     document.querySelector('.notice'),

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

        // surround links with <a> tagged html
        linkify = function(text) {
            var isLink = /((https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\S]*)*\/?)/g;
            return text.replace(isLink, '<a href="$1">$1</a>');                        
        },

        // eats text, and returns the same text
        // with its placeholders replaced with HTML <img> tags.
        searchAndReplaceEmoticonsInEncodedString = function(text) {

            for (var i=0; i<emoticons.skype.length; i++) {

                var search, replacement;
                for (var k in emoticons.skype[i]) {
                    search = k,
                    replacement = emoticons.skype[i][k];
                }

                // the `search` emoticon is contained in `message`
                if (text.indexOf(search) != -1) {
                    var htmlReplacement = '<img src="img/skype/' + replacement +
                     '" alt="' + search + '" />';
                    text = text.replace(new RegExp(search, 'g'), htmlReplacement);
                }
            }
            return text;
        }

        // is it a command?
        isCommand = function(text, regex) {
            var r = regex || /^\/([a-z0-9_-]+)\s?([a-z0-9_-]+)?\s?([a-z0-9_-]+)?$/i;
            return r.test(text);
        },

        // gets command name and arguments from the provided text,
        // assuming that the text is an actual command.
        // You should call isCommand() before this.
        getCommandFrom = function(text, regex) {
            var r = regex || /^\/([a-z0-9_-]+)\s?([a-z0-9_-]+)?\s?([a-z0-9_-]+)?$/i,
                matches = r.exec(text),
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

            // ##### Msg
            // Send a private message.
            // Usage: `/msg [nick] [message]`
            // Alias: `/m`
            if (/m|sg/i.test(command)) {
                var nick = args[0],
                    text = args[1].trim();
                if (text) {
                    send(message({
                        text: text,
                        type: types.PRIVATE
                    }));
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
            printMessage(message({
                name: 'Server',
                text: command + ' is not a valid command.',
                type: types.SYSTEM
            }));
            scrollToBottom();

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
            field.value = '';
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

            // From MDN: Quite often, in
            // order to retrieve or write text within an element, people use
            // `innerHTML`. textContent should be used instead. Since the text is
            // not processed it's likely to have better performance. Moreover, this
            // avoids an XSS vector attack.
            nicknameHTMLElement.textContent = data.name;
            idHTMLElement.textContent = data.id;

            // escape unsafe characters such as < and >
            textWrapperHTMLElement.innerText = textWrapperHTMLElement.textContent = data.text;
            // console.log(textWrapperHTMLElement.innerHTML); // this is now an HTML encoded string
            var escapedHTMLString = searchAndReplaceEmoticonsInEncodedString(textWrapperHTMLElement.innerHTML);
            textWrapperHTMLElement.innerHTML = linkify(escapedHTMLString);

            timeHTMLElement.textContent = (new Date(data.time)).toLocaleTimeString();

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
            str += (users.length > 1) ? ' are ' : ' is ';
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
        sendNotification = function(data, callback) {
            if (typeof Notification === 'function') {
                if (!Notification.permission || Notification.permission === 'default') {
                    Notification.requestPermission(function(perm){
                        // for Chrome and Safari
                        // (because they haven't implemented Notification.permission yet)
                        if (Notification.permission !== perm) {
                            Notification.permission = perm;
                        }
                    });
                }
                if (Notification.permission === 'granted' && data.text && !window.isFocused) {
                    var notification = new Notification(data.name, {
                       body: data.text,
                       tag: data.name
                    });
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            }
        },

        // load and play a sound.
        playSound = function(path) {
            // audio supported?
            if (typeof window.Audio === 'function') {
                var audioElem = new Audio();
                audioElem.src = path;
                audioElem.play();
            }
        },

        isUrl = function(url, regex) {
            var r = regex || /https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,}/i;
            return r.test(url);
        },

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

    // to all
    socket.on('user recognized', function(user) {

        var welcomeText = user.name + ' has joined the chat. ';
        welcomeText += user.isNewish ? 'Welcome!' : 'Welcome back!';

        send(message({
            name: 'Server',
            type: types.SYSTEM,
            text: welcomeText
        }));
        playSound('wav/connection_smb_flagpole.wav');
    });

    // to all
    socket.on('nickname set', function(user) {

        send(message({
            name: 'Server',
            type: types.SYSTEM,
            text: user.oldName + ' changed his name to ' + user.newName
        }));
        playSound('wav/nickname_set_smb_jump-small.wav');
    });

    // to all
    socket.on('disconnected', function(data) {

        send(message({
            name: 'Server',
            type: types.SYSTEM,
            text: data.name + ' has quit.'
        }));
        playSound('wav/disconnection_smb_bowserfalls.wav');
    });

    socket.on('message', function(data) {
        printMessage(data);
        maybeScrollToBottom();
        sendNotification(data, function(){
            playSound('wav/notification_smb_kick.wav');
        });
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
        if (event.keyCode == 13 && !event.shiftKey) {
            send(message());
        }
        // alerts the server that this user is writing a message
        socket.emit('writing', message());

    }, false);

    // for the notifications
    window.onfocus = function() { window.isFocused = true; };
    window.onblur  = function() { window.isFocused = false; };

// *"The last 29 days of the month are the hardest." - Nikola Tesla*
});
