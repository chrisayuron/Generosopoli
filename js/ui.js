// ── CONSTRUCCIÓN DEL TABLERO ─────────────────────────────────────────────

function buildBoard() {
  var b = document.getElementById("board");
  b.innerHTML = "";

  for (var i = 0; i < 40; i++) {
    var sp = BOARD[i], pos = getSpacePos(i), div = document.createElement("div");
    var corner = isCorner(i);
    div.className = "space " + pos.side + " " + (sp.type) + (corner ? " corner" : "");
    div.id = "space-" + i;
    div.dataset.id = i;
    div.style.gridRow = pos.r;
    div.style.gridColumn = pos.c;

    var lr = pos.lr;
    var ns = corner ? "clamp(7px,0.9vw,11px)" : lr ? "clamp(6.5px,0.88vw,11px)" : "clamp(6.5px,0.92vw,11.5px)";
    var ps = corner ? "clamp(7px,0.9vw,11px)" : lr ? "clamp(6px,0.82vw,10px)" : "clamp(6px,0.85vw,10.5px)";
    var is = corner ? "clamp(18px,2.8vw,32px)" : "clamp(10px,1.6vw,19px)";

    if (corner) {
      var ico = "", lbl = "";
      if (sp.type === "go") {
        ico = '<i class="fas fa-heart si" style="color:#27ae60;font-size:' + is + '"></i>';
        lbl = '<span class="sn" style="font-size:' + ns + ';color:#1a5c38;font-weight:900;letter-spacing:.5px">GO</span><span style="font-size:clamp(5px,.7vw,8px);color:#27ae60;display:block">+$200</span>';
      } else if (sp.type === "jail") {
        ico = '<i class="fas fa-lock si" style="color:#666;font-size:' + is + '"></i>';
        lbl = '<span class="sn" style="font-size:' + ns + '">CÁRCEL</span>';
      } else if (sp.type === "gotojail") {
        ico = '<i class="fas fa-exclamation-triangle si" style="color:#c0392b;font-size:' + is + '"></i>';
        lbl = '<span class="sn" style="font-size:' + ns + ';color:#c0392b">RETO</span>';
      } else if (sp.type === "reflexion") {
        ico = '<i class="fas fa-brain si" style="color:#e76f51;font-size:' + is + '"></i>';
        lbl = '<span class="sn" style="font-size:' + ns + '">REFLEXIÓN</span>';
      }
      div.innerHTML = ico + lbl;
    } else if (sp.type === "property") {
      div.style.color = GC[sp.group];
      div.innerHTML =
        '<div class="owner-badge" id="owner-' + i + '"></div>' +
        '<div class="cb"></div>' +
        '<div class="sb">' +
          '<span class="sn" style="font-size:' + ns + '">' + sp.short + '</span>' +
          '<span class="sp" style="font-size:' + ps + '">$' + sp.price + '</span>' +
          '<div class="vols" id="vols-' + i + '"></div>' +
        '</div>';
    } else if (sp.type === "tax") {
      div.innerHTML =
        '<div class="sb">' +
          '<i class="fas ' + sp.icon + ' si" style="color:#c0392b;font-size:' + is + '"></i>' +
          '<span class="sn" style="font-size:' + ns + '">' + sp.short + '</span>' +
          '<span class="sp" style="font-size:' + ps + ';color:#c0392b">$' + sp.amount + '</span>' +
        '</div>';
    } else if (sp.type === "cofre") {
      div.innerHTML =
        '<div class="sb">' +
          '<i class="fas fa-box-open si" style="color:#2a9d8f;font-size:' + is + '"></i>' +
          '<span class="sn" style="font-size:' + ns + ';color:#2a9d8f;font-weight:800">COFRE</span>' +
        '</div>';
    } else if (sp.type === "falta") {
      div.innerHTML =
        '<div class="sb">' +
          '<i class="fas fa-times-circle si" style="color:#e63946;font-size:' + is + '"></i>' +
          '<span class="sn" style="font-size:' + ns + ';color:#c0392b;font-weight:800">FALTA</span>' +
        '</div>';
    } else if (sp.type === "reflexion") {
      div.innerHTML =
        '<div class="sb">' +
          '<i class="fas fa-brain si" style="color:#e76f51;font-size:' + is + '"></i>' +
          '<span class="sn" style="font-size:' + ns + '">REFLEXIÓN</span>' +
          '<span class="sp" style="font-size:clamp(5px,.7vw,8px);color:#e76f51">-$50</span>' +
        '</div>';
    } else if (sp.type === "servicio") {
      div.innerHTML =
        '<div class="sb">' +
          '<i class="fas fa-hands-helping si" style="color:#9b59b6;font-size:' + is + '"></i>' +
          '<span class="sn" style="font-size:' + ns + ';color:#9b59b6;font-weight:800">SERVICIO</span>' +
        '</div>';
    } else {
      div.innerHTML = '<div class="sb"><span class="sn" style="font-size:' + ns + '">' + sp.short + '</span></div>';
    }
    b.appendChild(div);
  }

  var ct = document.createElement("div");
  ct.className = "board-center";
  ct.id = "board-center";
  ct.innerHTML =
    '<h2>GENEROSOPOLY</h2>' +
    '<div style="font-size:clamp(9px,1.2vw,13px);color:var(--text-dark);opacity:.6;text-align:center">El Juego de la Generosidad</div>' +
    '<div class="fund-box"><i class="fas fa-hand-holding-heart" style="margin-right:6px"></i>Fondo: $<span id="fund-center">0</span></div>' +
    '<button id="rules-btn-center" onclick="showRules()"><i class="fas fa-book" style="margin-right:4px"></i>Ver Reglas</button>';
  b.appendChild(ct);
  renderTokens();
}

