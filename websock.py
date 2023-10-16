import asyncio
from contextlib import contextmanager
import json
import threading

import numpy as np
import matplotlib.pyplot as plt
import websockets

from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas


class WebSocketServer:
    def __init__(self, host='localhost', port=8765):
        self.host = host
        self.port = port
        self.data_storage = {}
        self.callbacks = {}

        self.websocket_server = None

    async def handle_client(self, websocket, path):
        self.websocket_server = websocket
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


class MatplotlibPlotter(QMainWindow):
    def __init__(self):
        super().__init__()

        self.central_widget = QWidget(self)
        self.setCentralWidget(self.central_widget)

        self.layout = QVBoxLayout(self.central_widget)
        self.figure = plt.Figure()
        self.canvas = FigureCanvas(self.figure)
        self.layout.addWidget(self.canvas)


class MatplotlibServer:
    def __init__(self):
        self.server = WebSocketServer()

        self.app = QApplication([])
        self.event_loop = asyncio.get_event_loop()

        self.plotter = MatplotlibPlotter()
        self.ax = self.plotter.figure.subplots()

    def on(self, event_name, func=None):
        return self.server.on(event_name, func=func)

    def get_data(self, name, key=None):
        return self.server.get_data(name, key=key)

    @contextmanager
    def make_plot(self):
        self.ax.clear()
        yield self.ax
        self.plotter.canvas.draw()

    def run(self):
        websocket_thread = threading.Thread(target=lambda: asyncio.run(self.server.start_server()))
        websocket_thread.daemon = True
        websocket_thread.start()

        self.plotter.show()
        self.app.exec()


if __name__ == "__main__":
    server = MatplotlibServer()

    @server.on("feature")
    def on_feature(fname=None, isVolume=None):
        print(f"selected feature {fname}")

        # Get the data.
        colors = server.get_data('regionColors', fname)
        values = server.get_data('regionValues', fname)
        if values is None:
            return

        # Make a plot.
        values = {d['idx']: d['normalized'] for d in values.values()}
        arr = list(values.values())

        with server.make_plot() as ax:
            ax.hist(arr, bins=50, alpha=0.75)
            ax.set_xlabel('Values')
            ax.set_ylabel('Frequency')
            ax.set_title('Histogram')

    server.run()
