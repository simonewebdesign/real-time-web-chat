# Real Time Chat With NodeJS, Socket.io and ExpressJS

## Features essenziali

- **User Is Writing**

- **Emoticons**: copiate da skype, parsing della stringa text tramite regex;
se uno dei match contiene una delle keywords delle emoticon fare
il replace delle stesse con le immagini delle emoticons.

- **Orario invio messaggi**: stampa l'orario nel formato hh:mm.

- **Desktop notifications**

- **Salvataggio messaggi**: con l'utilizzo del localStorage o di IndexedDB. In alternativa uso di db NoSQL.

Probabilmente la scelta migliore ricade sul localStorage: si potrebbe settare
un massimo di lunghezza sull'array messages, e quando si raggiunge tale limite
si smette di salvare i messaggi. Questo puo` rivelarsi utile anche per
risparmiare memoria durante l'uso dell'applicazione, rimuovendo i messaggi 
troppo vecchi. In questo modo si evita pure di dover rimuovere i messaggi ogni
tot tempo... cosa non molto fattibile.

- **Grafica**: costruire layout di base che prende il 100% delle dimensioni del browser.

## Features opzionali (future)

- **Pulsante Opzioni** per cambiare: colore sfondo, font, colore font, dimensione globale font (implementato lato client), colore di fondo del testo, suoni 'toggle sounds' (abilitare o disabilitare);

--

This application is Open Source software released under the [MIT license](http://opensource.org/licenses/MIT). Kudos to [Nettuts+](http://net.tutsplus.com/tutorials/javascript-ajax/real-time-chat-with-nodejs-socket-io-and-expressjs/).
