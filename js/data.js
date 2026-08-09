// ── CONSTANTES DEL JUEGO ──────────────────────────────────────────────────
var INIT_MONEY = 2500;

// ── TABLERO REAL (basado en el tablero físico) ────────────────────────────
// Grupos de color por fila:
// G0=naranja(Tutorías+Taller), G1=rosado(Adult.May/Comedor/Huerto/Parque),
// G2=azul oscuro(Consumo/C.Lim), G3=cyan(Fauna/Empren/Inclusión),
// G4=verde(Campaña/Jornada), G5=café(Mentorías/Intercambio),
// G6=rojo oscuro(Yoga/Deporte), G7=mixto premium

var BOARD = [
  {id:0,  name:"Punto de Partida de la Generosidad", short:"PARTIDA",   type:"go",      icon:"fa-heart"},
  {id:1,  name:"Tutorías Voluntarias",               short:"Tutorías",  type:"property", price:350, aporte:100, group:0},
  {id:2,  name:"Cofre Comunitario",                  short:"COFRE",     type:"cofre",    icon:"fa-box-open"},
  {id:3,  name:"Asistencia a Adultos Mayores",       short:"Adult.May.",type:"property", price:300, aporte:50,  group:1},
  {id:4,  name:"Impuesto de Solidaridad",            short:"IMP.SOL.",  type:"tax",      amount:150,icon:"fa-file-invoice-dollar"},
  {id:5,  name:"Centro de Reciclaje",                short:"Reciclaje", type:"property", price:300, aporte:50,  group:1},
  {id:6,  name:"Día de Servicio",                    short:"SERVICIO",  type:"servicio", icon:"fa-hands-helping"},
  {id:7,  name:"Comedor Solidario",                  short:"Comedor",   type:"property", price:300, aporte:50,  group:1},
  {id:8,  name:"Huerto Comunitario",                 short:"Huerto",    type:"property", price:250, aporte:50,  group:1},
  {id:9,  name:"Parque Limpio",                      short:"Parque",    type:"property", price:250, aporte:50,  group:1},
  {id:10, name:"Cárcel del Individualismo",          short:"CÁRCEL",    type:"jail",     icon:"fa-lock"},
  {id:11, name:"Taller de Habilidades",              short:"T.Habilid.",type:"property", price:350, aporte:100, group:0},
  {id:12, name:"Talleres de Consumo Responsable",    short:"T.Consumo", type:"property", price:500, aporte:150, group:2},
  {id:13, name:"Cofre Comunitario",                  short:"COFRE",     type:"cofre",    icon:"fa-box-open"},
  {id:14, name:"Campañas Limpieza Ríos/Playas",      short:"C.Playas",  type:"property", price:500, aporte:150, group:2},
  {id:15, name:"Protección de Fauna Local",          short:"Fauna",     type:"property", price:500, aporte:150, group:3},
  {id:16, name:"Emprendimiento Social",              short:"Emprend.",  type:"property", price:450, aporte:150, group:3},
  {id:17, name:"Proyecto de Inclusión",              short:"Inclusión", type:"property", price:450, aporte:150, group:3},
  {id:18, name:"Impuesto Ambiental",                 short:"IMP.AMB.",  type:"tax",      amount:200,icon:"fa-leaf"},
  {id:19, name:"Área de Reflexión",                  short:"REFLEX.",   type:"reflexion",icon:"fa-brain"},
  {id:20, name:"Día de Servicio",                    short:"SERVICIO",  type:"servicio", icon:"fa-hands-helping"},
  {id:21, name:"Campaña de Conciencia",              short:"C.Concienc",type:"property", price:400, aporte:100, group:4},
  {id:22, name:"Falta de Generosidad",               short:"FALTA",     type:"falta",    icon:"fa-times-circle"},
  {id:23, name:"Jornada de Donación",                short:"Jornada",   type:"property", price:400, aporte:100, group:4},
  {id:24, name:"Cofre Comunitario",                  short:"COFRE",     type:"cofre",    icon:"fa-box-open"},
  {id:25, name:"Programa de Mentorías Comunitarias", short:"Mentorías", type:"property", price:550, aporte:200, group:5},
  {id:26, name:"Falta de Generosidad",               short:"FALTA",     type:"falta",    icon:"fa-times-circle"},
  {id:27, name:"Espacio de Intercambio Cultural",    short:"Intercambio",type:"property",price:550, aporte:200, group:5},
  {id:28, name:"Reto de Generosidad",                short:"RETO",      type:"gotojail", icon:"fa-exclamation-triangle"},
  {id:29, name:"Clases de Yoga y Meditación Abiertas",short:"Yoga/Medit.",type:"property",price:600,aporte:250,group:6},
  {id:30, name:"Área de Reflexión",                  short:"REFLEX.",   type:"reflexion",icon:"fa-brain"},
  {id:31, name:"Donación de Material Deportivo",     short:"Mat.Deport.",type:"property",price:600, aporte:250, group:6},
  {id:32, name:"Impuesto de Equidad",                short:"IMP.EQU.",  type:"tax",      amount:300,icon:"fa-balance-scale"},
  {id:33, name:"Cofre Comunitario",                  short:"COFRE",     type:"cofre",    icon:"fa-box-open"},
  {id:34, name:"Falta de Generosidad",               short:"FALTA",     type:"falta",    icon:"fa-times-circle"},
  {id:35, name:"Área de Reflexión",                  short:"REFLEX.",   type:"reflexion",icon:"fa-brain"},
  {id:36, name:"Banco de Alimentos",                 short:"Banco Alim",type:"property", price:400, aporte:120, group:4},
  {id:37, name:"Brigada de Salud Comunitaria",       short:"B.Salud",   type:"property", price:500, aporte:175, group:3},
  {id:38, name:"Escuela Comunitaria",                short:"Escuela",   type:"property", price:550, aporte:200, group:5},
  {id:39, name:"Hospital de Campaña",                short:"Hospital",  type:"property", price:650, aporte:250, group:6}
];