function getTokenOffsets(n) {
  if (n === 1) return [{ x: 50, y: 50 }];
  if (n === 2) return [{ x: 35, y: 50 }, { x: 65, y: 50 }];
  if (n === 3) return [{ x: 25, y: 50 }, { x: 50, y: 50 }, { x: 75, y: 50 }];
  if (n === 4) return [{ x: 30, y: 35 }, { x: 70, y: 35 }, { x: 30, y: 65 }, { x: 70, y: 65 }];
  return [{ x: 25, y: 28 }, { x: 75, y: 28 }, { x: 25, y: 72 }, { x: 75, y: 72 }, { x: 50, y: 42 }, { x: 50, y: 62 }];
}

// ── RENDERIZADO ──────────────────────────────────────────────────────────

function renderPropertyOwnership() {
  for (var i = 0; i < 40; i++) {
    var sp = BOARD[i];
    if (!sp || sp.type !== "property") continue;
    var el = document.getElementById("space-" + i);
    if (!el) continue;
    var badge = document.getElementById("owner-" + i);
    var ownerId = G.properties[i];
    var owner = (ownerId !== undefined && ownerId !== null) ? G.players[ownerId] : null;
    if (owner && !owner.eliminated) {
      el.classList.add("owned");
      if (badge) {
        badge.style.display = "flex";
        badge.style.background = owner.color;
        badge.textContent = owner.name[0].toUpperCase();
        badge.title = owner.name + " es dueño/a de esta propiedad";
      }
    } else {
      el.classList.remove("owned");
      if (badge) { badge.style.display = "none"; badge.textContent = ""; }
    }
  }
}

function renderTokens() {
  document.querySelectorAll(".token").forEach(function (t) { t.remove(); });
  var bs = {};
  for (var i = 0; i < G.players.length; i++) {
    var p = G.players[i];
    if (p.eliminated) continue;
    if (!bs[p.position]) bs[p.position] = [];
    bs[p.position].push(p);
  }
  var sk = Object.keys(bs);
  for (var s = 0; s < sk.length; s++) {
    var pls = bs[sk[s]], se = document.getElementById("space-" + sk[s]);
    if (!se) continue;
    var offs = getTokenOffsets(pls.length);
    for (var j = 0; j < pls.length; j++) {
      var pl = pls[j], tk = document.createElement("div");
      tk.className = "token" + (G.currentPlayer === pl.id ? " active-token" : "");
      tk.style.background = pl.color;
      tk.textContent = pl.name[0].toUpperCase();
      var o = offs[Math.min(j, offs.length - 1)];
      tk.style.left = "calc(" + o.x + "% - 11px)";
      tk.style.top = "calc(" + o.y + "% - 11px)";
      se.appendChild(tk);
    }
  }
}

function renderAll() {
  renderDiceFaces();
  renderTokens();
  renderPropertyOwnership();
  renderPlayers();
  renderAction();
  renderFund();
  renderLog();
  renderVols();
  checkPendingCard();
  checkPendingReflection();
  checkPendingTrade();
  processToasts();
  if (G.endCondition.startsWith("timer") && G.phase === "playing") renderTimer();
}

function renderVols() {
  for (var sid in G.volunteers) {
    var el = document.getElementById("vols-" + sid);
    if (!el) continue;
    var lv = G.volunteers[sid] || 0;
    var h = "";
    for (var v = 0; v < Math.min(lv, 4); v++) h += '<div class="vol-pip"></div>';
    if (lv >= 5) h = '<div class="vol-pip ong" title="ONG de Apoyo">&#9733;</div>';
    el.innerHTML = h;
  }
}

