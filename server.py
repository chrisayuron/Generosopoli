#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor local para Generosopoly:
sirve los archivos estaticos y un relay WebSocket para el modo local de pruebas
(funciona entre ventana normal e incognito del navegador).

Uso:  python server.py [puerto]    (puerto por defecto: 8080)
"""
import base64
import hashlib
import http.server
import json
import os
import socketserver
import struct
import sys
import threading

os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

ROOMS = {}
SOCK_ROOM = {}
LOCK = threading.Lock()


def register(sock, room):
    with LOCK:
        SOCK_ROOM[sock] = room
        ROOMS.setdefault(room, set()).add(sock)


def unregister(sock):
    with LOCK:
        room = SOCK_ROOM.pop(sock, None)
        if room:
            s = ROOMS.get(room)
            if s:
                s.discard(sock)
                if not s:
                    del ROOMS[room]


def send_frame(sock, payload, opcode=0x1):
    hdr = struct.pack("!B", 0x80 | opcode)
    n = len(payload)
    if n < 126:
        hdr += struct.pack("!B", n)
    elif n < 65536:
        hdr += struct.pack("!BH", 126, n)
    else:
        hdr += struct.pack("!BQ", 127, n)
    sock.sendall(hdr + payload)


def recv_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("socket cerrado")
        buf += chunk
    return buf


def recv_frame(sock):
    hdr = recv_exact(sock, 2)
    b1, b2 = hdr[0], hdr[1]
    opcode = b1 & 0x0F
    length = b2 & 0x7F
    masked = b2 & 0x80
    if length == 126:
        length = struct.unpack("!H", recv_exact(sock, 2))[0]
    elif length == 127:
        length = struct.unpack("!Q", recv_exact(sock, 8))[0]
    mask = recv_exact(sock, 4) if masked else None
    payload = bytearray(recv_exact(sock, length)) if length else bytearray()
    if masked:
        for i in range(len(payload)):
            payload[i] ^= mask[i % 4]
    return opcode, bytes(payload)


def relay(room, data):
    payload = json.dumps({"room": room, "data": data}, ensure_ascii=False).encode("utf-8")
    with LOCK:
        socks = list(ROOMS.get(room, ()))
    for s in socks:
        try:
            send_frame(s, payload)
        except Exception:
            pass


class WSRelayHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stdout.write("[server] " + (fmt % args) + "\n")

    def do_GET(self):
        if self.path.rstrip("/") == "/ws" or self.path.startswith("/ws?"):
            self.handle_ws()
            return
        super().do_GET()

    def handle_ws(self):
        key = self.headers.get("Sec-WebSocket-Key")
        if not key or self.headers.get("Upgrade", "").lower() != "websocket":
            self.send_error(400)
            return
        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        sock = self.connection
        sock.settimeout(600)
        sock.sendall(
            (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
            ).encode()
        )
        try:
            while True:
                opcode, payload = recv_frame(sock)
                if opcode is None:
                    break
                if opcode == 0x8:  # close
                    try:
                        send_frame(sock, b"", 0x8)
                    except Exception:
                        pass
                    break
                if opcode == 0x9:  # ping -> pong
                    try:
                        send_frame(sock, payload, 0xA)
                    except Exception:
                        pass
                    continue
                if opcode == 0x1:  # texto
                    try:
                        data = json.loads(payload.decode("utf-8"))
                    except Exception:
                        continue
                    room = data.get("room")
                    if room:
                        if sock not in SOCK_ROOM:
                            register(sock, room)
                        relay(room, data.get("data"))
        except Exception:
            pass
        finally:
            unregister(sock)
            self.close_connection = True


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    server = ThreadingServer(("0.0.0.0", PORT), WSRelayHandler)
    print("Generosopoly local en http://localhost:%d  (Ctrl+C para detener)" % PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass