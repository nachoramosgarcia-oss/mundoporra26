// src/puntos.js
//
// Sistema de puntuación del Mundial 2026.
// Toma una porra (predicciones de un participante) + resultados reales,
// y devuelve un desglose detallado de puntos.

import { asignarTercerosAnexoC } from './anexo-c.js';

// ============================================================
// TABLA DE PUNTOS
// ============================================================
export const PTS = {
  grupos: { signo: 2, dif: 1, exacto: 2 },
  grupos_posicion: 2,        // por cada posición exacta (1º, 2º, 3º, 4º) en cada grupo
  diecisei: { clasif: 1, signo: 3, dif: 2, exacto: 3 },
  octavos: { clasif: 4, signo: 4, dif: 3, exacto: 4 },
  cuartos: { clasif: 10, signo: 8, dif: 8, exacto: 8 },
  semis: { clasif: 25, signo: 10, dif: 10, exacto: 10 },
  tercerPuesto: { clasif: 16, signo: 12, dif: 12, exacto: 12 },
  final: { clasif: 35, signo: 20, dif: 20, exacto: 20 },
  titulos: { campeon: 100, subcampeon: 40, tercerClasif: 30 },
  premios: { balon: 20, bota: 20, guante: 20 },
};

// ============================================================
// UTILIDADES
// ============================================================
function normaliza(texto) {
  if (!texto) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Comparación flexible para nombres de jugadores (premios)
export function coincidePremio(pred, real) {
  const a = normaliza(pred);
  const b = normaliza(real);
  if (!a || !b) return false;
  if (a === b) return true;
  // Si uno contiene al otro, también lo damos por bueno
  // ("Mbappé" coincide con "Kylian Mbappé", "Yamal" con "Lamine Yamal")
  return a.includes(b) || b.includes(a);
}

function tieneMarcador(r) {
  return r && r.golesLocal !== '' && r.golesLocal != null
      && r.golesVisitante !== '' && r.golesVisitante != null;
}

function getSigno(gl, gv) {
  const a = parseInt(gl), b = parseInt(gv);
  if (isNaN(a) || isNaN(b)) return null;
  if (a > b) return '1';
  if (a < b) return '2';
  return 'X';
}

function getDif(gl, gv) {
  const a = parseInt(gl), b = parseInt(gv);
  if (isNaN(a) || isNaN(b)) return null;
  return a - b;
}

// ============================================================
// PUNTUACIÓN DE UN PARTIDO (signo / diferencia / exacto)
// ============================================================
export function puntuaPartido(pred, real, escala) {
  if (!tieneMarcador(pred) || !tieneMarcador(real)) {
    return { signo: 0, dif: 0, exacto: 0, total: 0 };
  }
  const sP = getSigno(pred.golesLocal, pred.golesVisitante);
  const sR = getSigno(real.golesLocal, real.golesVisitante);
  const dP = getDif(pred.golesLocal, pred.golesVisitante);
  const dR = getDif(real.golesLocal, real.golesVisitante);
  const ePred = pred.golesLocal === real.golesLocal && pred.golesVisitante === real.golesVisitante;

  let signo = 0, dif = 0, exacto = 0;
  if (sP === sR) signo = escala.signo;
  if (sP === sR && dP === dR) dif = escala.dif;
  if (ePred) exacto = escala.exacto;
  return { signo, dif, exacto, total: signo + dif + exacto };
}

// ============================================================
// CLASIFICACIÓN DE GRUPO con criterios FIFA
// ============================================================
// ============================================================
// CLASIFICACIÓN DE UN GRUPO con criterios FIFA oficiales
// ============================================================
//
// Si dos o más equipos empatan a puntos, se aplica:
//
// PRIMER PASO (mini-clasificación entre los empatados):
//   1) Puntos en partidos entre los empatados (head-to-head)
//   2) Diferencia de goles en partidos entre los empatados
//   3) Goles marcados en partidos entre los empatados
//
// SEGUNDO PASO (si siguen empatados):
//   4) Diferencia de goles global (todos los partidos del grupo)
//   5) Goles marcados global
//
// Si tras todo eso siguen empatados, se aplica desempate manual
// (decidido por el participante o el admin).
//
// Devuelve { tabla, empates }
//   tabla: array de stats ordenados (1.º, 2.º, 3.º, 4.º)
//   empates: array de { equipos, startIdx, resolved, key } con los empates
//            persistentes que requieren decisión manual.
// ============================================================
export function clasificacionGrupo(equipos, partidosGrupo, resultados, desempates) {
  const stats = {};
  equipos.forEach(eq => {
    stats[eq] = { equipo: eq, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
  });

  // Acumular partidos jugados (con marcador válido)
  const partidosJugados = [];
  partidosGrupo.forEach(p => {
    const r = resultados[p.id];
    if (!tieneMarcador(r)) return;
    const gl = parseInt(r.golesLocal), gv = parseInt(r.golesVisitante);
    if (isNaN(gl) || isNaN(gv)) return;
    const L = stats[p.local], V = stats[p.visitante];
    if (!L || !V) return;
    L.pj++; V.pj++;
    L.gf += gl; L.gc += gv;
    V.gf += gv; V.gc += gl;
    if (gl > gv) { L.pg++; L.pts += 3; V.pp++; }
    else if (gl < gv) { V.pg++; V.pts += 3; L.pp++; }
    else { L.pe++; V.pe++; L.pts++; V.pts++; }
    partidosJugados.push({ local: p.local, visitante: p.visitante, gl, gv });
  });
  Object.values(stats).forEach(s => { s.dg = s.gf - s.gc; });

  // Orden inicial por puntos globales
  const arr = Object.values(stats);
  arr.sort((a, b) => b.pts - a.pts);

  // Para cada subgrupo de equipos empatados a puntos, aplicar criterios FIFA
  let i = 0;
  while (i < arr.length) {
    const ptsBase = arr[i].pts;
    let j = i + 1;
    while (j < arr.length && arr[j].pts === ptsBase) j++;
    if (j - i > 1) {
      const subgrupo = arr.slice(i, j);
      _resolverSubgrupoFIFA(subgrupo, partidosJugados);
      for (let k = 0; k < subgrupo.length; k++) arr[i + k] = subgrupo[k];
    }
    i = j;
  }

  // Detectar empates persistentes (mismo orden FIFA todavía) y aplicar
  // desempate manual si lo hay. Sólo se consideran empates si TODOS los
  // equipos del subgrupo han jugado sus 3 partidos (sino, esperamos a que
  // termine el grupo antes de pedir desempate al usuario).
  const empateGroups = [];
  let k = 0;
  while (k < arr.length) {
    const grupo = [arr[k]];
    let m = k + 1;
    while (m < arr.length && _equiposPersistentementeEmpatados(arr[k], arr[m], arr, partidosJugados)) {
      grupo.push(arr[m]); m++;
    }
    if (grupo.length > 1 && grupo.every(e => e.pj === 3)) {
      empateGroups.push({ startIdx: k, equipos: grupo });
    }
    k = m;
  }

  // Aplicar desempates manuales si existen
  if (desempates && empateGroups.length > 0) {
    empateGroups.forEach(eg => {
      const key = eg.equipos.map(e => e.equipo).sort().join('|');
      const orderStr = desempates[key];
      if (orderStr) {
        const desired = orderStr.split('|');
        const ordered = desired.map(name => eg.equipos.find(e => e.equipo === name)).filter(Boolean);
        if (ordered.length === eg.equipos.length) {
          ordered.forEach((eq, idx) => { arr[eg.startIdx + idx] = eq; });
        }
      }
    });
  }

  // Info de empates pendientes/resueltos para la UI
  const empates = empateGroups.map(eg => {
    const key = eg.equipos.map(e => e.equipo).sort().join('|');
    return {
      equipos: eg.equipos.map(e => e.equipo),
      startIdx: eg.startIdx,
      resolved: !!(desempates && desempates[key]),
      key,
    };
  });

  return { tabla: arr, empates };
}

// ============================================================
// HELPERS internos para clasificación FIFA
// ============================================================

// Ordena un subgrupo de equipos empatados a puntos aplicando criterios FIFA
// (primer paso head-to-head, segundo paso dg/gf globales). Mutación in-place.
function _resolverSubgrupoFIFA(subgrupo, partidosJugados) {
  const equiposSet = new Set(subgrupo.map(e => e.equipo));
  const partidosEntreEllos = partidosJugados.filter(p =>
    equiposSet.has(p.local) && equiposSet.has(p.visitante)
  );
  const partidosEsperados = subgrupo.length * (subgrupo.length - 1) / 2;

  // Calcular mini-stats si todos los partidos entre ellos están jugados
  let miniStats = null;
  if (partidosEntreEllos.length === partidosEsperados && partidosEsperados > 0) {
    miniStats = {};
    subgrupo.forEach(e => {
      miniStats[e.equipo] = { equipo: e.equipo, pts: 0, gf: 0, gc: 0, dg: 0 };
    });
    partidosEntreEllos.forEach(p => {
      const L = miniStats[p.local], V = miniStats[p.visitante];
      L.gf += p.gl; L.gc += p.gv;
      V.gf += p.gv; V.gc += p.gl;
      if (p.gl > p.gv) L.pts += 3;
      else if (p.gl < p.gv) V.pts += 3;
      else { L.pts++; V.pts++; }
    });
    Object.values(miniStats).forEach(s => { s.dg = s.gf - s.gc; });
  }

  subgrupo.sort((a, b) => {
    if (miniStats) {
      const mA = miniStats[a.equipo], mB = miniStats[b.equipo];
      // PRIMER PASO
      if (mB.pts !== mA.pts) return mB.pts - mA.pts;
      if (mB.dg !== mA.dg) return mB.dg - mA.dg;
      if (mB.gf !== mA.gf) return mB.gf - mA.gf;
    }
    // SEGUNDO PASO
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  });

  // Adjuntar miniStats a cada equipo para detectar empates persistentes después
  if (miniStats) {
    subgrupo.forEach(e => { e._mini = miniStats[e.equipo]; });
  }
}

// Dos equipos quedan "persistentemente empatados" si tras aplicar todos los
// criterios FIFA siguen indistinguibles.
function _equiposPersistentementeEmpatados(a, b, arr, partidosJugados) {
  if (a.pts !== b.pts) return false;
  if (a.dg !== b.dg) return false;
  if (a.gf !== b.gf) return false;
  // Si tienen miniStats (porque estaban en el mismo subgrupo de empate a pts),
  // comparar también esos
  if (a._mini && b._mini) {
    if (a._mini.pts !== b._mini.pts) return false;
    if (a._mini.dg !== b._mini.dg) return false;
    if (a._mini.gf !== b._mini.gf) return false;
  }
  return true;
}

// ============================================================
// CÁLCULO COMPLETO DE PUNTOS DE UNA PORRA
// ============================================================
//
// porra: predicciones del usuario
//   { resultados, resultadosKO, premios, desempates, desempateTerceros }
// real: resultados reales (mismo esquema)
//
// CONSTANTES PASADAS COMO PARÁMETROS (para no acoplar):
//   GRUPOS, PARTIDOS, R32_PAIRS, R16_PAIRS, QF_PAIRS, SF_PAIRS,
//   FINAL_PAIR, THIRD_PLACE
//
// Devuelve un objeto detallado con puntos por fase.
//
export function calcularPuntos(porra, real, constantes) {
  const {
    GRUPOS, PARTIDOS, R32_PAIRS, R16_PAIRS, QF_PAIRS, SF_PAIRS,
    FINAL_PAIR, THIRD_PLACE
  } = constantes;

  porra = porra || {};
  real = real || {};
  const pRes = porra.resultados || {};
  const pKO = porra.resultadosKO || {};
  const pPrem = porra.premios || {};
  const pDes = porra.desempates || {};
  const pDesT = porra.desempateTerceros || {};

  // ============================================================
  // FILTRADO POR PARTIDOS PUBLICADOS
  // ============================================================
  // Solo cuentan los partidos cuyo ID está en real.partidosPublicados.
  // Los demás se ven como "sin jugar" a efectos de cálculo de puntos,
  // clasificaciones de grupo, cruces KO, etc.
  //
  // Compatibilidad:
  // - partidosPublicados = undefined/null  → modo legacy, TODOS publicados.
  // - partidosPublicados = {}              → ninguno publicado.
  // - partidosPublicados = { R32_1: ts }   → solo R32_1 publicado.
  const partidosPub = real.partidosPublicados;
  const modoLegacy = partidosPub === undefined || partidosPub === null;
  const estaPublicado = (id) => modoLegacy ? true : !!partidosPub[id];

  // Construir versiones filtradas de los resultados reales
  const _rResRaw = real.resultados || {};
  const _rKORaw = real.resultadosKO || {};
  const rRes = {};
  Object.keys(_rResRaw).forEach(id => {
    if (estaPublicado(id)) rRes[id] = _rResRaw[id];
  });
  const rKO = {};
  Object.keys(_rKORaw).forEach(id => {
    if (estaPublicado(id)) rKO[id] = _rKORaw[id];
  });

  const rPrem = real.premios || {};
  const rDes = real.desempates || {};
  const rDesT = real.desempateTerceros || {};
  const rTitulos = real.titulos || {}; // { campeon, subcampeon, tercer }

  let ptsGrupos = 0;
  let ptsGruposPos = 0;
  let ptsClasif1_16 = 0, pts1_16 = 0;
  let ptsClasifOct = 0, ptsOct = 0;
  let ptsClasifQF = 0, ptsQF = 0;
  let ptsClasifSF = 0, ptsSF = 0;
  let ptsClasif34 = 0, pts34 = 0;
  let ptsClasifFinal = 0, ptsFinal = 0;
  let ptsCampeon = 0, ptsSub = 0, pts3 = 0;
  let ptsBalon = 0, ptsBota = 0, ptsGuante = 0;

  const detallePartidos = []; // [{ id, fase, puntos: {signo, dif, exacto, total} }]

  // ---- 1) GRUPOS: 72 partidos ----
  PARTIDOS.forEach(p => {
    const pred = pRes[p.id];
    const realM = rRes[p.id];
    const pts = puntuaPartido(pred, realM, PTS.grupos);
    ptsGrupos += pts.total;
    detallePartidos.push({ id: p.id, fase: 'grupos', puntos: pts });
  });

  // ---- 2) POSICIONES EXACTAS EN GRUPOS ----
  Object.entries(GRUPOS).forEach(([letra, equipos]) => {
    const partidosG = PARTIDOS.filter(p => p.grupo === letra);
    // ¿La clasificación real de este grupo está disponible? (los 6 partidos jugados)
    const realCompleto = partidosG.every(p => tieneMarcador(rRes[p.id]));
    if (!realCompleto) return;
    const clasifReal = clasificacionGrupo(equipos, partidosG, rRes, rDes && rDes[letra]).tabla;
    const clasifPred = clasificacionGrupo(equipos, partidosG, pRes, pDes && pDes[letra]).tabla;
    for (let pos = 0; pos < 4; pos++) {
      if (clasifPred[pos] && clasifReal[pos] && clasifPred[pos].equipo === clasifReal[pos].equipo) {
        ptsGruposPos += PTS.grupos_posicion;
      }
    }
  });

  // ---- 3) CLASIFICACIONES DE EQUIPOS EN CADA RONDA ----
  // Para cada ronda: lista de equipos en la predicción vs lista de equipos en la realidad.
  // Por cada equipo que coincide → puntos de clasif.

  // Equipos por ronda según la realidad
  function equiposEnRonda(pairs, KO, prevPairs, resCache) {
    // Recibe el array de pairs de la ronda y resuelve a partir de los resultadosKO
    // Devuelve un Set con los nombres de equipos
    const set = new Set();
    pairs.forEach(pair => {
      const a = resCache[pair.id]?.a;
      const b = resCache[pair.id]?.b;
      if (a) set.add(a);
      if (b) set.add(b);
    });
    return set;
  }

  // Cache de cruces resueltos según realidad
  function resolverCruces(KO_res, des, desT) {
    // Recalcular clasificaciones de todos los grupos
    const clas = {};
    Object.entries(GRUPOS).forEach(([letra, equipos]) => {
      const pGr = PARTIDOS.filter(p => p.grupo === letra);
      clas[letra] = clasificacionGrupo(equipos, pGr, rRes, des && des[letra]).tabla;
    });
    // Mejores terceros
    const terceros = [];
    Object.entries(clas).forEach(([letra, tabla]) => {
      if (tabla[2] && tabla[2].pj === 3) terceros.push({ ...tabla[2], grupo: letra });
    });
    terceros.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return 0;
    });
    // Aplicar desempates de terceros
    if (desT) {
      let i = 0;
      while (i < terceros.length) {
        const g = [terceros[i]]; let j = i + 1;
        while (j < terceros.length && terceros[j].pts === terceros[i].pts && terceros[j].dg === terceros[i].dg && terceros[j].gf === terceros[i].gf) {
          g.push(terceros[j]); j++;
        }
        if (g.length > 1) {
          const key = g.map(e => e.equipo).sort().join('|');
          const orderStr = desT[key];
          if (orderStr) {
            const desired = orderStr.split('|');
            const ordered = desired.map(name => g.find(e => e.equipo === name)).filter(Boolean);
            if (ordered.length === g.length) ordered.forEach((eq, idx) => { terceros[i + idx] = eq; });
          }
        }
        i = j;
      }
    }
    // Aplicar Anexo C FIFA: asignar los 8 mejores terceros a los R32 que reciben tercero
    const top8 = terceros.slice(0, 8);
    const r32ATercero = (top8.length === 8) ? asignarTercerosAnexoC(top8) : {};
    // Resolver cruces R32 según refs
    const cruces = {};
    R32_PAIRS.forEach(p => {
      const refA = p.a, refB = p.b;
      const resolverRef = (ref) => {
        if (ref.type === 'group') {
          const t = clas[ref.letter];
          const eq = t && t[ref.pos - 1];
          if (eq && eq.pj === 3) return eq.equipo;
          return null;
        }
        if (ref.type === 'third') {
          return r32ATercero[p.id] || null;
        }
        return null;
      };
      cruces[p.id] = { a: resolverRef(refA), b: resolverRef(refB) };
    });
    // Resolver R16/QF/SF/Final/3º a partir de los ganadores
    function getGanadorLocal(id) {
      const c = cruces[id];
      if (!c || !c.a || !c.b) return null;
      const r = KO_res[id];
      if (!tieneMarcador(r)) return null;
      const gl = parseInt(r.golesLocal), gv = parseInt(r.golesVisitante);
      if (gl > gv) return c.a;
      if (gv > gl) return c.b;
      if (r.clasifica === 'a') return c.a;
      if (r.clasifica === 'b') return c.b;
      return null;
    }
    function getPerdedorLocal(id) {
      const c = cruces[id]; const g = getGanadorLocal(id);
      if (!g || !c.a || !c.b) return null;
      return g === c.a ? c.b : c.a;
    }
    [R16_PAIRS, QF_PAIRS, SF_PAIRS].forEach(arr => {
      arr.forEach(p => {
        cruces[p.id] = { a: getGanadorLocal(p.from[0]), b: getGanadorLocal(p.from[1]) };
      });
    });
    cruces[FINAL_PAIR.id] = { a: getGanadorLocal(SF_PAIRS[0].id), b: getGanadorLocal(SF_PAIRS[1].id) };
    cruces[THIRD_PLACE.id] = { a: getPerdedorLocal(SF_PAIRS[0].id), b: getPerdedorLocal(SF_PAIRS[1].id) };
    return { clas, terceros, cruces };
  }

  // Resolver con la REALIDAD (para saber qué equipos llegaron a dónde)
  const realResuelto = resolverCruces(rKO, rDes, rDesT);

  // Calcular sets reales por ronda
  const setReal = {
    r32: equiposEnRonda(R32_PAIRS, rKO, null, realResuelto.cruces),
    r16: equiposEnRonda(R16_PAIRS, rKO, null, realResuelto.cruces),
    qf: equiposEnRonda(QF_PAIRS, rKO, null, realResuelto.cruces),
    sf: equiposEnRonda(SF_PAIRS, rKO, null, realResuelto.cruces),
    f: new Set([realResuelto.cruces[FINAL_PAIR.id]?.a, realResuelto.cruces[FINAL_PAIR.id]?.b].filter(Boolean)),
    tp: new Set([realResuelto.cruces[THIRD_PLACE.id]?.a, realResuelto.cruces[THIRD_PLACE.id]?.b].filter(Boolean)),
  };

  // Resolver con la PREDICCIÓN del usuario
  // Para esto necesitamos otra función que use pRes/pKO/pDes/pDesT
  function resolverPred() {
    const clas = {};
    Object.entries(GRUPOS).forEach(([letra, equipos]) => {
      const pGr = PARTIDOS.filter(p => p.grupo === letra);
      clas[letra] = clasificacionGrupo(equipos, pGr, pRes, pDes && pDes[letra]).tabla;
    });
    const terceros = [];
    Object.entries(clas).forEach(([letra, tabla]) => {
      if (tabla[2] && tabla[2].pj === 3) terceros.push({ ...tabla[2], grupo: letra });
    });
    terceros.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return 0;
    });
    if (pDesT) {
      let i = 0;
      while (i < terceros.length) {
        const g = [terceros[i]]; let j = i + 1;
        while (j < terceros.length && terceros[j].pts === terceros[i].pts && terceros[j].dg === terceros[i].dg && terceros[j].gf === terceros[i].gf) {
          g.push(terceros[j]); j++;
        }
        if (g.length > 1) {
          const key = g.map(e => e.equipo).sort().join('|');
          const orderStr = pDesT[key];
          if (orderStr) {
            const desired = orderStr.split('|');
            const ordered = desired.map(name => g.find(e => e.equipo === name)).filter(Boolean);
            if (ordered.length === g.length) ordered.forEach((eq, idx) => { terceros[i + idx] = eq; });
          }
        }
        i = j;
      }
    }
    // Aplicar Anexo C FIFA también en la predicción
    const top8Pred = terceros.slice(0, 8);
    const r32ATerceroPred = (top8Pred.length === 8) ? asignarTercerosAnexoC(top8Pred) : {};
    const cruces = {};
    R32_PAIRS.forEach(p => {
      const resolverRef = (ref) => {
        if (ref.type === 'group') {
          const t = clas[ref.letter];
          const eq = t && t[ref.pos - 1];
          if (eq && eq.pj === 3) return eq.equipo;
          return null;
        }
        if (ref.type === 'third') {
          return r32ATerceroPred[p.id] || null;
        }
        return null;
      };
      cruces[p.id] = { a: resolverRef(p.a), b: resolverRef(p.b) };
    });
    function getGanadorLocal(id) {
      const c = cruces[id]; if (!c || !c.a || !c.b) return null;
      const r = pKO[id]; if (!tieneMarcador(r)) return null;
      const gl = parseInt(r.golesLocal), gv = parseInt(r.golesVisitante);
      if (gl > gv) return c.a;
      if (gv > gl) return c.b;
      if (r.clasifica === 'a') return c.a;
      if (r.clasifica === 'b') return c.b;
      return null;
    }
    function getPerdedorLocal(id) {
      const c = cruces[id]; const g = getGanadorLocal(id);
      if (!g || !c.a || !c.b) return null;
      return g === c.a ? c.b : c.a;
    }
    [R16_PAIRS, QF_PAIRS, SF_PAIRS].forEach(arr => {
      arr.forEach(p => {
        cruces[p.id] = { a: getGanadorLocal(p.from[0]), b: getGanadorLocal(p.from[1]) };
      });
    });
    cruces[FINAL_PAIR.id] = { a: getGanadorLocal(SF_PAIRS[0].id), b: getGanadorLocal(SF_PAIRS[1].id) };
    cruces[THIRD_PLACE.id] = { a: getPerdedorLocal(SF_PAIRS[0].id), b: getPerdedorLocal(SF_PAIRS[1].id) };
    return { clas, terceros, cruces };
  }

  const predResuelto = resolverPred();
  const setPred = {
    r32: equiposEnRonda(R32_PAIRS, pKO, null, predResuelto.cruces),
    r16: equiposEnRonda(R16_PAIRS, pKO, null, predResuelto.cruces),
    qf: equiposEnRonda(QF_PAIRS, pKO, null, predResuelto.cruces),
    sf: equiposEnRonda(SF_PAIRS, pKO, null, predResuelto.cruces),
    f: new Set([predResuelto.cruces[FINAL_PAIR.id]?.a, predResuelto.cruces[FINAL_PAIR.id]?.b].filter(Boolean)),
    tp: new Set([predResuelto.cruces[THIRD_PLACE.id]?.a, predResuelto.cruces[THIRD_PLACE.id]?.b].filter(Boolean)),
  };

  // Intersección por ronda → puntos de clasificación
  const intersec = (sP, sR) => {
    let c = 0;
    sP.forEach(eq => { if (sR.has(eq)) c++; });
    return c;
  };

  // Solo contamos clasif si la realidad ya conoce esa ronda (al menos 1 equipo dentro)
  if (setReal.r32.size > 0) ptsClasif1_16 = intersec(setPred.r32, setReal.r32) * PTS.diecisei.clasif;
  if (setReal.r16.size > 0) ptsClasifOct = intersec(setPred.r16, setReal.r16) * PTS.octavos.clasif;
  if (setReal.qf.size > 0)  ptsClasifQF  = intersec(setPred.qf, setReal.qf)   * PTS.cuartos.clasif;
  if (setReal.sf.size > 0)  ptsClasifSF  = intersec(setPred.sf, setReal.sf)   * PTS.semis.clasif;
  if (setReal.tp.size > 0)  ptsClasif34  = intersec(setPred.tp, setReal.tp)   * PTS.tercerPuesto.clasif;
  if (setReal.f.size > 0)   ptsClasifFinal = intersec(setPred.f, setReal.f)   * PTS.final.clasif;

  // ---- 4) PARTIDOS DE ELIMINATORIAS ----
  // Para cada partido KO real: buscar el MISMO ENFRENTAMIENTO en CUALQUIER slot del usuario
  // dentro de la misma ronda (independientemente del slot y del orden A/B).
  // Si el usuario tiene el par {A,B} predicho en otro slot distinto, se evalúa ahí.
  // Esto refleja la realidad: en KO, lo importante es que aciertes "habrá un Brasil-México en cuartos",
  // no que aciertes "en qué hueco del cuadro estará ese partido".
  function puntuarPartidosRonda(pairs, escala, faseLabel) {
    let total = 0;
    // Por cada partido REAL de la ronda
    pairs.forEach(p => {
      const cR = realResuelto.cruces[p.id];
      const realM = rKO[p.id];
      if (!cR || !cR.a || !cR.b) return;
      if (!tieneMarcador(realM)) return;

      // Buscar este enfrentamiento {cR.a, cR.b} entre todos los slots del usuario de esta ronda
      let mejorSlot = null;
      let mejorPredM = null;
      let mejorInvert = false;
      for (const pPred of pairs) {
        const cP = predResuelto.cruces[pPred.id];
        if (!cP || !cP.a || !cP.b) continue;
        const setP = new Set([cP.a, cP.b]);
        if (setP.size !== 2) continue;
        if (!(setP.has(cR.a) && setP.has(cR.b))) continue;
        const predM = pKO[pPred.id];
        if (!tieneMarcador(predM)) continue;
        // Encontrado el enfrentamiento
        mejorSlot = pPred.id;
        mejorPredM = predM;
        // Si el A del usuario no coincide con el A real, hay que invertir
        mejorInvert = (cP.a !== cR.a);
        break;
      }

      if (!mejorSlot || !mejorPredM) return; // El enfrentamiento no aparece en la porra → 0 puntos

      // Normalizar el marcador del usuario al orden del partido real
      let predNormGl = mejorPredM.golesLocal;
      let predNormGv = mejorPredM.golesVisitante;
      if (mejorInvert) {
        predNormGl = mejorPredM.golesVisitante;
        predNormGv = mejorPredM.golesLocal;
      }
      const pts = puntuaPartido(
        { golesLocal: predNormGl, golesVisitante: predNormGv },
        realM,
        escala
      );
      total += pts.total;
      detallePartidos.push({ id: p.id, slotPredicho: mejorSlot, fase: faseLabel, puntos: pts });
    });
    return total;
  }

  pts1_16 = puntuarPartidosRonda(R32_PAIRS, PTS.diecisei, 'diecisei');
  ptsOct = puntuarPartidosRonda(R16_PAIRS, PTS.octavos, 'octavos');
  ptsQF  = puntuarPartidosRonda(QF_PAIRS,  PTS.cuartos, 'cuartos');
  ptsSF  = puntuarPartidosRonda(SF_PAIRS,  PTS.semis, 'semis');
  pts34  = puntuarPartidosRonda([THIRD_PLACE], PTS.tercerPuesto, 'tercerPuesto');
  ptsFinal = puntuarPartidosRonda([FINAL_PAIR], PTS.final, 'final');

  // ---- 5) TÍTULOS ----
  if (rTitulos.campeon && porra.titulosPred?.campeon === rTitulos.campeon) ptsCampeon = PTS.titulos.campeon;
  if (rTitulos.subcampeon && porra.titulosPred?.subcampeon === rTitulos.subcampeon) ptsSub = PTS.titulos.subcampeon;
  if (rTitulos.tercer && porra.titulosPred?.tercer === rTitulos.tercer) pts3 = PTS.titulos.tercerClasif;

  // Si no hay titulosPred, se infieren del KO predicho
  if (!porra.titulosPred) {
    const campPred = predResuelto.cruces[FINAL_PAIR.id]?.a && (function() {
      const c = predResuelto.cruces[FINAL_PAIR.id];
      const r = pKO[FINAL_PAIR.id];
      if (!tieneMarcador(r) || !c.a || !c.b) return null;
      const gl = parseInt(r.golesLocal), gv = parseInt(r.golesVisitante);
      if (gl > gv) return c.a;
      if (gv > gl) return c.b;
      if (r.clasifica === 'a') return c.a;
      if (r.clasifica === 'b') return c.b;
      return null;
    })();
    const subPred = campPred && (campPred === predResuelto.cruces[FINAL_PAIR.id].a
      ? predResuelto.cruces[FINAL_PAIR.id].b : predResuelto.cruces[FINAL_PAIR.id].a);
    const tpPred = (function() {
      const c = predResuelto.cruces[THIRD_PLACE.id];
      const r = pKO[THIRD_PLACE.id];
      if (!c || !tieneMarcador(r) || !c.a || !c.b) return null;
      const gl = parseInt(r.golesLocal), gv = parseInt(r.golesVisitante);
      if (gl > gv) return c.a;
      if (gv > gl) return c.b;
      if (r.clasifica === 'a') return c.a;
      if (r.clasifica === 'b') return c.b;
      return null;
    })();
    if (rTitulos.campeon && campPred === rTitulos.campeon) ptsCampeon = PTS.titulos.campeon;
    if (rTitulos.subcampeon && subPred === rTitulos.subcampeon) ptsSub = PTS.titulos.subcampeon;
    if (rTitulos.tercer && tpPred === rTitulos.tercer) pts3 = PTS.titulos.tercerClasif;
  }

  // ---- 6) PREMIOS INDIVIDUALES ----
  if (rPrem.mejorJugador && coincidePremio(pPrem.mejorJugador, rPrem.mejorJugador)) ptsBalon = PTS.premios.balon;
  if (rPrem.maximoGoleador && coincidePremio(pPrem.maximoGoleador, rPrem.maximoGoleador)) ptsBota = PTS.premios.bota;
  if (rPrem.mejorPortero && coincidePremio(pPrem.mejorPortero, rPrem.mejorPortero)) ptsGuante = PTS.premios.guante;

  const total =
    ptsGrupos + ptsGruposPos +
    ptsClasif1_16 + pts1_16 +
    ptsClasifOct + ptsOct +
    ptsClasifQF + ptsQF +
    ptsClasifSF + ptsSF +
    ptsClasif34 + pts34 +
    ptsClasifFinal + ptsFinal +
    ptsCampeon + ptsSub + pts3 +
    ptsBalon + ptsBota + ptsGuante;

  return {
    total,
    desglose: {
      ptsGrupos, ptsGruposPos,
      ptsClasif1_16, pts1_16,
      ptsClasifOct, ptsOct,
      ptsClasifQF, ptsQF,
      ptsClasifSF, ptsSF,
      ptsClasif34, pts34,
      ptsClasifFinal, ptsFinal,
      ptsCampeon, ptsSub, pts3,
      ptsBalon, ptsBota, ptsGuante,
    },
    detallePartidos,
  };
}

// ============================================================
// CONSIDERACIÓN: porra "completa"
// ============================================================
export function porraCompleta(porra, constantes) {
  const { PARTIDOS, ALL_KO_IDS } = constantes;
  if (!porra) return false;
  const res = porra.resultados || {};
  const ko = porra.resultadosKO || {};
  const pr = porra.premios || {};
  const grupos = PARTIDOS.every(p => tieneMarcador(res[p.id]));
  const koDone = ALL_KO_IDS.every(id => tieneMarcador(ko[id]));
  const premiosDone = !!(pr.mejorJugador && pr.maximoGoleador && pr.mejorPortero);
  const nombre = !!(porra.nombre && porra.nombre.trim());
  return grupos && koDone && premiosDone && nombre;
}