function renderPlayers() {
  var el = document.getElementById("players-list"), h = "";
  for (var i = 0; i < G.players.length; i++) {
    var p = G.players[i], cur = G.currentPlayer === p.id && G.phase === "playing";
    var pr = "";
    for (var j = 0; j < p.properties.length; j++) {
      var si = p.properties[j], sp = BOARD[si];
      if (!sp) continue;
      var lv = G.volunteers[si] || 0;
      var pip = lv >= 5
        ? '<div class="prop-dot" style="background:' + GC[sp.group] + ';border-color:var(--accent);outline:1px solid var(--accent)" title="ONG: ' + sp.short + '"></div>'
        : lv > 0
          ? '<div class="prop-dot" style="background:' + GC[sp.group] + ';border-color:#27ae60;outline:1px solid #27ae60" title="' + lv + ' vol. - ' + sp.short + '"></div>'
          : '<div class="prop-dot" style="background:' + GC[sp.group] + '" title="' + sp.short + '"></div>';
      pr += pip;
    }
    h += '<div class="player-row' + (cur ? " current" : "") + (p.eliminated ? " eliminated" : "") + '" onclick="showPropPanel(' + p.id + ')" style="cursor:pointer" title="Ver propiedades de ' + p.name + '">';
    h += '<div class="player-dot" style="background:' + p.color + '"></div>';
    h += '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.name + (p.id === myId ? " (Tú)" : "") + (p.inJail ? " 🔒" : "") + '</div><div class="props-mini">' + pr + "</div></div>";
    h += '<div class="player-money">$' + p.money + '</div>';
    h += '</div>';
  }
  el.innerHTML = h;
}

function renderFund() {
  document.getElementById("fund-display").textContent = "$" + G.communityFund;
  var fc = document.getElementById("fund-center");
  if (fc) fc.textContent = G.communityFund;
}

function renderLog() {
  var el = document.getElementById("log"), h = "";
  for (var i = 0; i < G.log.length; i++) {
    h += '<div class="log-entry' + (G.log[i].imp ? " important" : "") + '">' + G.log[i].msg + "</div>";
  }
  el.innerHTML = h;
  el.scrollTop = el.scrollHeight;
}

function renderDie(el, v) {
  var dots = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  el.innerHTML = "";
  for (var i = 1; i <= 9; i++) {
    var d = document.createElement("div");
    if (dots[v] && dots[v].indexOf(i) !== -1) d.className = "dot";
    el.appendChild(d);
  }
}

function renderTimer() {
  var m = Math.floor(G.timeRemaining / 60), s = G.timeRemaining % 60;
  var el = document.getElementById("timer-text");
  el.textContent = m + ":" + (s < 10 ? "0" : "") + s;
  el.style.color = G.timeRemaining <= 60 ? "#e63946" : "var(--accent)";
}

function renderDiceFaces() {}

// ── PANEL DE ACCIONES ────────────────────────────────────────────────────

function renderAction() {
  var el = document.getElementById("action-content"), p = G.players[G.currentPlayer];
  if (!p || p.eliminated) { el.innerHTML = '<div class="waiting-msg">Jugador eliminado</div>'; return; }
  if (G.currentPlayer !== myId || processing) {
    el.innerHTML = '<div class="waiting-msg"><i class="fas fa-hourglass-half"></i> Turno de ' + p.name + (p.inJail ? " 🔒" : "") + "</div>";
    return;
  }
  var h = "";
  if (G.turnPhase === "roll" && !p.inJail) {
    h = '<div class="action-btns"><button class="btn btn-primary" onclick="doAction(\'roll\')"><i class="fas fa-dice"></i> Lanzar Dados</button></div>';
  } else if (G.turnPhase === "roll" && p.inJail) {
    h = '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">🔒 En la Cárcel (' + p.jailTurns + '/3 turnos)</div>' +
      '<div class="action-btns">' +
      '<button class="btn btn-primary" onclick="doAction(\'roll_jail\')"><i class="fas fa-dice"></i> Intentar Dobles</button>' +
      '<button class="btn btn-danger" onclick="doAction(\'pay_jail\')"><i class="fas fa-coins"></i> Pagar $150 y salir</button>' +
      '</div>';
  } else if (G.turnPhase === "rolling") {
    h = '<div class="waiting-msg"><i class="fas fa-dice"></i> Lanzando los dados...</div>';
  } else if (G.turnPhase === "buy") {
    var sp = BOARD[G.currentSpace];
    if (!sp) { G.turnPhase = "continue"; syncNow(); return; }
    h = '<div style="font-size:13px;margin-bottom:8px"><strong>' + sp.name + "</strong><br>Precio: <strong>$" + sp.price + "</strong> | Aporte: $" + sp.aporte + '</div>' +
      '<div class="action-btns">' +
      '<button class="btn btn-success" onclick="doAction(\'buy\')"><i class="fas fa-shopping-cart"></i> Comprar $' + sp.price + '</button>' +
      '<button class="btn btn-secondary" onclick="doAction(\'pass_buy\')"><i class="fas fa-gavel"></i> Pasar (Subasta)</button>' +
      '</div>';
  } else if (G.turnPhase === "donate") {
    h = '<div style="font-size:13px;margin-bottom:8px"><i class="fas fa-hands-helping" style="color:#9b59b6"></i> <strong>Día de Servicio</strong><br><span style="font-size:12px;color:var(--muted)">¿Deseas donar voluntariamente?</span></div>' +
      '<div class="action-btns">' +
      '<button class="btn btn-success" onclick="doAction(\'donate\')"><i class="fas fa-hand-holding-heart"></i> Donar $50 al Fondo</button>' +
      '<button class="btn btn-secondary" onclick="doAction(\'skip_donate\')"><i class="fas fa-forward"></i> Continuar sin donar</button>' +
      '</div>';
  } else if (G.turnPhase === "continue") {
    h = '<div class="action-btns">' +
      '<button class="btn btn-primary" onclick="doAction(\'continue\')"><i class="fas fa-forward"></i> Continuar</button>' +
      '<button class="btn btn-secondary" onclick="showPropPanel(' + myId + ')" style="font-size:12px"><i class="fas fa-city"></i> Mis proyectos</button>' +
      '</div>';
  } else if (G.turnPhase === "auction") {
    h = renderAucUI();
  }
  el.innerHTML = h;
}

