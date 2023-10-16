import asyncio
import json
from pprint import pprint

import websockets


async def websocket_handler(websocket, path):
    while True:
        msg = await websocket.recv()
        msg = json.loads(msg)
        pprint(msg)


if __name__ == "__main__":
    # Replace with your desired host and port.
    start_server = websockets.serve(websocket_handler, "localhost", 8765)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