// ── TABLA DE APORTES POR NIVEL DE VOLUNTARIOS ────────────────────────────
// [base, vol1, vol2, vol3, vol4, ONG]
var VOL_APORTES = {
  0: [100, 150, 200, 250, 300, 500],
  1: [50,  100, 150, 200, 250, 400],
  2: [150, 200, 250, 300, 350, 600],
  3: [150, 200, 250, 300, 350, 600],
  4: [100, 150, 200, 250, 300, 500],
  5: [200, 250, 300, 350, 400, 550],
  6: [250, 250, 300, 350, 400, 550],
  7: [120, 175, 225, 275, 325, 500]
};

// Costo de comprar cada mejora
var VOL_COST = {0:100, 1:50, 2:150, 3:150, 4:100, 5:200, 6:250, 7:120};

// Colores por grupo
var GC = ["#f77f00","#e91e8c","#1565c0","#00838f","#4caf50","#795548","#b71c1c","#d4a017"];

// Colores de jugadores
var PC = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#9b5de5","#f77f00"];

// ── TARJETAS COFRE COMUNITARIO ───────────────────────────────────────────
var CC = [
  {title:"Acto de Amabilidad",      text:"Ayudaste a un compañero con sus tareas.",                      action:"gain",       amount:50},
  {title:"Compartir Conocimiento",  text:"Enseñaste algo nuevo a tus amigos.",                            action:"gain",       amount:100},
  {title:"Voluntariado en la Escuela", text:"Dedicaste tiempo a mejorar tu entorno escolar.",            action:"move_fwd",   amount:2},
  {title:"Apoyo Incondicional",     text:"Estuviste ahí para alguien que te necesitaba.",                action:"collect_all",amount:100},
  {title:"Inspiración",             text:"Tu generosidad motivó a otros. Cada jugador te da 50 pts.",    action:"collect_all",amount:50},
  {title:"Sorpresa",                text:"Un acto de generosidad regresa a ti.",                          action:"gain",       amount:150},
  {title:"Bonificación por Empatía",text:"Comprendiste y apoyaste a un compañero.",                      action:"gain",       amount:100},
  {title:"Iniciativa Solidaria",    text:"Organizaste una pequeña acción de ayuda. ¡Avanza al Día de Servicio!", action:"goto", position:6, collectGO:true},
  {title:"Círculo de Amistad",      text:"Ayudaste a un nuevo estudiante a sentirse incluido. Cada jugador te da 50 pts.", action:"collect_all",amount:50},
  {title:"El Regalo de Escuchar",   text:"Dedicaste tiempo a escuchar atentamente a un amigo.",          action:"gain",       amount:100},
  {title:"Un Amigo en Apuros",      text:"Escuchaste y apoyaste a alguien que lo necesitaba.",            action:"gain",       amount:50},
  {title:"Héroe del Receso",        text:"Resolviste un pequeño conflicto entre amigos. Cada jugador te da 50 pts.", action:"collect_all",amount:50},
  {title:"Bonificación Extra",      text:"Por tu actitud siempre positiva y de ayuda.",                  action:"gain",       amount:150},
  {title:"Avanza al Punto de Partida", text:"¡Tu generosidad te lleva de vuelta al inicio! Cobra 200 pts.",action:"goto",position:0,collectGO:true},
  {title:"Donación Anónima",        text:"Recibes una donación anónima para tu proyecto comunitario.",   action:"gain",       amount:200}
];

