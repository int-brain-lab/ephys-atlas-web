export { LocalSocket };


/*************************************************************************************************/
/* LocalSocket                                                                                   */
/*************************************************************************************************/

class LocalSocket {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;
        this.el = document.getElementById('connect-status');

        this.createSocket();
        this.setupDispatcher();
    }

    createSocket() {
        this.socket = new WebSocket("ws://localhost:8765");
        this.open = false;

        // On Open.
        this.socket.onopen = (event) => {
            console.log("connected to the server.");
            this.open = true;

            this.el.classList.remove('connected', 'disconnected');
            this.el.classList.add('connected');
            this.el.querySelector('.text').textContent = 'connected';
            this.el.querySelector('.icon').textContent = '✔';
        };

        // On Close.
        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.warn(`connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                console.warn("connection abruptly closed.");
            }
            this.open = false;

            this.el.classList.add('disconnected');
            this.el.querySelector('.text').textContent = 'disconnected';
            this.el.querySelector('.icon').textContent = '✖';
        };

        this.socket.onmessage = (event) => {
            const receivedMessage = event.data;
            console.log(`Received: ${receivedMessage}`);
        };
    }

    setupDispatcher() {
        this.dispatcher.on('connect', (ev) => {
            this.createSocket();
        });

        this.dispatcher.on('data', (ev) => {
            this.send({ event: 'data', ev: ev });
        });

        this.dispatcher.on('feature', (ev) => {
            this.send({ event: 'feature', ev: ev });
        });
    }

    send(msg) {
        if (this.open) {
            console.log(`sending message to websocket`);
            this.socket.send(JSON.stringify(msg));
        }
    }
};
