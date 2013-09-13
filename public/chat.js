
/***** CLIENT *****/

define(['emoticons', 'timer', 'socket.io'], function (emoticons, Timer) {

    var socket = io.connect('http://' + document.location.host),

        writingUsers = [],        
        timers = [],

        field =      document.querySelector('.field'),
        sendButton = document.querySelector('.send'),
        content =    document.querySelector('.messages'),
        notice =     document.querySelector('.notice'),
        enableNotificationsButton = document.querySelector('.enable-notifications'),

        cmdRegex = /^\/([a-z0-9_-]+)\s?([a-z0-9_-]+)?\s?([a-z0-9_-]+)?$/i,

        // gets nickname from localStorage:
        // return: string nickname, or null if nick hasn't been set yet.
        getNick = function() {
            return localStorage.getItem('name');
        },

        // save nickname on localStorage
        // return: true on success, false otherwise.
        setNick = function (nick) {
            if (nick !== '' && nick !== undefined && nick !== null) { // TODO not necessary!
                localStorage.setItem('name', nick);
                return true;
            }
            return false;
        },

        getId = function() {
            return localStorage.getItem('id');
        },

        setId = function(id) {
            if (id) {
                localStorage.setItem('id', id);
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

            var id   = getId(),
                name = getNick(),
                text = field.value.trim(),
                type = 1,
                time = (new Date()).getTime();

            return {
                id:   id,
                name: name,
                text: text,
                type: type,
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

        // just tells us if the provided text is a command.
        // return: true or false.
        isCommand = function (text) {
            return cmdRegex.test(text);
        },

        // get command name and arguments from the provided text.
        // It assumes that the text is a command.
        // You should call isCommand() before this.
        // return: an object with the command name and its arguments.
        getCommandFrom = function (text) {
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
        // string command the command name.
        // array args the command arguments.
        // return: true on success, false otherwise.
        evaluate = function (command, args) {

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

                    return true;
                }
            } else if (/foo/i.test(command)) {
                alert(args[0]);
                return true;
            } else {
                // not a valid command
                printMessage({
                    name: 'Server',
                    text: command + ' is not a valid command.',
                    type: 0,
                    time: (new Date()).getTime()                    
                });
                return false;
            }
            return false;
        },

        // reads the field.value. if it's empty, it just does nothing.
        // checks whether the field.value is a command. If so, it executes it.
        // else it just searches for emoticons and finally it notifies the server
        // that the user wants to send the message.
        // it also clears the field.value (input tag).
        send = function (data) {

            if (data.text == '') {
                return;
            }

            if (isCommand(data.text)) {

                var command = getCommandFrom(data.text);
                evaluate(command.name, command.args);
                // maybe add here a socket.emit('execute command')
                // where the evaluate() returns true.
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

            // id
            var idHTMLElement = document.createElement('span');
            idHTMLElement.innerHTML = data.id;

            // text
            var textHTMLElement = document.createElement('span');
            textHTMLElement.innerHTML = data.text;

            // time
            var timeHTMLElement = document.createElement('time');
            timeHTMLElement.innerHTML = (new Date()).toLocaleTimeString();


            // append elements to the wrappers
            nicknameWrapperHTMLElement.appendChild(nicknameHTMLElement);
            nicknameWrapperHTMLElement.appendChild(idHTMLElement);
            textWrapperHTMLElement.appendChild(textHTMLElement);
            timeWrapperHTMLElement.appendChild(timeHTMLElement);

            // append wrappers to the .message
            messageHTMLElement.appendChild(nicknameWrapperHTMLElement);
            messageHTMLElement.appendChild(textWrapperHTMLElement);
            messageHTMLElement.appendChild(timeWrapperHTMLElement);

            // append the .message to content
            content.appendChild(messageHTMLElement);
        },

        // generates the HTML element representing a notice, and prints it.
        // object data the message to print.
        // ...
        // updates the innerHTML.
        // users: an array of the users that are currently writing something.
        // return: void
        printNotice = function (users) {

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

        // Scroll to the bottom if user is in the viewport.
        // return: void
        maybeScrollToBottom = function () {
            var content = document.querySelector('.content');
     
            // scrollTop gets or sets the number of pixels
            // that the content of an element is scrolled upward.
            //console.log('scrollTop:    ' + content.scrollTop);
     
            // scrollHeight is the height of the scroll view of an element (in other words, the whole content's height); it includes the element padding but not its margin.
            //console.log('scrollHeight: ' + content.scrollHeight);
     
            // offsetHeight is the height of an element relative to the element's offsetParent. In other words, it's the viewport, and it's constant.
            //console.log('offsetHeight: ' + content.offsetHeight);
            // Warning: clientHeight is the same, but you shouldn't use it, because it's not part of any W3C specification.
     
            // offsetParent returns a reference to the object which is the closest (nearest in the containment hierarchy) positioned containing element.
            // I actually don't need this.
            //console.log(content.offsetParent);
     
            // maxScrollTop is the maximum value scrollTop can assume.
            content.maxScrollTop = content.scrollHeight - content.offsetHeight;

            if (content.maxScrollTop - content.scrollTop <= content.offsetHeight) {
                // setting scrollTop to a high number will bring us to the bottom.
                // setting its value to scrollHeight seems a good idea, because
                // scrollHeight is always higher than scrollTop.
                content.scrollTop = content.scrollHeight;
            }
        }

        // Removes an element from an array.
        // string value the value to search and remove from the array.
        // return: an array with the removed element; false otherwise.
        writingUsers.remove = function(value) {
            var idx = this.indexOf(value);
            if (idx != -1) {
                return this.splice(idx, 1); // The second parameter of splice is the number of elements to remove.
            }
            return false;
        }


    /***** server socket events *****/

    socket.on('connected', function (data) {

        // First of all, let's recognize the user.
        var user = {
            id: data.id
        };

        // store Socket ID in client, for later use
        setId(data.id);

        if (getNick()) { // returning user

            user.name = getNick();
            user.isNewish = false;

        } else { // new user

            // set nickname for the first time
            user.name = generateNick();
            user.isNewish = true;

            // and save it client-side
            setNick(user.name);

        }
        socket.emit('recognizing user', user);
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
            // setNick(user.name);

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
        console.log(data.name + ' disconnected.');
        printMessage({
            name: 'Server',
            text: data.name + ' disconnected.',
            type: 0,
            time: (new Date()).getTime()
        });
    });

    socket.on('message', function (data) {
        // add the message to messages
        // messages.push(data);

        // print it!
        printMessage(data);

        maybeScrollToBottom();

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

        if (data.text == '' || data.text.substring(0,1) == '/') {
            // remove the user if it's in writingUsers
            writingUsers.remove(data.name);

        } else {
            // add the user to writingUsers array, if it isn't in already
            if (writingUsers.indexOf(data.name) == -1) {
                writingUsers.push(data.name);
            }
        }
        // print writingUsers
        printNotice(writingUsers);
    });


    /***** client-side event listeners *****/

    sendButton.addEventListener('click', function () {
        // send it!
        send(message());
        // alerts other users that this user is writing a message
        socket.emit('writing', message());
    }, false);

    field.addEventListener('keyup', function (event) {
        // pressed enter
        if (event.keyCode == 13) {
            send(message());
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
