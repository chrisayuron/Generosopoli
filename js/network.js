// ── PEER.JS - CONFIGURACIÓN ──────────────────────────────────────────────

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
    p.on("open", function () { res(p); });
    p.on("error", function (e) { rej(e); });
    peer = p;
  });
}

// ── CREAR SALA ───────────────────────────────────────────────────────────

window.createRoom = async function () {
  var name = document.getElementById("host-name").value.trim();
  if (!name) return showToast("Ingresa tu nombre");
  var btn = document.getElementById("btn-create");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

  try {
    roomCode = genCode();
    await setupPeer(roomCode);
    isHost = true;
    G.players.push({
      id: 0, name: name, color: PC[0], money: INIT_MONEY,
      position: 0, inJail: false, jailTurns: 0,
      properties: [], eliminated: false, laps: 0
    });
    myId = 0;
    peer.on("connection", function (cn) {
      cn.on("open", function () {
        cn.on("data", function (d) { handleCM(d, cn); });
        cn.on("close", function () { handleDC(cn); });
      });
    });
    document.getElementById("room-code-display").textContent = roomCode;
    document.getElementById("room-info").style.display = "block";
    btn.style.display = "none";
    renderHPL();
  } catch (e) {
    showToast("Error: " + (e.type || e.message));
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Crear Sala';
  }
};

// ── UNIRSE A SALA ────────────────────────────────────────────────────────

window.joinRoom = async function () {
  var name = document.getElementById("join-name").value.trim();
  var code = document.getElementById("join-code").value.trim().toUpperCase();
  if (!name) return showToast("Ingresa tu nombre");
  if (!code) return showToast("Ingresa el código");
  var btn = document.getElementById("btn-join");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
  var st = document.getElementById("join-status");
  st.textContent = "Conectando...";

  try {
    await setupPeer();
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
  } catch (e) {
    st.innerHTML = '<span style="color:#e63946">Error: ' + (e.type || e.message) + "</span>";
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Unirse';
  }
};

// ── MANEJO DE CONEXIONES ─────────────────────────────────────────────────

function handleDC(cn) {
  var pid = connReverseMap.get(cn);
  if (pid !== undefined) {
    delete connMap[pid];
    connReverseMap.delete(cn);
    if (G.players[pid]) {
      G.players[pid].eliminated = true;
      addLog(G.players[pid].name + " desconectado.", true);
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
    G.players.push({
      id: pid, name: msg.name, color: PC[pid], money: INIT_MONEY,
      position: 0, inJail: false, jailTurns: 0,
      properties: [], eliminated: false, laps: 0
    });
    connMap[pid] = cn;
    connReverseMap.set(cn, pid);
    cn.send({ type: "assigned", pid: pid, color: PC[pid] });
    addLog(msg.name + " se unió.", true);
    renderHPL();
    syncNow();
  }
  if (msg.type === "action") processAction(msg.action, msg.pid, msg.data);
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

function broadcastState() {
  var s = getSS(), k = Object.keys(connMap);
  for (var i = 0; i < k.length; i++) {
    var c = connMap[k[i]];
    if (c && c.open) {
      try { c.send({ type: "state", data: s }); } catch (e) {}
    }
  }
}

function sendToHost(m) {
  if (hostConn && hostConn.open) {
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
  if (peer) peer.destroy();
});