// ── TARJETAS FALTA DE GENEROSIDAD ────────────────────────────────────────
var CF = [
  {title:"Oportunidad Perdida",     text:"No compartiste tus materiales. Aporta al Cofre Solidario.",    action:"fund",       amount:50},
  {title:"Falta de Colaboración",   text:"Preferiste trabajar solo. Ve hasta el Área de Reflexión.",     action:"goto",       position:19, collectGO:false},
  {title:"Pequeño Olvido",          text:"No devolviste algo que te prestaron. Aporta al Cofre Solidario.", action:"fund",    amount:50},
  {title:"Actitud Individualista",  text:"Solo pensaste en ti mismo.",                                    action:"jail"},
  {title:"Descuido con el Entorno", text:"Dejaste un desorden para que otros lo limpiaran.",              action:"fund",       amount:50},
  {title:"Reto de Empatía",         text:"Tienes que reflexionar sobre una situación difícil.",            action:"lose_turn"},
  {title:"Promesa Incumplida",      text:"No cumpliste con una pequeña promesa.",                         action:"fund",       amount:50},
  {title:"Distracción",             text:"No estuviste atento a las necesidades de los demás.",           action:"fund",       amount:50},
  {title:"Un Poco de Desorden",     text:"Dejaste algo tirado y otro tuvo que recogerlo. Ve al Área de Reflexión.", action:"goto", position:19, collectGO:false},
  {title:"Mirada al Ombligo",       text:"Estuviste demasiado concentrado en ti mismo para ver una necesidad.", action:"fund", amount:50},
  {title:"Mensaje Mal Entendido",   text:"Tu comunicación no fue clara y causó un pequeño problema. Pierdes tu próximo turno.", action:"lose_turn"},
  {title:"Impulso de Egoísmo",      text:"Tomaste algo sin preguntar.",                                   action:"jail"},
  {title:"Paga a cada jugador",     text:"Falta de transparencia en tus acciones. Paga $50 a cada jugador.", action:"pay_all", amount:50},
  {title:"Retrocede 3 casillas",    text:"Te negaste a colaborar con tus compañeros.",                   action:"move_back",  amount:3},
  {title:"Contribuye al Fondo",     text:"Tu actitud egoísta afectó al grupo. Paga al Fondo Comunitario.", action:"fund",     amount:100}
];

// ── PREGUNTAS DE REFLEXIÓN ───────────────────────────────────────────────
var REFLEXION_Q = [
  "¿Hubo algún momento hoy en que ayudaste a alguien sin esperar nada a cambio?",
  "¿Qué significa ser generoso cuando cuesta algo?",
  "¿Cómo te sientes cuando alguien te da algo sin pedírtelo?",
  "¿Qué diferencia hay entre dar porque quieres y dar porque te obligan?",
  "¿Puedes pensar en alguien que necesite tu ayuda hoy?"
];

