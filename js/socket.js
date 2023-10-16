export { LocalSocket };


/*************************************************************************************************/
/* LocalSocket                                                                                   */
/*************************************************************************************************/

class LocalSocket {
    constructor(state, model, dispatcher) {
        this.state = state;
        this.model = model;
        this.dispatcher = dispatcher;

        this.socket = new WebSocket("ws://localhost:8765");
        this.open = false;

        this.socket.onopen = (event) => {
            console.log("Connected to the server.");
            this.open = true;
        };

        this.socket.onmessage = (event) => {
            const receivedMessage = event.data;
            console.log(`Received: ${receivedMessage}`);
        };

        this.socket.onclose = (event) => {
            if (event.wasClean) {
                console.warn(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                console.warn("Connection abruptly closed.");
            }
            this.open = false;
        };

        this.setupDispatcher();
    }

    setupDispatcher() {
        this.dispatcher.on('data', (ev) => {
            this.send({ event: 'data', ev: ev });
        });

        this.dispatcher.on('feature', (ev) => {
            this.send({ event: 'feature', ev: ev });
        });
    }

    send(msg) {
        if (this.open) {
            console.log(`sending message to websocket`);  //, msg);
            this.socket.send(JSON.stringify(msg));
        }
    }
};