function renderAucUI() {
  if (!G.auction) return "";
  var a = G.auction, sp = BOARD[a.propertyId], myPassed = a.passed.indexOf(myId) !== -1;
  var h = '<div style="font-size:13px;margin-bottom:6px"><i class="fas fa-gavel" style="color:var(--accent)"></i> <strong>Subasta: ' + sp.name + "</strong></div>" +
    '<div class="auction-bid">Puja: <span>$' + a.currentBid + "</span></div>" +
    '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">' + (a.currentBidder >= 0 ? "Mayor postor: " + G.players[a.currentBidder].name : "Nadie ha pujado") + "</div>";
  if (!myPassed) {
    h += '<div class="action-btns">' +
      '<button class="btn btn-primary" onclick="doAction(\'auction_bid\')"><i class="fas fa-arrow-up"></i> Pujar $' + (a.currentBid + 10) + '</button>' +
      '<button class="btn btn-secondary" onclick="doAction(\'auction_pass\')"><i class="fas fa-times"></i> Pasar</button>' +
      '</div>';
  } else {
    h += '<div style="font-size:12px;color:var(--muted)"><i class="fas fa-check"></i> Has pasado. Esperando a los demás...</div>';
  }
  return h;
}

// ── PANEL DE PROPIEDADES ─────────────────────────────────────────────────

window.showPropPanel = function (pid) {
  var p = G.players[pid];
  if (!p) return;
  var isMe = pid === myId && G.phase === "playing" && G.currentPlayer === pid && G.turnPhase === "continue";
  var isSelf = pid === myId && G.phase === "playing";
  var h = '<div class="prop-panel" id="prop-panel" onclick="if(event.target===this)closePropPanel()">';
  h += '<div class="prop-panel-inner">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">';
  h += '<div style="width:18px;height:18px;border-radius:50%;background:' + p.color + '"></div>';
  h += '<h2 style="margin:0">' + p.name + (pid === myId ? " (Tú)" : "") + '</h2>';
  h += '<div style="margin-left:auto;font-family:Fredoka,sans-serif;font-size:20px;color:var(--accent)">$' + p.money + '</div>';
  h += '</div>';

  if (p.properties.length === 0) {
    h += '<p style="color:var(--muted);font-size:14px;text-align:center;padding:20px 0">Aún no tiene propiedades.</p>';
  } else {
    var byGroup = {};
    for (var i = 0; i < p.properties.length; i++) {
      var sid = p.properties[i], sp = BOARD[sid];
      if (!byGroup[sp.group]) byGroup[sp.group] = [];
      byGroup[sp.group].push(sid);
    }
    var gks = Object.keys(byGroup).sort(function (a, b) { return a - b; });
    for (var g = 0; g < gks.length; g++) {
      var grp = parseInt(gks[g]), sids = byGroup[grp];
      h += '<div style="margin-bottom:12px">';
      h += '<div style="font-size:11px;font-weight:700;color:' + GC[grp] + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;padding:3px 8px;background:' + GC[grp] + '22;border-radius:4px;display:inline-block">Grupo ' + String.fromCharCode(65 + grp) + '</div>';
      for (var s = 0; s < sids.length; s++) {
        var sid2 = sids[s], sp2 = BOARD[sid2];
        var lv = G.volunteers[sid2] || 0;
        var apt = getAporte(sid2);
        var canV = canBuyVol(pid, sid2);
        var vcost = volCostLabel(sid2);
        var vnext = volNextLabel(sid2);
        var pips = "";
        for (var v = 0; v < Math.min(lv, 4); v++) pips += '<div class="vp"></div>';
        if (lv >= 5) pips = '<div class="vp ong">&#9733;</div>';
        h += '<div class="prop-item">';
        h += '<div class="pi-color" style="background:' + GC[grp] + '"></div>';
        h += '<div style="flex:1;min-width:0">';
        h += '<div class="pi-name">' + sp2.name + '</div>';
        h += '<div class="pi-price">Aporte actual: <strong style="color:var(--accent)">$' + apt + '</strong>';
        if (lv > 0) h += ' · ' + (lv < 5 ? lv + " voluntario" + (lv > 1 ? "s" : "") : ' ONG &#9733;');
        h += '</div></div>';
        h += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">';
        h += '<div class="pi-vols">' + pips + '</div>';
        if (isMe && canV) {
          h += '<button class="pi-buy-vol" onclick="buyVolAction(' + sid2 + ')">+' + vnext + ' ($' + vcost + ')</button>';
        } else if (isMe && !canV && lv < 5) {
          var grpSpaces2 = [];
          for (var bi = 0; bi < BOARD.length; bi++) {
            if (BOARD[bi].type === "property" && BOARD[bi].group === grp) grpSpaces2.push(bi);
          }
          var ownsAll = true;
          for (var bj = 0; bj < grpSpaces2.length; bj++) {
            if (G.properties[grpSpaces2[bj]] !== pid) { ownsAll = false; break; }
          }
          var reason = !ownsAll ? "Necesitas todo el grupo" : "Sin fondos";
          h += '<button class="pi-buy-vol" disabled>' + reason + '</button>';
        }
        if (isSelf) {
          h += '<button class="pi-sell" onclick="openSellModal(' + sid2 + ')">Vender</button>';
        }
        h += '</div>';
        h += '</div>';
      }
      h += '</div>';
    }
  }
  h += '<button class="btn btn-secondary" onclick="closePropPanel()" style="width:100%;margin-top:8px"><i class="fas fa-times"></i> Cerrar</button>';
  h += '</div></div>';
  document.body.insertAdjacentHTML("beforeend", h);
};