// ── REGLAS HTML ──────────────────────────────────────────────────────────
var RULES_HTML = '<div class="rules-content">' +
  '<h3>Objetivo del Juego</h3><p>Acumular la mayor cantidad de <strong>Generosipoints</strong>. ¡No se trata de arruinar a los demás, sino de ser el más generoso!</p>' +
  '<h3>Inicio</h3><ul><li>Cada jugador recibe <strong>2500 Generosipoints</strong>.</li><li>El turno avanza en sentido horario.</li></ul>' +
  '<h3>Al Lanzar los Dados</h3><ul><li>Avanza tu ficha el número de casillas indicado.</li><li>Si sacas <strong>dobles</strong>, tienes un turno extra.</li><li>Si sacas dobles <strong>3 veces seguidas</strong>, vas a la Cárcel sin turno extra.</li></ul>' +
  '<h3>Punto de Partida (GO)</h3><ul><li>Cada vez que <strong>pases o caigas</strong> en esta casilla, recibes <strong>200 Generosipoints</strong>.</li></ul>' +
  '<h3>Casillas de Propiedad</h3><ul><li>Si no tiene dueño: puedes <strong>comprarla</strong> pagando al banco.</li><li>Si decides no comprar: se inicia una <strong>subasta</strong>.</li><li>Si tiene dueño: pagas el <strong>aporte</strong> al dueño (aumenta con voluntarios).</li><li>Si el dueño eres tú: no pasa nada, pero puedes mejorarla.</li></ul>' +
  '<h3>Voluntarios y ONG de Apoyo</h3><ul><li>Cuando <strong>posees todos los proyectos del mismo color</strong>, puedes agregar Voluntarios.</li><li>Cada proyecto puede tener hasta <strong>4 Voluntarios</strong> y luego una <strong>ONG de Apoyo</strong>.</li><li>Cada mejora <strong>aumenta el aporte</strong> que cobras cuando otros caen en tu propiedad.</li><li>El costo de cada mejora se descuenta de tus Generosipoints.</li><li>Para comprar: en tu turno, en la fase de "Continuar", haz clic en <strong>"Mis proyectos"</strong>.</li><li>En el tablero verás puntos verdes (voluntarios) y una estrella dorada (ONG).</li></ul>' +
  '<h3>Cofre Comunitario</h3><ul><li>Toma la tarjeta superior, léela en voz alta y sigue las instrucciones.</li></ul>' +
  '<h3>Falta de Generosidad</h3><ul><li>Toma la tarjeta superior, léela en voz alta y sigue las instrucciones.</li></ul>' +
  '<h3>Impuestos</h3><ul><li>Pagas la cantidad indicada al <strong>Fondo Comunitario</strong>.</li></ul>' +
  '<h3>Área de Reflexión</h3><ul><li>Donas <strong>50 Generosipoints</strong> al Fondo Comunitario.</li><li>Respondes una pregunta de reflexión ética.</li></ul>' +
  '<h3>Día de Servicio</h3><ul><li>Puedes <strong>donar voluntariamente</strong> 50 Generosipoints al Fondo, o simplemente esperar tu siguiente turno.</li></ul>' +
  '<h3>Reto de Generosidad</h3><ul><li>Vas directamente a la <strong>Cárcel del Individualismo</strong> sin pasar por el Punto de Partida.</li></ul>' +
  '<h3>Cárcel del Individualismo</h3><ul><li>Si caes por dados: solo estás de <strong>visita</strong>.</li><li>Si te envían: tienes <strong>3 turnos</strong> para salir.<ul><li>Intenta sacar <strong>dobles</strong>.</li><li>Paga <strong>150 Generosipoints</strong> para salir inmediatamente.</li><li>Si no logras dobles en 3 turnos, pagas $150 y avanzas.</li></ul></li></ul>' +
  '<h3>Subastas</h3><ul><li>Puja mínima: mitad del precio. Cada puja sube $10.</li><li>Cualquier jugador puede pujar o pasar.</li></ul>' +
  '<h3>Fondo Comunitario</h3><ul><li>Al final: el jugador con <strong>menos</strong> Generosipoints recibe la <strong>mitad</strong> del fondo; la otra mitad se reparte entre los demás.</li></ul>' +
  '<h3>Fin del Juego</h3><ul><li>Termina por tiempo o vueltas completadas.</li><li>Gana quien tenga <strong>más</strong> Generosipoints (incluyendo distribución del Fondo).</li></ul>' +
  '</div>';
