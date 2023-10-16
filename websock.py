import asyncio
import json
from functools import wraps

import websockets


class WebSocketServer:
    def __init__(self, host='localhost', port=8765):
        self.host = host
        self.port = port
        self.data_storage = {}
        self.callbacks = {}

    async def handle_client(self, websocket, path):
        while True:
            async for message in websocket:
                try:
                    msg = json.loads(message)
                except json.JSONDecodeError:
                    print("Received a non-JSON message")

                ev_name = msg.get('event', None)
                ev = msg.get('ev', {})

                if ev_name == 'data':
                    data_name = ev["name"]
                    data_key = ev["key"]
                    data_value = ev["data"]
                    if not data_name or not data_value:
                        continue
                    if data_name not in self.data_storage:
                        self.data_storage[data_name] = {}

                    d = self.data_storage[data_name]
                    d[data_key] = data_value
                else:
                    cbs = self.callbacks.get(ev_name, [])
                    for cb in cbs:
                        cb(**ev)

    def get_data(self, name, key=None):
        return self.data_storage.get(name, {}).get(key or name, None)

    def on(self, event_name, func=None):
        if func:
            if event_name not in self.callbacks:
                self.callbacks[event_name] = []
            cbs = self.callbacks[event_name]
            cbs.append(func)
        else:
            def wrapper(func):
                return self.on(event_name, func=func)
            return wrapper

    async def start_server(self):
        async with websockets.serve(self.handle_client, self.host, self.port):
            await asyncio.Future()


if __name__ == "__main__":
    server = WebSocketServer()

    @server.on("feature")
    def on_feature(fname=None, isVolume=None):
        print(f"selected feature {fname}")
        colors = server.get_data('regionColors', fname)

    asyncio.run(server.start_server())
