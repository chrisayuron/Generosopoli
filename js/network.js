// ── UTILIDADES DE SEGURIDAD ──────────────────────────────────────────────

function sanitize(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeName(name) {
  if (typeof name !== "string") return "Jugador";
  return sanitize(name.trim().substring(0, 12)) || "Jugador";
}

// ── TRANSPORTE ───────────────────────────────────────────────────────────
// local : WebSocket relay (server.py) o BroadcastChannel - para pruebas en localhost
// peer  : PeerJS (WebRTC) - para jugar entre dispositivos distintos (producción)

var netTransport = "none";
var wsSocket = null;
var bcChannel = null;
var localName = "";

function isLocalHost() {
  var h = location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function wsURL() {
  var proto = location.protocol === "https:" ? "wss:" : "ws:";
  return proto + "//" + location.host + "/ws";
}

function localSend(data) {
  if (netTransport === "ws" && wsSocket && wsSocket.readyState === 1) {
    try { wsSocket.send(JSON.stringify({ room: roomCode, data: data })); } catch (e) {}
  } else if (netTransport === "bc" && bcChannel) {
    try { bcChannel.postMessage(data); } catch (e) {}
  }
}

function initLocalTransport() {
  return new Promise(function (res, rej) {
    var settled = false;
    var ws = null;
    try { ws = new WebSocket(wsURL()); } catch (e) { ws = null; }

    function fallbackBC() {
      if (settled) return;
      try {
        bcChannel = new BroadcastChannel("genoro-" + roomCode);
        netTransport = "bc";
        settled = true;
        res();
      } catch (e) { rej(e); }
    }

    if (!ws) { fallbackBC(); return; }

    ws.onopen = function () {
      settled = true;
      netTransport = "ws";
      wsSocket = ws;
      res();
    };
    ws.onerror = function () { fallbackBC(); };
    ws.onclose = function () { fallbackBC(); };
    setTimeout(function () { if (!settled) { try { ws.close(); } catch (e) {} fallbackBC(); } }, 5000);
  });
}

// ── PEER.JS (producción / dispositivos distintos) ────────────────────────

function setupPeer(id) {
  return new Promise(function (res, rej) {
    var cfg = {
      debug: 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      }
    };
    var p = id ? new Peer("geno-" + id, cfg) : new Peer(undefined, cfg);
    p.on("open", function (pid) { res(p); });
    p.on("error", function (e) { rej(e); });
    peer = p;
  });
}

// ── CREAR SALA ───────────────────────────────────────────────────────────

window.createRoom = async function () {
  var rawName = document.getElementById("host-name").value.trim();
  if (!rawName) return showToast("Ingresa tu nombre");
  var name = sanitizeName(rawName);
  var btn = document.getElementById("btn-create");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

  try {
    roomCode = genCode();
    if (isLocalHost()) {
      await initLocalTransport();
    } else {
      await setupPeer(roomCode);
      netTransport = "peer";
    }
    isHost = true;
    myId = 0;
    G.players.push({
      id: 0, name: name, color: PC[0], money: INIT_MONEY,
      position: 0, inJail: false, jailTurns: 0,
      properties: [], eliminated: false, laps: 0
    });
    registerHostInbound();
    if (wsSocket && wsSocket.readyState === 1) localSend({ kind: "hello" });
    document.getElementById("room-code-display").textContent = roomCode;
    document.getElementById("room-info").style.display = "block";
    btn.style.display = "none";
    renderHPL();
  } catch (e) {
    showToast("Error: no se pudo crear la sala");
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Crear Sala';
  }
};

// ── UNIRSE A SALA ────────────────────────────────────────────────────────

window.joinRoom = async function () {
  var rawName = document.getElementById("join-name").value.trim();
  var code = document.getElementById("join-code").value.trim().toUpperCase();
  if (!rawName) return showToast("Ingresa tu nombre");
  if (!code) return showToast("Ingresa el código");
  var name = sanitizeName(rawName);
  localName = name;
  var btn = document.getElementById("btn-join");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
  var st = document.getElementById("join-status");
  st.textContent = "Conectando...";
  roomCode = code;

  try {
    if (isLocalHost()) {
      myId = -1;
      await initLocalTransport();
      registerClientInbound();
      localSend({ kind: "join", name: name });
      st.textContent = "Esperando al host...";
    } else {
      await setupPeer();
      netTransport = "peer";
      hostConn = peer.connect("geno-" + code, { reliable: true });
      hostConn.on("open", function () {
        hostConn.send({ type: "join", name: name });
        st.textContent = "Esperando al host...";
      });
      hostConn.on("data", function (d) {
        if (d.type === "assigned") {
          myId = d.pid;
          st.innerHTML = '<span style="color:#2a9d8f"><i class="fas fa-check-circle"></i> Conectado como ' + name + '</span><br><span style="font-size:11px;color:var(--muted)">Esperando inicio...</span>';
        }
        if (d.type === "state") applyState(d.data);
        if (d.type === "error") {
          st.innerHTML = '<span style="color:#e63946">' + d.msg + "</span>";
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Unirse';
        }
      });
      hostConn.on("close", function () {
        st.innerHTML = '<span style="color:#e63946">Conexión perdida.</span>';
      });
      hostConn.on("error", function (e) {
        var err = "Error: " + (e.type || "Desconocido");
        if (e.type === "peer-unavailable") err = "Sala no encontrada.";
        st.innerHTML = '<span style="color:#e63946">' + err + "</span>";
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Unirse';
      });
    }
  } catch (e) {
    st.innerHTML = '<span style="color:#e63946">Error: ' + (e.message || "No se pudo conectar") + "</span>";
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Unirse';
  }
};

// ── ENTRADA DE MENSAJES (host) ───────────────────────────────────────────

function registerHostInbound() {
  if (wsSocket) {
    wsSocket.onmessage = function (e) {
      try { hostLocalInbound(JSON.parse(e.data).data); } catch (err) {}
    };
  } else if (bcChannel) {
    bcChannel.onmessage = function (e) { hostLocalInbound(e.data); };
  } else if (peer) {
    peer.on("connection", function (cn) {
      cn.on("open", function () {
        cn.on("data", function (d) { handleCM(d, cn); });
        cn.on("close", function () { handleDC(cn); });
      });
      cn.on("error", function () {});
    });
  }
}

function hostLocalInbound(data) {
  if (!data) return;
  if (data.kind === "hello" || data.kind === "action" || data.kind === "unicast") return;

  if (data.kind === "join") {
    var pid = G.players.length;
    if (pid >= 4) return;
    var safeName = sanitizeName(data.name);
    G.players.push({
      id: pid, name: safeName, color: PC[pid], money: INIT_MONEY,
      position: 0, inJail: false, jailTurns: 0,
      properties: [], eliminated: false, laps: 0
    });
    var proxy = {
      _pid: pid,
      open: true,
      send: function (m) { localSend({ kind: "unicast", to: pid, msg: m }); }
    };
    connMap[pid] = proxy;
    localSend({ kind: "unicast", to: pid, msg: { type: "assigned", pid: pid, color: PC[pid] } });
    addLog(safeName + " se unió.", true);
    renderHPL();
    syncNow();
  } else if (data.kind === "leave") {
    var lp = data.pid;
    if (lp === undefined || lp === 0 || !connMap[lp]) return;
    delete connMap[lp];
    if (G.players[lp]) {
      G.players[lp].eliminated = true;
      addLog(G.players[lp].name + " desconectado.", true);
      updateConnectionStatus("disconnected", "Jugador desconectado");
      if (G.phase === "playing" && G.currentPlayer === lp) endTurn();
      syncNow();
    }
  }
}

// ── ENTRADA DE MENSAJES (cliente) ────────────────────────────────────────

function registerClientInbound() {
  if (wsSocket) {
    wsSocket.onmessage = function (e) {
      try { clientLocalInbound(JSON.parse(e.data).data); } catch (err) {}
    };
  } else if (bcChannel) {
    bcChannel.onmessage = function (e) { clientLocalInbound(e.data); };
  }
}

function clientLocalInbound(data) {
  if (!data || data.kind !== "unicast") return;
  var m = data.msg;
  if (!m) return;
  if (m.type === "assigned" && myId === -1) {
    myId = m.pid;
    var st = document.getElementById("join-status");
    if (st) st.innerHTML = '<span style="color:#2a9d8f"><i class="fas fa-check-circle"></i> Conectado como ' + localName + '</span><br><span style="font-size:11px;color:var(--muted)">Esperando inicio...</span>';
    return;
  }
  if (data.to !== undefined && data.to !== myId) return;
  if (m.type === "state") {
    applyState(m.data);
  } else if (m.type === "error") {
    var st2 = document.getElementById("join-status");
    if (st2) st2.innerHTML = '<span style="color:#e63946">' + m.msg + "</span>";
    var btn = document.getElementById("btn-join");
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Unirse'; }
  }
}

// ── PEER: MANEJO DE CONEXIONES (producción) ──────────────────────────────

function handleDC(cn) {
  var pid = cn._pid;
  if (pid !== undefined) {
    delete connMap[pid];
    if (G.players[pid]) {
      G.players[pid].eliminated = true;
      addLog(G.players[pid].name + " desconectado.", true);
      updateConnectionStatus("disconnected", "Jugador desconectado");
      if (G.phase === "playing" && G.currentPlayer === pid) endTurn();
      syncNow();
    }
  }
}

function handleCM(msg, cn) {
  if (msg.type === "join") {
    var pid = G.players.length;
    if (pid >= 4) {
      cn.send({ type: "error", msg: "Sala llena (máximo 4 jugadores)" });
      return;
    }
    var safeName = sanitizeName(msg.name);
    G.players.push({
      id: pid, name: safeName, color: PC[pid], money: INIT_MONEY,
      position: 0, inJail: false, jailTurns: 0,
      properties: [], eliminated: false, laps: 0
    });
    connMap[pid] = cn;
    cn._pid = pid;
    cn.send({ type: "assigned", pid: pid, color: PC[pid] });
    addLog(safeName + " se unió.", true);
    renderHPL();
    syncNow();
  }
  if (msg.type === "action") {
    var senderPid = cn._pid;
    if (senderPid === undefined) return;
    if (typeof msg.pid !== "number" || msg.pid !== senderPid) return;
    processAction(msg.action, msg.pid, msg.data);
  }
}

function updateConnectionStatus(status, text) {
  var el = document.getElementById("connection-status");
  var txt = document.getElementById("conn-text");
  if (!el || !txt) return;
  el.className = "connection-status" + (status !== "connected" ? " " + status : "");
  txt.textContent = text;
}

function renderHPL() {
  var el = document.getElementById("player-list-host"), h = "";
  for (var i = 0; i < G.players.length; i++) {
    var p = G.players[i];
    h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px">' +
      '<div style="width:12px;height:12px;border-radius:50%;background:' + p.color + '"></div>' +
      p.name + (p.id === 0 ? " (Host)" : "") + "</div>";
  }
  el.innerHTML = h;
  document.getElementById("btn-start").disabled = G.players.length < 2;
}

// ── INICIAR JUEGO ────────────────────────────────────────────────────────

window.startGame = function () {
  if (G.players.length < 2) return;
  G.phase = "playing";
  G.endCondition = document.getElementById("end-cond").value;
  if (G.endCondition.startsWith("timer")) {
    G.timeRemaining = parseInt(G.endCondition.split("-")[1]) * 60;
  } else {
    G.targetLaps = parseInt(G.endCondition.split("-")[1]);
  }
  G.gameStartTime = Date.now();
  G.cofreIndex = Math.floor(Math.random() * CC.length);
  G.faltaIndex = Math.floor(Math.random() * CF.length);

  document.getElementById("lobby").style.display = "none";
  document.getElementById("game").classList.add("active");
  buildBoard();

  var mc = document.getElementById("modal-content");
  mc.innerHTML = '<h2><i class="fas fa-book" style="margin-right:8px"></i>Reglamento de Generosopoly</h2>' +
    RULES_HTML +
    '<div style="margin-top:20px"><button class="btn btn-primary" onclick="closeModal()" style="width:100%"><i class="fas fa-check"></i> He leído las reglas - ¡A jugar!</button></div>';
  document.getElementById("modal").classList.add("active");

  addLog("¡El juego ha comenzado!", true);
  addLog("Turno de: " + G.players[0].name, true, {
    pid: 0, icon: "fa-flag-checkered",
    you: "¡Es tu turno!",
    other: "Turno de {name}"
  });

  if (G.endCondition.startsWith("timer")) {
    document.getElementById("sb-timer").style.display = "block";
    G.timerInterval = setInterval(function () {
      G.timeRemaining--;
      renderTimer();
      if (G.timeRemaining <= 0) {
        clearInterval(G.timerInterval);
        endGame();
      }
    }, 1000);
  }

  localSnap = {
    players: G.players.map(function (p) {
      return { position: p.position, money: p.money, inJail: p.inJail };
    }),
    currentPlayer: G.currentPlayer,
    turnPhase: G.turnPhase,
    dice: G.dice.slice(),
    logLen: G.log.length,
    communityFund: G.communityFund,
    auction: null
  };
  syncNow();
};

// ── BROADCAST Y RECEPCIÓN DE ESTADO ──────────────────────────────────────

var lastBroadcastState = null;

function broadcastState() {
  var s = getSS();
  var sStr = JSON.stringify(s);
  if (sStr === lastBroadcastState) return;
  lastBroadcastState = sStr;
  var k = Object.keys(connMap);
  for (var i = 0; i < k.length; i++) {
    var c = connMap[k[i]];
    if (c && c.open) {
      try { c.send({ type: "state", data: s }); } catch (e) {}
    }
  }
}

function sendToHost(m) {
  if (netTransport === "ws" || netTransport === "bc") {
    localSend({ kind: "action", pid: myId, msg: m });
  } else if (hostConn && hostConn.open) {
    try { hostConn.send(m); } catch (e) {}
  }
}

function applyState(d) {
  var wasL = G.phase === "lobby";
  var prevSnap = localSnap;
  var prevSnapStr = JSON.stringify(prevSnap);

  G.phase = d.phase;
  G.players = d.players;
  G.properties = d.properties;
  G.volunteers = d.volunteers || {};
  G.mortgaged = d.mortgaged || {};
  G.communityFund = d.communityFund;
  G.currentPlayer = d.currentPlayer;
  G.turnPhase = d.turnPhase;
  G.dice = d.dice;
  G.doublesCount = d.doublesCount;
  G.cofreIndex = d.cofreIndex;
  G.faltaIndex = d.faltaIndex;
  G.log = d.log;
  G.endCondition = d.endCondition;
  G.timeRemaining = d.timeRemaining;
  G.targetLaps = d.targetLaps;
  G.gameStartTime = d.gameStartTime;
  G.auction = d.auction;
  G.currentSpace = d.currentSpace || 0;
  G.skipNextTurn = d.skipNextTurn || {};
  G.pendingCard = d.pendingCard || null;
  G.pendingReflection = d.pendingReflection || null;
  G.pendingTrade = d.pendingTrade || null;
  G.lastMoveType = d.lastMoveType || "forward";

  var newSnap = {
    players: G.players.map(function (p) {
      return { position: p.position, money: p.money, inJail: p.inJail };
    }),
    currentPlayer: G.currentPlayer,
    turnPhase: G.turnPhase,
    dice: G.dice.slice(),
    logLen: G.log.length,
    communityFund: G.communityFund,
    auction: G.auction ? JSON.stringify(G.auction) : null,
    lastMoveType: G.lastMoveType
  };
  var newSnapStr = JSON.stringify(newSnap);

  if (G.phase === "playing" && wasL) {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("game").classList.add("active");
    buildBoard();
    if (G.endCondition.startsWith("timer")) {
      document.getElementById("sb-timer").style.display = "block";
    }
    var mc = document.getElementById("modal-content");
    mc.innerHTML = '<h2><i class="fas fa-book" style="margin-right:8px"></i>Reglamento de Generosopoly</h2>' +
      RULES_HTML +
      '<div style="margin-top:20px"><button class="btn btn-primary" onclick="closeModal()" style="width:100%"><i class="fas fa-check"></i> He leído las reglas - ¡A jugar!</button></div>';
    document.getElementById("modal").classList.add("active");
    localSnap = newSnap;
    renderAll();
    return;
  }

  if (G.phase === "ended") {
    showEndGame();
    renderAll();
    return;
  }

  if (prevSnapStr !== newSnapStr && !wasL) {
    try { clientDetectChanges(prevSnap, newSnap); } catch (e) {}
  }
  localSnap = newSnap;
  renderAll();
}

function clientDetectChanges(prev, curr) {
  if (prev.dice[0] !== curr.dice[0] || prev.dice[1] !== curr.dice[1]) {
    if (curr.dice[0] > 0 && curr.dice[1] > 0) {
      var rp = G.players[curr.currentPlayer];
      clientAnimateDice(curr.dice[0], curr.dice[1], rp ? rp.name : "");
    }
  }
  for (var i = 0; i < Math.min(prev.players.length, curr.players.length); i++) {
    if (prev.players[i].position !== curr.players[i].position && !curr.players[i].eliminated) {
      clientAnimateMove(G.players[i].id, prev.players[i].position, curr.players[i].position, curr.lastMoveType);
      break;
    }
  }
}

// ── LIMPIEZA ─────────────────────────────────────────────────────────────

window.addEventListener("beforeunload", function () {
  if (netTransport === "ws") {
    try { wsSocket.send(JSON.stringify({ room: roomCode, data: { kind: "leave", pid: myId } })); } catch (e) {}
    try { wsSocket.close(); } catch (e) {}
  } else if (netTransport === "bc") {
    try { bcChannel.postMessage({ kind: "leave", pid: myId }); bcChannel.close(); } catch (e) {}
  }
  if (peer) peer.destroy();
});