window.closePropPanel = function () {
  var el = document.getElementById("prop-panel");
  if (el) el.remove();
};

window.buyVolAction = function (spaceId) {
  closePropPanel();
  if (!isHost) sendToHost({ type: "action", action: "buy_vol", pid: myId, data: { spaceId: spaceId } });
  else processAction("buy_vol", myId, { spaceId: spaceId });
};

window.openSellModal = function (spaceId) {
  var sp = BOARD[spaceId];
  if (!sp) return;
  closePropPanel();
  var bankPrice = Math.floor(sp.price / 2);
  var others = G.players.filter(function (pl) { return pl.id !== myId && !pl.eliminated; });
  var mc = document.getElementById("modal-content");
  var h = '<h2><i class="fas fa-hand-holding-usd" style="margin-right:8px;color:#e9c46a"></i>Vender "' + sp.name + '"</h2>';
  h += '<p style="font-size:13px;color:var(--muted);margin-bottom:12px">Puedes venderla al Fondo Común, u ofrecérsela directamente a otro jugador (debe aceptar).</p>';
  if (others.length > 0) {
    h += '<div style="margin-bottom:10px"><label style="font-size:12px;color:var(--muted)">Precio para ofrecer a otro jugador</label><input type="number" id="sell-price-input" value="' + sp.price + '" min="1" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);margin-top:4px;font-family:inherit"></div>';
    h += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">';
    for (var i = 0; i < others.length; i++) {
      h += '<button class="btn btn-secondary" onclick="offerPropToPlayer(' + spaceId + ',' + others[i].id + ')" style="width:100%;text-align:left"><i class="fas fa-user" style="margin-right:6px;color:' + others[i].color + '"></i>Ofrecer a ' + others[i].name + '</button>';
    }
    h += '</div>';
  }
  h += '<button class="btn btn-primary" onclick="sellPropAction(' + spaceId + ',\'' + sp.name.replace(/'/g, "\\'") + '\')" style="width:100%;margin-bottom:8px"><i class="fas fa-university"></i> Vender al Fondo Común por $' + bankPrice + '</button>';
  h += '<button class="btn btn-secondary" onclick="closeModal()" style="width:100%">Cancelar</button>';
  mc.innerHTML = h;
  document.getElementById("modal").classList.add("active");
};

window.offerPropToPlayer = function (spaceId, toPid) {
  var priceInput = document.getElementById("sell-price-input");
  var price = priceInput ? parseInt(priceInput.value, 10) : 0;
  if (!price || price <= 0) { alert("Ingresa un precio válido."); return; }
  closeModal();
  if (!isHost) sendToHost({ type: "action", action: "offer_prop", pid: myId, data: { spaceId: spaceId, toPid: toPid, price: price } });
  else processAction("offer_prop", myId, { spaceId: spaceId, toPid: toPid, price: price });
};

window.sellPropAction = function (spaceId, name) {
  if (!confirm('¿Vender "' + name + '" al Fondo Común por la mitad de su precio? Se perderán las mejoras (voluntarios) que tenga.')) return;
  closeModal();
  if (!isHost) sendToHost({ type: "action", action: "sell_prop", pid: myId, data: { spaceId: spaceId } });
  else processAction("sell_prop", myId, { spaceId: spaceId });
};

// ── MODALES ──────────────────────────────────────────────────────────────

window.doAction = function (a, d) {
  var bypass = (a === "sell_prop" || a === "offer_prop" || a === "accept_trade" ||
    a === "reject_trade" || a === "cancel_trade" || a === "auction_bid" || a === "auction_pass");
  if (processing && !bypass) return;
  if (!isHost) sendToHost({ type: "action", action: a, pid: myId, data: d });
  else processAction(a, myId, d);
};

function showReflectionModal(pr) {
  var p = G.players[pr.pid];
  var mc = document.getElementById("modal-content");
  mc.innerHTML = '<h2><i class="fas fa-brain" style="margin-right:8px;color:#e76f51"></i>Área de Reflexión</h2>' +
    '<p style="color:var(--accent);font-weight:700">' + (p ? p.name : "") + ' dona $' + pr.amount + ' al Fondo Comunitario.</p>' +
    '<div class="reflection-question">' + pr.question + '</div>' +
    '<p style="font-size:13px;color:var(--muted)">Comparte tu respuesta en voz alta con el grupo antes de continuar.</p>' +
    (myId === pr.pid
      ? '<button class="btn btn-primary" onclick="closeReflection()" style="margin-top:12px;width:100%"><i class="fas fa-check"></i> Continuar</button>'
      : '<div class="waiting-msg" style="margin-top:12px">Esperando que ' + (p ? p.name : "") + " continúe...</div>");
  document.getElementById("modal").classList.add("active");
}

window.closeReflection = function () {
  document.getElementById("modal").classList.remove("active");
  doAction('close_reflection');
};

var shownReflectionStr = null;
function checkPendingReflection() {
  var cur = G.pendingReflection ? JSON.stringify(G.pendingReflection) : null;
  if (cur !== shownReflectionStr) {
    shownReflectionStr = cur;
    if (G.pendingReflection) showReflectionModal(G.pendingReflection);
    else {
      var m = document.getElementById("modal");
      if (m) m.classList.remove("active");
    }
  }
}

function showTradeModal(t) {
  var sp = BOARD[t.spaceId], buyer = G.players[t.toPid], seller = G.players[t.fromPid];
  if (!sp || !buyer || !seller) return;
  var mc = document.getElementById("modal-content");
  var h = '<h2><i class="fas fa-handshake" style="margin-right:8px;color:#e9c46a"></i>Oferta de Venta</h2>';
  h += '<p style="font-size:14px;line-height:1.5"><strong>' + seller.name + '</strong> le ofrece <strong>"' + sp.name + '"</strong> a <strong>' + buyer.name + '</strong> por <strong>$' + t.price + '</strong>.</p>';
  if (myId === t.toPid) {
    h += '<div class="action-btns" style="margin-top:12px">' +
      '<button class="btn btn-success" onclick="doAction(\'accept_trade\')"><i class="fas fa-check"></i> Aceptar</button>' +
      '<button class="btn btn-secondary" onclick="doAction(\'reject_trade\')"><i class="fas fa-times"></i> Rechazar</button>' +
      '</div>';
  } else if (myId === t.fromPid) {
    h += '<div class="waiting-msg" style="margin-top:12px">Esperando respuesta de ' + buyer.name + "...</div>";
    h += '<button class="btn btn-secondary" onclick="doAction(\'cancel_trade\')" style="width:100%;margin-top:8px">Cancelar oferta</button>';
  } else {
    h += '<div class="waiting-msg" style="margin-top:12px">Esperando respuesta de ' + buyer.name + "...</div>";
  }
  mc.innerHTML = h;
  document.getElementById("modal").classList.add("active");
}

var shownTradeStr = null;
function checkPendingTrade() {
  var cur = G.pendingTrade ? JSON.stringify(G.pendingTrade) : null;
  if (cur !== shownTradeStr) {
    shownTradeStr = cur;
    if (G.pendingTrade) showTradeModal(G.pendingTrade);
    else {
      var m = document.getElementById("modal");
      if (m) m.classList.remove("active");
    }
  }
}

function showCardM(card, deck, pid) {
  var f = deck === "falta";
  var mc = document.getElementById("modal-content");
  var efectoTexto = "";
  var p = G.players[pid];

  if (card.action === "gain") efectoTexto = "+$" + card.amount + " Generosipoints";
  else if (card.action === "lose") efectoTexto = "-$" + card.amount + " Generosipoints";
  else if (card.action === "fund") efectoTexto = "-$" + card.amount + " al Fondo Comunitario";
  else if (card.action === "collect_all") efectoTexto = "Cada jugador te da $" + card.amount;
  else if (card.action === "pay_all") efectoTexto = "Pagas $" + card.amount + " a cada jugador";
  else if (card.action === "goto") efectoTexto = "Muévete a: " + BOARD[card.position].name;
  else if (card.action === "jail") efectoTexto = "¡Vas a la Cárcel del Individualismo!";
  else if (card.action === "move_back") efectoTexto = "Retrocede " + card.amount + " casillas";
  else if (card.action === "move_fwd") efectoTexto = "Avanza " + card.amount + " casillas";
  else if (card.action === "lose_turn") efectoTexto = "Pierdes tu próximo turno";

  mc.innerHTML = "<h2>" + (f
    ? '<i class="fas fa-times-circle" style="color:#e63946"></i> Falta de Generosidad'
    : '<i class="fas fa-box-open" style="color:#2a9d8f"></i> Cofre Comunitario') + '</h2>' +
    '<div class="card-display ' + (f ? "falta" : "cofre") + '">' +
    '<div class="card-title">' + card.title + '</div>' +
    '<div class="card-text">' + card.text + '</div>' +
    (efectoTexto ? '<div class="card-effect">' + efectoTexto + '</div>' : '') +
    '</div>' +
    (myId === pid
      ? '<button class="btn btn-primary" onclick="acceptCard()" style="margin-top:8px;width:100%"><i class="fas fa-check"></i> Aceptar y aplicar</button>'
      : '<p style="font-size:13px;color:var(--muted)">Esperando que ' + p.name + ' acepte la tarjeta...</p>');
  document.getElementById("modal").classList.add("active");
}

window.closeModal = function () {
  document.getElementById("modal").classList.remove("active");
};

window.acceptCard = function () {
  document.getElementById("modal").classList.remove("active");
  doAction('accept_card');
};

var shownPendingCardStr = null;
function checkPendingCard() {
  var cur = G.pendingCard ? JSON.stringify(G.pendingCard) : null;
  if (cur !== shownPendingCardStr) {
    shownPendingCardStr = cur;
    if (G.pendingCard) showCardM(G.pendingCard.card, G.pendingCard.deck, G.pendingCard.pid);
    else {
      var m = document.getElementById("modal");
      if (m) m.classList.remove("active");
    }
  }
}

function showEndGame() {
  var act = [];
  for (var i = 0; i < G.players.length; i++) {
    if (!G.players[i].eliminated) act.push(G.players[i]);
  }
  if (act.length >= 1 && G.communityFund > 0) {
    var minMoney = Infinity, minP = null;
    for (var j = 0; j < act.length; j++) {
      if (act[j].money < minMoney) { minMoney = act[j].money; minP = act[j]; }
    }
    if (minP && act.length > 1) {
      var half = Math.floor(G.communityFund / 2);
      var rest = G.communityFund - half;
      var others = [];
      for (var k = 0; k < act.length; k++) {
        if (act[k].id !== minP.id) others.push(act[k]);
      }
      var share = others.length > 0 ? Math.floor(rest / others.length) : 0;
      minP.money += half;
      for (var m = 0; m < others.length; m++) others[m].money += share;
      addLog("Fondo ($" + G.communityFund + "): " + minP.name + " recibe $" + half + "; los demás $" + share + " c/u.", true);
    } else if (minP) {
      minP.money += G.communityFund;
      addLog("Fondo ($" + G.communityFund + ") completo a: " + minP.name, true);
    }
    G.communityFund = 0;
  }

  var sorted = G.players.slice().sort(function (a, b) { return b.money - a.money; });
  var mc = document.getElementById("modal-content"), h = '<h2>Fin del Juego</h2><p style="margin-bottom:4px">Resultados finales (incluyendo distribución del Fondo Comunitario):</p><div class="end-results">';
  for (var n = 0; n < sorted.length; n++) {
    var pl = sorted[n], f = n === 0;
    h += '<div class="rank' + (f ? " first" : "") + '">' +
      (f ? "\uD83E\uDD47" : n === 1 ? "\uD83E\uDD48" : n === 2 ? "\uD83E\uDD49" : "") +
      '<div class="rank-num">' + (n + 1) + "</div>" +
      '<div style="width:14px;height:14px;border-radius:50%;background:' + pl.color + ';flex-shrink:0"></div>' +
      '<div style="flex:1">' + pl.name + (pl.id === myId ? " (Tú)" : "") + (pl.eliminated ? " · Eliminado" : "") + '</div>' +
      '<div style="font-weight:700;color:' + (f ? "var(--accent)" : "var(--muted)") + '">$' + pl.money + "</div></div>";
  }
  h += "</div>";
  if (sorted[0] && sorted[0].id === myId) {
    h += '<p style="color:var(--accent);font-weight:700;margin-top:14px"><i class="fas fa-trophy"></i> ¡Felicidades! Eres el más generoso del grupo.</p>';
  } else if (sorted[0]) {
    h += '<p style="color:var(--muted);margin-top:14px"><i class="fas fa-star"></i> ' + sorted[0].name + " es el jugador más generoso!</p>";
  }
  h += '<div style="margin-top:20px;padding:16px;background:rgba(212,160,23,.08);border-radius:10px;text-align:left"><p style="font-family:Fredoka,sans-serif;color:var(--accent);font-size:15px;margin-bottom:8px"><i class="fas fa-comments"></i> Preguntas para reflexionar en grupo:</p><p style="font-size:13px;color:#c0c0b0;line-height:1.7">&#8226; ¿Qué estrategias usaste para ganar Generosipoints?<br>&#8226; ¿Cuándo fue más difícil ser generoso en el juego?<br>&#8226; ¿Qué aprendiste hoy sobre dar sin esperar nada a cambio?</p></div>';
  h += '<button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px;width:100%"><i class="fas fa-redo"></i> Volver al Inicio</button>';
  mc.innerHTML = h;
  document.getElementById("modal").classList.add("active");
  renderAll();
}

// ── ANIMACIONES ──────────────────────────────────────────────────────────

var diceModalTimer = null;

function showDiceModal(name) {
  document.getElementById("dice-modal-player").textContent = name + " está lanzando los dados...";
  document.getElementById("dice-modal-result").textContent = "";
  renderDie(document.getElementById("mdie1"), 1);
  renderDie(document.getElementById("mdie2"), 1);
  document.getElementById("dice-modal").classList.add("active");
}

function runDiceModalAnimation(d1, d2, onDone) {
  if (diceModalTimer) { clearInterval(diceModalTimer); diceModalTimer = null; }
  var e1 = document.getElementById("mdie1"), e2 = document.getElementById("mdie2");
  if (!e1 || !e2) { if (onDone) onDone(); return; }
  e1.classList.add("rolling");
  e2.classList.add("rolling");
  var c = 0;
  diceModalTimer = setInterval(function () {
    renderDie(e1, Math.floor(Math.random() * 6) + 1);
    renderDie(e2, Math.floor(Math.random() * 6) + 1);
    c++;
    if (c > 8) {
      clearInterval(diceModalTimer);
      diceModalTimer = null;
      e1.classList.remove("rolling");
      e2.classList.remove("rolling");
      renderDie(e1, d1);
      renderDie(e2, d2);
      document.getElementById("dice-modal-result").textContent = (d1 === d2 ? "¡Dobles!" : "Total: " + (d1 + d2));
      setTimeout(function () {
        document.getElementById("dice-modal").classList.remove("active");
        if (onDone) onDone();
      }, 800);
    }
  }, 60);
}

function clientAnimateDice(d1, d2, name) {
  showDiceModal(name || "Jugador");
  runDiceModalAnimation(d1, d2);
}

function clientAnimateMove(pid, fromPos, toPos, moveType) {
  var p = G.players[pid];
  if (!p || p.eliminated) return;
  p.position = fromPos;
  renderTokens();
  if (moveType === "instant") { p.position = toPos; renderTokens(); return; }
  var backward = moveType === "backward";
  var steps = backward ? (fromPos - toPos + 40) % 40 : (toPos - fromPos + 40) % 40;
  var moved = 0;
  function step() {
    if (moved >= steps) { p.position = toPos; renderTokens(); return; }
    p.position = backward ? (p.position - 1 + 40) % 40 : (p.position + 1) % 40;
    renderTokens();
    moved++;
    setTimeout(step, 200);
  }
  setTimeout(step, 100);
}

function showRulesModal() {
  var mc = document.getElementById("modal-content");
  mc.innerHTML = '<h2><i class="fas fa-book" style="margin-right:8px"></i>Reglamento de Generosopoly</h2>' +
    RULES_HTML +
    '<button class="btn btn-primary" onclick="closeModal()" style="margin-top:20px;width:100%"><i class="fas fa-check"></i> Entendido</button>';
  document.getElementById("modal").classList.add("active");
}
window.showRules = showRulesModal;

// ── TAB SWITCH ───────────────────────────────────────────────────────────

window.switchTab = function (t, el) {
  var bs = document.querySelectorAll(".tab-btn");
  for (var i = 0; i < bs.length; i++) bs[i].classList.remove("active");
  el.classList.add("active");
  document.getElementById("tab-create").style.display = t === "create" ? "block" : "none";
  document.getElementById("tab-join").style.display = t === "join" ? "block" : "none";
};
