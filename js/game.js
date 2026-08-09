// ── ESTADO DEL JUEGO ──────────────────────────────────────────────────────
var G = {
  phase: "lobby",
  players: [],
  properties: {},
  volunteers: {},
  communityFund: 0,
  currentPlayer: 0,
  turnPhase: "roll",
  dice: [0, 0],
  doublesCount: 0,
  cofreIndex: 0,
  faltaIndex: 0,
  log: [],
  endCondition: "timer-30",
  timeRemaining: 1800,
  targetLaps: 0,
  gameStartTime: 0,
  timerInterval: null,
  auction: null,
  currentSpace: 0,
  skipNextTurn: {},
  pendingCard: null,
  pendingReflection: null,
  pendingTrade: null,
  lastMoveType: "forward"
};

var localSnap = {
  players: [],
  currentPlayer: -1,
  turnPhase: "",
  dice: [0, 0],
  logLen: 0,
  communityFund: 0,
  auction: null
};

var myId = -1, isHost = false, peer = null, hostConn = null;
var roomCode = "", connMap = {}, connReverseMap = new WeakMap();
var processing = false;

// ── UTILIDADES ────────────────────────────────────────────────────────────

function genCode() {
  var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = "";
  for (var i = 0; i < 4; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

function showToast(m, icon) {
  var t = document.getElementById("toast");
  t.innerHTML = (icon ? '<i class="fas ' + icon + '"></i>' : '') + m;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 3200);
}

function addLog(m, imp, toast) {
  G.log.push({ msg: m, imp: !!imp, toast: toast || null });
  if (G.log.length > 100) G.log.shift();
  renderLog();
}

var lastToastLen = null;

function processToasts() {
  if (lastToastLen === null) { lastToastLen = G.log.length; return; }
  if (G.log.length > lastToastLen) {
    for (var i = lastToastLen; i < G.log.length; i++) {
      var e = G.log[i];
      if (e && e.toast) {
        var t = e.toast, text;
        if (t.pid === myId) text = t.you;
        else if (t.pid2 !== undefined && t.pid2 === myId) text = t.you2;
        else {
          var p = G.players[t.pid];
          text = (t.other || "").split("{name}").join(p ? p.name : "");
        }
        if (text) showToast(text, t.icon);
      }
    }
  }
  lastToastLen = G.log.length;
}

function syncNow() {
  if (isHost) broadcastState();
  renderAll();
}

function getSpacePos(i) {
  if (i <= 10) return { r: 11, c: i + 1, side: "bottom", lr: false };
  if (i <= 19) return { r: 11 - (i - 10), c: 11, side: "right", lr: true };
  if (i <= 30) return { r: 1, c: 11 - (i - 20), side: "top", lr: false };
  return { r: i - 29, c: 1, side: "left", lr: true };
}

function isCorner(i) {
  return i === 0 || i === 10 || i === 20 || i === 30;
}

function nextActive(f) {
  var n = (f + 1) % G.players.length, s = 0;
  while (G.players[n].eliminated && s < G.players.length) {
    n = (n + 1) % G.players.length;
    s++;
  }
  return n;
}

// ── HELPERS VOLUNTARIOS ──────────────────────────────────────────────────

function getAporte(spaceId) {
  var sp = BOARD[spaceId];
  if (!sp || sp.type !== "property") return 0;
  var lv = G.volunteers[spaceId] || 0;
  var table = VOL_APORTES[sp.group];
  if (!table) return sp.aporte;
  return table[Math.min(lv, 5)];
}

function canBuyVol(pid, spaceId) {
  var sp = BOARD[spaceId];
  if (!sp || sp.type !== "property") return false;
  if (G.properties[spaceId] !== pid) return false;
  var lv = G.volunteers[spaceId] || 0;
  if (lv >= 5) return false;
  var grp = sp.group;
  var grpSpaces = [];
  for (var i = 0; i < BOARD.length; i++) {
    if (BOARD[i].type === "property" && BOARD[i].group === grp) grpSpaces.push(i);
  }
  for (var j = 0; j < grpSpaces.length; j++) {
    if (G.properties[grpSpaces[j]] !== pid) return false;
  }
  return G.players[pid].money >= VOL_COST[grp];
}

function volCostLabel(spaceId) {
  var sp = BOARD[spaceId];
  if (!sp) return 0;
  return VOL_COST[sp.group] || 0;
}

function volNextLabel(spaceId) {
  var lv = G.volunteers[spaceId] || 0;
  return lv < 4 ? "Voluntario " + (lv + 1) : "ONG de Apoyo";
}

// ── ESTADO SERIALIZADO ───────────────────────────────────────────────────

function getSS() {
  return {
    phase: G.phase,
    players: G.players.map(function (p) {
      return {
        id: p.id, name: p.name, color: p.color, money: p.money,
        position: p.position, inJail: p.inJail, jailTurns: p.jailTurns,
        properties: p.properties.slice(), eliminated: p.eliminated, laps: p.laps
      };
    }),
    properties: JSON.parse(JSON.stringify(G.properties)),
    volunteers: JSON.parse(JSON.stringify(G.volunteers)),
    communityFund: G.communityFund,
    currentPlayer: G.currentPlayer,
    turnPhase: G.turnPhase,
    dice: G.dice.slice(),
    doublesCount: G.doublesCount,
    cofreIndex: G.cofreIndex,
    faltaIndex: G.faltaIndex,
    log: G.log.map(function (l) { return { msg: l.msg, imp: l.imp, toast: l.toast || null }; }),
    endCondition: G.endCondition,
    timeRemaining: G.timeRemaining,
    targetLaps: G.targetLaps,
    gameStartTime: G.gameStartTime,
    currentSpace: G.currentSpace,
    skipNextTurn: JSON.parse(JSON.stringify(G.skipNextTurn)),
    pendingCard: G.pendingCard ? { card: G.pendingCard.card, deck: G.pendingCard.deck, pid: G.pendingCard.pid } : null,
    pendingReflection: G.pendingReflection ? { pid: G.pendingReflection.pid, amount: G.pendingReflection.amount, question: G.pendingReflection.question } : null,
    pendingTrade: G.pendingTrade ? { spaceId: G.pendingTrade.spaceId, fromPid: G.pendingTrade.fromPid, toPid: G.pendingTrade.toPid, price: G.pendingTrade.price } : null,
    lastMoveType: G.lastMoveType || "forward",
    auction: G.auction ? {
      propertyId: G.auction.propertyId,
      currentBid: G.auction.currentBid,
      currentBidder: G.auction.currentBidder,
      passed: G.auction.passed.slice(),
      timer: null
    } : null
  };
}

// ── LANZAMIENTO DE DADOS Y MOVIMIENTO ────────────────────────────────────

// El host solo calcula los dados y procesa. El cliente anima vía clientDetectChanges.
function animThenProc(pid, fj) {
  var d1 = Math.floor(Math.random() * 6) + 1;
  var d2 = Math.floor(Math.random() * 6) + 1;
  var db = d1 === d2;
  G.dice = [d1, d2];
  G.lastMoveType = "forward";
  syncNow();
  // El host NO ejecuta animación de dados; el cliente la maneja con clientAnimateDice.
  // Delay para dar tiempo al cliente a mostrar la animación de dados (~1.34s)
  // antes de resolver la casilla y mostrar opciones de compra.
  // Se usa 1600ms para cubrir latencia de red.
  var delay = fj ? 600 : 1600;
  setTimeout(function () { afterRoll(pid, d1 + d2, db, fj); }, delay);
}

function afterRoll(pid, tot, db, fj) {
  var p = G.players[pid];
  if (fj) {
    if (db) {
      p.inJail = false;
      p.jailTurns = 0;
      addLog(p.name + " sale de la Cárcel con dobles!", true, {
        pid: pid, icon: "fa-unlock",
        you: "¡Sacaste dobles y saliste de la Cárcel!",
        other: "{name} sacó dobles y salió de la Cárcel"
      });
      moveP(pid, tot, true);
    } else {
      p.jailTurns++;
      if (p.jailTurns >= 3) {
        addLog(p.name + " no logró dobles en 3 turnos. Paga $150.", true, {
          pid: pid, icon: "fa-unlock",
          you: "No lograste dobles en 3 turnos. Pagaste $150 y saliste.",
          other: "{name} no logró dobles en 3 turnos y pagó $150 para salir"
        });
        p.money -= 150;
        if (p.money < 0) p.money = 0;
        p.inJail = false;
        p.jailTurns = 0;
        moveP(pid, tot, true);
      } else {
        addLog(p.name + " no sacó dobles. " + p.jailTurns + "/3 en Cárcel.");
        processing = false;
        endTurn();
      }
    }
    return;
  }
  if (db) {
    G.doublesCount++;
    if (G.doublesCount >= 3) {
      addLog(p.name + " ¡tres dobles seguidos! Va a la Cárcel.", true);
      sendJail(pid);
      processing = false;
      syncNow();
      return;
    }
  } else {
    G.doublesCount = 0;
  }
  moveP(pid, tot, false);
}

// ── MOVIMIENTO: el host procesa instantáneamente, el cliente anima ────────
// El host calcula la posición final, vueltas y dinero, luego envía el estado.
// El cliente recibe el estado y ejecuta clientAnimateMove para la animación visual.
function moveP(pid, steps, fj) {
  var p = G.players[pid];

  if (fj) {
    // Desde cárcel: movimiento instantáneo
    var newPos = (p.position + steps) % 40;
    p.position = newPos;
    G.currentSpace = p.position;
    addLog(p.name + " avanza a: " + BOARD[p.position].name);
    processing = false;
    syncNow();
    setTimeout(function () { resolveLand(pid); }, 500);
    return;
  }

  // Movimiento paso a paso (solo lógica, sin animación visual en el host)
  for (var i = 0; i < steps; i++) {
    var prevPos = p.position;
    p.position = (p.position + 1) % 40;
    // Detectar paso por GO
    if (prevPos === 39 && p.position === 0) {
      p.laps++;
      p.money += 200;
      addLog(p.name + " pasa por el Punto de Partida. +$200", true, {
        pid: pid, icon: "fa-heart",
        you: "¡Pasaste por el Punto de Partida! +$200",
        other: "{name} pasó por el Punto de Partida (+$200)"
      });
      if (G.targetLaps > 0 && p.laps >= G.targetLaps) {
        G.currentSpace = p.position;
        processing = false;
        syncNow();
        setTimeout(function () {
          addLog(p.name + " completó " + G.targetLaps + " vueltas!", true);
          checkLaps();
        }, 100);
        return;
      }
    }
  }

  G.currentSpace = p.position;
  addLog(p.name + " cae en: " + BOARD[p.position].name);
  processing = false;
  syncNow();
  setTimeout(function () { resolveLand(pid); }, 500);
}

// ── RESOLVER CASILLA ─────────────────────────────────────────────────────

function resolveLand(pid) {
  var p = G.players[pid];
  if (p.eliminated) { processing = false; return; }
  var sp = BOARD[G.currentSpace];
  if (!sp) { processing = false; return; }

  if (sp.type === "go") {
    G.turnPhase = "continue";
  } else if (sp.type === "property") {
    resolveProp(pid);
  } else if (sp.type === "cofre") {
    drawC(pid, "cofre");
  } else if (sp.type === "falta") {
    drawC(pid, "falta");
  } else if (sp.type === "tax") {
    payTax(pid, sp.amount);
  } else if (sp.type === "reflexion") {
    payReflex(pid);
  } else if (sp.type === "servicio") {
    G.turnPhase = "donate";
  } else if (sp.type === "gotojail") {
    sendJail(pid);
    processing = false;
    return;
  } else if (sp.type === "jail") {
    G.turnPhase = "continue";
  } else {
    G.turnPhase = "continue";
  }
  processing = false;
  syncNow();
}

function resolveProp(pid) {
  var p = G.players[pid], sp = BOARD[G.currentSpace];
  if (!sp) { G.turnPhase = "continue"; processing = false; syncNow(); return; }
  var ow = G.properties[G.currentSpace];

  if (ow === undefined || ow === null) {
    if (p.money >= sp.price) {
      G.turnPhase = "buy";
    } else {
      addLog(p.name + " no puede comprar " + sp.name + " ($" + sp.price + "). Subasta.");
      startAuc(pid);
      return;
    }
  } else if (ow === pid) {
    addLog(p.name + " cae en su propiedad: " + sp.name);
    G.turnPhase = "continue";
  } else if (G.players[ow] && G.players[ow].eliminated) {
    addLog(sp.name + " (dueño eliminado). Subasta.");
    startAuc(pid);
    return;
  } else {
    var owP = G.players[ow];
    var apt = getAporte(G.currentSpace);
    var aporteReal = Math.min(apt, p.money);
    p.money -= aporteReal;
    if (owP) owP.money += aporteReal;
    var lv = G.volunteers[G.currentSpace] || 0;
    var lvLabel = lv === 0 ? "" : lv < 5 ? " (" + lv + " vol.)" : "(ONG)";
    addLog(
      p.name + " aporta $" + aporteReal + lvLabel + " a " + (owP ? owP.name : "?") + ' por "' + sp.name + '"',
      false,
      {
        pid: pid, pid2: ow, icon: "fa-hand-holding-heart",
        you: "Pagaste $" + aporteReal + " a " + (owP ? owP.name : "") + ' por "' + sp.name + '"',
        you2: "¡Recibiste $" + aporteReal + " de " + p.name + ' por "' + sp.name + '"!',
        other: "{name} pagó $" + aporteReal + " a " + (owP ? owP.name : "") + ' por "' + sp.name + '"'
      }
    );
    if (p.money <= 0) { elimP(pid); }
    G.turnPhase = "continue";
  }
  processing = false;
  syncNow();
}

// ── COMPRA / VENTA DE PROPIEDADES ────────────────────────────────────────

function buyProp(pid) {
  var p = G.players[pid], sp = BOARD[G.currentSpace];
  if (!sp || p.money < sp.price) { G.turnPhase = "continue"; syncNow(); return; }
  p.money -= sp.price;
  G.properties[G.currentSpace] = pid;
  p.properties.push(G.currentSpace);
  if (G.volunteers[G.currentSpace] === undefined) G.volunteers[G.currentSpace] = 0;
  addLog(p.name + ' compra "' + sp.name + '" por $' + sp.price, true, {
    pid: pid, icon: "fa-shopping-cart",
    you: "¡Compraste: " + sp.name + "!",
    other: "{name} compró: " + sp.name
  });
  if (p.money < 0) p.money = 0;
  G.turnPhase = "continue";
  syncNow();
}

function sellProp(pid, spaceId) {
  if (spaceId === undefined || spaceId === null) return;
  spaceId = parseInt(spaceId);
  if (G.pendingTrade) return;
  if (G.properties[spaceId] !== pid) return;
  var sp = BOARD[spaceId], p = G.players[pid];
  if (!sp || !p) return;
  var refund = Math.floor(sp.price / 2);
  p.money += refund;
  delete G.properties[spaceId];
  delete G.volunteers[spaceId];
  var idx = p.properties.indexOf(spaceId);
  if (idx !== -1) p.properties.splice(idx, 1);
  addLog(p.name + ' vende "' + sp.name + '" por $' + refund, true, {
    pid: pid, icon: "fa-hand-holding-usd",
    you: 'Vendiste "' + sp.name + '" por $' + refund,
    other: "{name} vendió \"" + sp.name + "\" por $" + refund
  });
  syncNow();
}

function offerProp(fromPid, spaceId, toPid, price) {
  if (spaceId === undefined || spaceId === null || toPid === undefined || toPid === null) return;
  spaceId = parseInt(spaceId);
  toPid = parseInt(toPid);
  if (G.pendingTrade) return;
  if (G.properties[spaceId] !== fromPid) return;
  if (toPid === fromPid) return;
  var toP = G.players[toPid];
  if (!toP || toP.eliminated) return;
  var sp = BOARD[spaceId], fromP = G.players[fromPid];
  if (!sp || !fromP) return;
  price = Math.max(1, Math.floor(price) || 1);
  G.pendingTrade = { spaceId: spaceId, fromPid: fromPid, toPid: toPid, price: price };
  addLog(
    fromP.name + ' ofrece "' + sp.name + '" a ' + toP.name + ' por $' + price,
    true,
    {
      pid: toPid, pid2: fromPid, icon: "fa-handshake",
      you: fromP.name + ' te ofrece "' + sp.name + '" por $' + price,
      you2: 'Le ofreciste "' + sp.name + '" a ' + toP.name + " por $" + price,
      other: fromP.name + " le ofrece \"" + sp.name + "\" a " + toP.name
    }
  );
  syncNow();
}

function resolveTrade(pid, accept) {
  if (!G.pendingTrade || G.pendingTrade.toPid !== pid) return;
  var t = G.pendingTrade;
  G.pendingTrade = null;
  var sp = BOARD[t.spaceId], buyer = G.players[t.toPid], seller = G.players[t.fromPid];
  if (!sp || !buyer || !seller) { syncNow(); return; }

  if (!accept) {
    addLog(buyer.name + ' rechazó la oferta de "' + sp.name + '" de ' + seller.name + ".", true, {
      pid: t.fromPid, pid2: t.toPid, icon: "fa-times-circle",
      you: buyer.name + ' rechazó tu oferta de "' + sp.name + '"',
      you2: 'Rechazaste la oferta de "' + sp.name + '" de ' + seller.name,
      other: buyer.name + " rechazó una oferta de " + seller.name
    });
    syncNow();
    return;
  }

  if (G.properties[t.spaceId] !== t.fromPid) {
    addLog('La oferta de "' + sp.name + '" ya no es válida (cambió de dueño).', true, {
      pid: t.toPid, icon: "fa-times-circle",
      you: "Esa oferta ya no es válida (la propiedad cambió de dueño)",
      other: "Una oferta a {name} ya no era válida"
    });
    syncNow();
    return;
  }

  if (buyer.money < t.price) {
    addLog(buyer.name + " no tuvo fondos suficientes para aceptar.", true, {
      pid: t.toPid, pid2: t.fromPid, icon: "fa-times-circle",
      you: "No tenías fondos suficientes para aceptar la oferta",
      you2: buyer.name + " no tuvo fondos suficientes para aceptar tu oferta",
      other: buyer.name + " no pudo aceptar por falta de fondos"
    });
    syncNow();
    return;
  }

  buyer.money -= t.price;
  seller.money += t.price;
  G.properties[t.spaceId] = t.toPid;
  var idx = seller.properties.indexOf(t.spaceId);
  if (idx !== -1) seller.properties.splice(idx, 1);
  buyer.properties.push(t.spaceId);
  addLog(buyer.name + ' compra "' + sp.name + '" a ' + seller.name + ' por $' + t.price, true, {
    pid: t.toPid, pid2: t.fromPid, icon: "fa-handshake",
    you: '¡Aceptaste! Compraste "' + sp.name + '" a ' + seller.name + ' por $' + t.price,
    you2: '¡' + buyer.name + ' aceptó! Vendiste "' + sp.name + '" por $' + t.price,
    other: buyer.name + " le compró \"" + sp.name + "\" a " + seller.name
  });
  syncNow();
}

// ── VOLUNTARIOS ──────────────────────────────────────────────────────────

function buyVol(pid, spaceId) {
  if (spaceId === undefined || spaceId === null) return;
  spaceId = parseInt(spaceId);
  if (!canBuyVol(pid, spaceId)) {
    addLog("No se puede mejorar ahora.");
    syncNow();
    return;
  }
  var sp = BOARD[spaceId], p = G.players[pid];
  var cost = VOL_COST[sp.group];
  p.money -= cost;
  G.volunteers[spaceId] = (G.volunteers[spaceId] || 0) + 1;
  var lv = G.volunteers[spaceId];
  var label = lv <= 4 ? lv + " Voluntario" + (lv > 1 ? "s" : "") : "ONG de Apoyo";
  addLog(p.name + ' mejora "' + sp.name + '" → ' + label + ' (costo $' + cost + ')', true, {
    pid: pid, icon: "fa-user-plus",
    you: "¡Mejoraste \"" + sp.name + "\" → " + label + "!",
    other: "{name} mejoró \"" + sp.name + "\" → " + label
  });
  syncNow();
}

// ── IMPUESTOS Y REFLEXIÓN ────────────────────────────────────────────────

function payTax(pid, amt) {
  var p = G.players[pid];
  var real = Math.min(amt, p.money);
  p.money -= real;
  G.communityFund += real;
  addLog(p.name + " paga Impuesto $" + real + " al Fondo Comunitario.", false, {
    pid: pid, icon: "fa-file-invoice-dollar",
    you: "Pagaste $" + real + " de Impuesto al Fondo Comunitario",
    other: "{name} pagó $" + real + " de Impuesto"
  });
  if (p.money <= 0) elimP(pid);
  G.turnPhase = "continue";
  syncNow();
}

function payReflex(pid) {
  var p = G.players[pid];
  var real = Math.min(50, p.money);
  p.money -= real;
  G.communityFund += real;
  var q = REFLEXION_Q[Math.floor(Math.random() * REFLEXION_Q.length)];
  addLog(p.name + " reflexiona y dona $" + real + " al Fondo.", false, {
    pid: pid, icon: "fa-brain",
    you: "Donaste $" + real + " al Fondo (Reflexión)",
    other: "{name} donó $" + real + " al Fondo (Reflexión)"
  });
  G.pendingReflection = { pid: pid, amount: real, question: q };
  if (p.money <= 0) elimP(pid);
  G.turnPhase = "continue";
  processing = false;
  syncNow();
}

function donateServ(pid) {
  var p = G.players[pid];
  var real = Math.min(50, p.money);
  p.money -= real;
  G.communityFund += real;
  addLog(p.name + " dona $" + real + " al Fondo (Día de Servicio).", true, {
    pid: pid, icon: "fa-hand-holding-heart",
    you: "¡Donaste $" + real + " al Fondo (Día de Servicio)!",
    other: "{name} donó $" + real + " al Fondo (Día de Servicio)"
  });
  if (p.money <= 0) elimP(pid);
  endTurn();
}

// ── CÁRCEL ───────────────────────────────────────────────────────────────

function sendJail(pid) {
  var p = G.players[pid];
  p.inJail = true;
  p.jailTurns = 0;
  p.position = 10;
  G.doublesCount = 0;
  G.lastMoveType = "instant";
  addLog(p.name + " va a la Cárcel del Individualismo!", true, {
    pid: pid, icon: "fa-lock",
    you: "¡Fuiste a la Cárcel del Individualismo!",
    other: "{name} fue a la Cárcel del Individualismo"
  });
  G.turnPhase = "continue";
  syncNow();
}

// ── BUG FIX: payJail no permite salir sin pagar ──────────────────────────
function payJail(pid) {
  var p = G.players[pid];
  if (p.money < 150) {
    addLog(p.name + " no tiene fondos suficientes ($150) para pagar.", false, {
      pid: pid, icon: "fa-coins",
      you: "No tienes fondos suficientes para pagar $150 y salir.",
      other: "{name} no tiene fondos para pagar la cárcel."
    });
    syncNow();
    return;
  }
  p.money -= 150;
  p.inJail = false;
  p.jailTurns = 0;
  addLog(p.name + " paga $150 y sale de la Cárcel.", false, {
    pid: pid, icon: "fa-unlock",
    you: "Pagaste $150 y saliste de la Cárcel",
    other: "{name} pagó $150 y salió de la Cárcel"
  });
  G.turnPhase = "roll";
  syncNow();
}

// ── TARJETAS ─────────────────────────────────────────────────────────────

function drawC(pid, deck) {
  var card;
  if (deck === "cofre") {
    card = CC[G.cofreIndex];
    G.cofreIndex = (G.cofreIndex + 1) % CC.length;
  } else {
    card = CF[G.faltaIndex];
    G.faltaIndex = (G.faltaIndex + 1) % CF.length;
  }
  G.pendingCard = { card: card, deck: deck, pid: pid };
  processing = false;
  syncNow();
}

// ── BUG FIX: applyC goto con collectGO ahora cuenta vueltas ──────────────
function applyC(card, pid) {
  var p = G.players[pid], et = "";

  if (card.action === "gain") {
    p.money += card.amount;
    et = "+$" + card.amount;
  } else if (card.action === "lose") {
    p.money -= card.amount;
    et = "-$" + card.amount;
    if (p.money < 0) { p.money = 0; elimP(pid); }
  } else if (card.action === "fund") {
    var r = Math.min(card.amount, p.money);
    p.money -= r;
    G.communityFund += r;
    et = "-$" + r + " al Fondo";
    if (p.money <= 0) elimP(pid);
  } else if (card.action === "collect_all") {
    var tc = 0;
    for (var i = 0; i < G.players.length; i++) {
      var o = G.players[i];
      if (o.id !== pid && !o.eliminated) {
        var a = Math.min(card.amount, o.money);
        o.money -= a;
        p.money += a;
        tc += a;
        if (o.money <= 0) elimP(o.id);
      }
    }
    et = "+$" + tc + " de los demás";
  } else if (card.action === "pay_all") {
    var pd = 0;
    for (var j = 0; j < G.players.length; j++) {
      var o2 = G.players[j];
      if (o2.id !== pid && !o2.eliminated) {
        var a2 = Math.min(card.amount, p.money);
        if (a2 > 0) {
          o2.money += a2;
          p.money -= a2;
          pd += a2;
        }
      }
    }
    et = "-$" + pd + " a los demás";
    if (p.money <= 0) elimP(pid);
  } else if (card.action === "goto") {
    if (card.collectGO) {
      var cur = p.position;
      var targetPos = card.position;
      var stepsNeeded = (targetPos - cur + 40) % 40;
      for (var k = 0; k < stepsNeeded; k++) {
        cur = (cur + 1) % 40;
        if (cur === 0) {
          p.laps++;
          p.money += 200;
          addLog(p.name + " pasa por GO: +$200", true, {
            pid: pid, icon: "fa-heart",
            you: "¡Pasaste por el Punto de Partida! +$200",
            other: "{name} pasó por el Punto de Partida (+$200)"
          });
        }
      }
      G.lastMoveType = "forward";
    } else {
      G.lastMoveType = "instant";
    }
    p.position = card.position;
    et = "→ " + BOARD[card.position].name;
  } else if (card.action === "jail") {
    sendJail(pid);
    et = "Ir a la Cárcel";
    processing = false;
    syncNow();
    return;
  } else if (card.action === "move_back") {
    p.position = (p.position - card.amount + 40) % 40;
    et = "Retrocede " + card.amount;
    G.lastMoveType = "backward";
  } else if (card.action === "move_fwd") {
    for (var k2 = 0; k2 < card.amount; k2++) {
      p.position = (p.position + 1) % 40;
      if (p.position === 0) {
        p.laps++;
        p.money += 200;
        addLog(p.name + " pasa por GO: +$200", true, {
          pid: pid, icon: "fa-heart",
          you: "¡Pasaste por el Punto de Partida! +$200",
          other: "{name} pasó por el Punto de Partida (+$200)"
        });
      }
    }
    et = "Avanza " + card.amount;
    G.lastMoveType = "forward";
  } else if (card.action === "lose_turn") {
    G.skipNextTurn[pid] = true;
    et = "Pierde próximo turno";
  }

  addLog(p.name + ": " + card.title + " (" + et + ")", true, {
    pid: pid, icon: "fa-clone",
    you: card.title + ": " + et,
    other: "{name}: " + card.title + " (" + et + ")"
  });
  G.turnPhase = "continue";
  processing = false;
  syncNow();
}

// ── SUBASTAS ─────────────────────────────────────────────────────────────

function startAuc(ppid) {
  var sp = BOARD[G.currentSpace];
  if (!sp) { G.turnPhase = "continue"; syncNow(); return; }
  G.auction = {
    propertyId: G.currentSpace,
    currentBid: Math.floor(sp.price / 2),
    currentBidder: -1,
    passed: [],
    timer: null
  };
  G.turnPhase = "auction";
  addLog("Subasta: " + sp.name + " (mínimo: $" + G.auction.currentBid + ")", true, {
    pid: -1, icon: "fa-gavel",
    other: "¡Subasta iniciada por \"" + sp.name + "\"! Mínimo: $" + G.auction.currentBid
  });
  G.auction.timer = setTimeout(function () { finAuc(); }, 25000);
  syncNow();
}

function aucBid(pid) {
  if (!G.auction || G.auction.passed.indexOf(pid) !== -1) return;
  var p = G.players[pid];
  if (p.money < G.auction.currentBid + 10) {
    addLog(p.name + " no tiene fondos para pujar.");
    return;
  }
  clearTimeout(G.auction.timer);
  G.auction.currentBid += 10;
  G.auction.currentBidder = pid;
  addLog(G.players[pid].name + " puja $" + G.auction.currentBid);
  G.auction.timer = setTimeout(function () { finAuc(); }, 15000);
  syncNow();
}

function aucPass(pid) {
  if (!G.auction) return;
  if (G.auction.passed.indexOf(pid) === -1) G.auction.passed.push(pid);
  addLog(G.players[pid].name + " pasa en la subasta.");
  var act = [];
  for (var i = 0; i < G.players.length; i++) {
    if (!G.players[i].eliminated && G.auction.passed.indexOf(G.players[i].id) === -1) act.push(G.players[i]);
  }
  if (act.length === 0) {
    clearTimeout(G.auction.timer);
    finAuc();
    return;
  }
  syncNow();
}

function finAuc() {
  if (!G.auction) return;
  clearTimeout(G.auction.timer);
  var a = G.auction, sp = BOARD[a.propertyId];
  if (a.currentBidder >= 0) {
    var p = G.players[a.currentBidder];
    p.money -= a.currentBid;
    G.properties[a.propertyId] = a.currentBidder;
    p.properties.push(a.propertyId);
    addLog(p.name + ' gana subasta de "' + sp.name + '" por $' + a.currentBid, true, {
      pid: a.currentBidder, icon: "fa-gavel",
      you: "¡Ganaste la subasta de \"" + sp.name + "\" por $" + a.currentBid + "!",
      other: "{name} ganó la subasta de \"" + sp.name + "\" por $" + a.currentBid
    });
    if (p.money < 0) p.money = 0;
  } else {
    addLog("Nadie pujó. " + sp.name + " queda sin dueño.");
  }
  G.auction = null;
  endTurn();
}

// ── BUG FIX: endTurn preserva doublesCount para 3-dobles seguidos ────────
function endTurn() {
  var p = G.players[G.currentPlayer];
  if (G.doublesCount > 0 && G.doublesCount < 3 && !p.eliminated && !p.inJail) {
    addLog(p.name + " ¡Dobles! Turno extra.", true, {
      pid: G.currentPlayer, icon: "fa-dice",
      you: "¡Sacaste dobles! Tienes un turno extra",
      other: "{name} sacó dobles. Turno extra"
    });
    G.turnPhase = "roll";
    processing = false;
    syncNow();
    return;
  }
  G.doublesCount = 0;
  var next = nextActive(G.currentPlayer);
  G.currentPlayer = next;
  if (G.skipNextTurn[next]) {
    delete G.skipNextTurn[next];
    addLog(G.players[next].name + " pierde su turno (Reto de Empatía).", true, {
      pid: next, icon: "fa-user-clock",
      you: "Pierdes tu turno (Reto de Empatía)",
      other: "{name} pierde su turno (Reto de Empatía)"
    });
    var again = nextActive(next);
    if (again === next) { G.currentPlayer = next; }
    else { G.currentPlayer = again; }
  }
  addLog("Turno de: " + G.players[G.currentPlayer].name, true, {
    pid: G.currentPlayer, icon: "fa-flag-checkered",
    you: "¡Es tu turno!",
    other: "Turno de {name}"
  });
  G.turnPhase = "roll";
  processing = false;
  syncNow();
}

// ── ELIMINACIÓN Y FIN ────────────────────────────────────────────────────

function elimP(pid) {
  var p = G.players[pid];
  if (p.eliminated) return;
  p.eliminated = true;
  p.money = 0;
  addLog(p.name + " eliminado (sin Generosipoints).", true, {
    pid: pid, icon: "fa-user-slash",
    you: "Has sido eliminado del juego (sin fondos)",
    other: "{name} ha sido eliminado del juego"
  });
  for (var i = 0; i < p.properties.length; i++) {
    delete G.properties[p.properties[i]];
    delete G.volunteers[p.properties[i]];
  }
  p.properties = [];
  var act = [];
  for (var j = 0; j < G.players.length; j++) {
    if (!G.players[j].eliminated) act.push(G.players[j]);
  }
  if (act.length <= 1) { endGame(); return; }
  if (G.currentPlayer === pid) endTurn();
}

function checkLaps() {
  var d = true;
  for (var i = 0; i < G.players.length; i++) {
    if (!G.players[i].eliminated && G.players[i].laps < G.targetLaps) {
      d = false;
      break;
    }
  }
  if (d) endGame();
}

function endGame() {
  G.phase = "ended";
  processing = false;
  if (G.timerInterval) clearInterval(G.timerInterval);
  syncNow();
  showEndGame();
}

// ── PROCESADOR DE ACCIONES ───────────────────────────────────────────────

function processAction(a, pid, d) {
  // BUG FIX: auction_bid/auction_pass siempre deben pasar el check de processing
  if (processing && a !== "sell_prop" && a !== "offer_prop" && a !== "accept_trade" &&
      a !== "reject_trade" && a !== "cancel_trade" && a !== "auction_bid" && a !== "auction_pass") return;
  var p = G.players[pid];
  if (!p || p.eliminated) return;
  if (pid !== G.currentPlayer && a !== "auction_bid" && a !== "auction_pass" &&
      a !== "sell_prop" && a !== "offer_prop" && a !== "accept_trade" &&
      a !== "reject_trade" && a !== "cancel_trade") return;

  if (a === "roll") {
    if (G.turnPhase !== "roll" || p.inJail) return;
    processing = true;
    G.turnPhase = "rolling";
    renderAction();
    animThenProc(pid, false);
  } else if (a === "roll_jail") {
    if (G.turnPhase !== "roll" || !p.inJail) return;
    processing = true;
    G.turnPhase = "rolling";
    renderAction();
    animThenProc(pid, true);
  } else if (a === "pay_jail") {
    payJail(pid);
  } else if (a === "buy") {
    buyProp(pid);
  } else if (a === "pass_buy") {
    startAuc(pid);
  } else if (a === "donate") {
    donateServ(pid);
  } else if (a === "skip_donate") {
    endTurn();
  } else if (a === "continue") {
    endTurn();
  } else if (a === "auction_bid") {
    aucBid(pid);
  } else if (a === "auction_pass") {
    aucPass(pid);
  } else if (a === "buy_vol") {
    buyVol(pid, d && d.spaceId);
  } else if (a === "sell_prop") {
    sellProp(pid, d && d.spaceId);
  } else if (a === "offer_prop") {
    offerProp(pid, d && d.spaceId, d && d.toPid, d && d.price);
  } else if (a === "accept_trade") {
    resolveTrade(pid, true);
  } else if (a === "reject_trade") {
    resolveTrade(pid, false);
  } else if (a === "cancel_trade") {
    if (G.pendingTrade && G.pendingTrade.fromPid === pid) {
      var sp = BOARD[G.pendingTrade.spaceId];
      G.pendingTrade = null;
      if (sp) addLog(p.name + ' canceló la oferta de "' + sp.name + '".', false, {
        pid: pid, icon: "fa-ban",
        you: "Cancelaste tu oferta",
        other: "{name} canceló su oferta"
      });
      syncNow();
    }
  } else if (a === "accept_card") {
    if (!G.pendingCard || G.pendingCard.pid !== pid) return;
    var pc = G.pendingCard;
    G.pendingCard = null;
    processing = true;
    applyC(pc.card, pc.pid);
  } else if (a === "close_reflection") {
    if (!G.pendingReflection || G.pendingReflection.pid !== pid) return;
    G.pendingReflection = null;
    syncNow();
  }
}
