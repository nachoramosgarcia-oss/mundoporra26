// src/firebase.js
//
// IMPORTANTE: Rellena las dos zonas marcadas con tu config y email.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  deleteField,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';

// ===================== ZONA 1: PEGA AQUÍ TU firebaseConfig =====================
const firebaseConfig = {
  apiKey: "AIzaSyBHadkZECAlAdXKF9drkZvOeBmmAvTuQyc",
  authDomain: "mundoporra-26.vercel.app",
  projectId: "mundoporra-26",
  storageBucket: "mundoporra-26.firebasestorage.app",
  messagingSenderId: "1009078018458",
  appId: "1:1009078018458:web:ff5855dde2037af6cbda23"
};

// ===================== ZONA 2: TU EMAIL DE ADMIN =====================
export const ADMIN_EMAIL = 'nacho.ramosgarcia@gmail.com';

// ===================== FECHA DE CIERRE =====================
// Jueves 11 jun 2026, 21:00 hora de Madrid (1h antes de México-Sudáfrica).
// En junio Madrid está en CEST (UTC+2), por lo que 21:00 Madrid = 19:00 UTC.
export const CIERRE_PORRAS_UTC = Date.UTC(2026, 5, 11, 19, 0, 0);
// ⚠️ Si cambias esta fecha, también debes actualizarla en las REGLAS DE FIRESTORE
// (Firebase Console → Firestore → Reglas → función porrasAbiertas()).
// Si no, el cierre en cliente y servidor estarán desincronizados.

// =====================================================================

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Forzar persistencia robusta. Prioriza indexedDB (sobrevive a ITP de iOS Safari),
// cae a localStorage si indexedDB no está, y por último a memoria.
// CRÍTICO: guardamos esta promesa para poder esperarla antes de cualquier operación de auth.
// Si no esperamos, signInWithRedirect/getRedirectResult corren con un almacenamiento que
// puede no estar listo, y en iOS Safari el estado pendiente se pierde al redirigir.
const persistenceReady = setPersistence(auth, indexedDBLocalPersistence)
  .catch(() => setPersistence(auth, browserLocalPersistence))
  .catch(() => setPersistence(auth, inMemoryPersistence))
  .catch(() => {}); // si todo falla, seguimos con el default

const provider = new GoogleAuthProvider();

// Detección de móvil: en móvil usamos redirect porque el popup no devuelve control
// a la ventana original en iOS/Android (limitación conocida de WebKit/Blink).
function esMovil() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export const loginConGoogle = async () => {
  // ESPERAR a que la persistencia esté lista antes de iniciar el login.
  // Si no esperamos, en móvil iOS el estado del redirect puede guardarse en memoria
  // efímera y perderse al salir a Google.
  await persistenceReady;
  if (esMovil()) {
    return signInWithRedirect(auth, provider);
  }
  return signInWithPopup(auth, provider);
};

// Llamar al cargar la app para completar el login si venimos de un redirect.
// Devuelve { user } si vinimos de un redirect, o null si no.
export const completarLoginRedirect = async () => {
  // ESPERAR a la persistencia también aquí: al volver de Google, getRedirectResult
  // necesita leer el estado pendiente desde el almacenamiento correcto.
  await persistenceReady;
  try {
    return await getRedirectResult(auth);
  } catch (e) {
    console.error('Error en redirect login:', e);
    throw e;
  }
};
export const logout = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// --------- Porras (predicciones de cada usuario) ---------

export async function guardarPorra(uid, datos) {
  await setDoc(
    doc(db, 'porras', uid),
    { ...datos, updatedAt: Date.now() },
    { merge: true }
  );
}

export async function cargarPorra(uid) {
  const snap = await getDoc(doc(db, 'porras', uid));
  return snap.exists() ? snap.data() : null;
}

// Escucha cambios en una porra concreta en tiempo real.
// Se dispara cuando cualquier dispositivo guarda esa porra (incluido este mismo).
// Devuelve función de unsubscribe.
export function onPorraChange(uid, cb) {
  return onSnapshot(doc(db, 'porras', uid), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

export async function listarTodasLasPorras() {
  const snap = await getDocs(collection(db, 'porras'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function borrarPorra(uid) {
  await deleteDoc(doc(db, 'porras', uid));
}

// Marca una porra como confirmada por su dueño
export async function confirmarEnvio(uid) {
  await setDoc(
    doc(db, 'porras', uid),
    { completed: true, completedAt: Date.now() },
    { merge: true }
  );
}

// --------- Resultados reales (solo admin escribe, todos leen) ---------

export async function cargarResultadosReales() {
  const snap = await getDoc(doc(db, 'resultadosReales', 'global'));
  return snap.exists() ? snap.data() : null;
}

export async function guardarResultadosReales(datos) {
  await setDoc(
    doc(db, 'resultadosReales', 'global'),
    { ...datos, updatedAt: Date.now() },
    { merge: true }
  );
}

// Subscripción en vivo (para vistas públicas)
export function onResultadosRealesChange(cb) {
  return onSnapshot(doc(db, 'resultadosReales', 'global'), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

// --------- Días cerrados ---------

export async function marcarDiaCerrado(diaKey) {
  await setDoc(doc(db, 'diasCerrados', 'global'), { [diaKey]: Date.now() }, { merge: true });
}

// Desmarcar un día como cerrado (para "despublicar")
export async function desmarcarDiaCerrado(diaKey) {
  // setDoc con merge: { [diaKey]: null } NO borra el campo (Firestore lo mantiene como null).
  // Usamos deleteField() para borrarlo completamente del documento.
  try {
    await updateDoc(doc(db, 'diasCerrados', 'global'), { [diaKey]: deleteField() });
  } catch (e) {
    // Si el documento no existe aún, no hay nada que desmarcar
    console.warn('No se pudo desmarcar día:', e.message);
  }
}

export async function cargarDiasCerrados() {
  const snap = await getDoc(doc(db, 'diasCerrados', 'global'));
  return snap.exists() ? snap.data() : {};
}

// --------- Clasificación pública ---------

export async function publicarClasificacion(filas) {
  await setDoc(doc(db, 'clasificacion', 'global'), {
    actualizadoEn: Date.now(),
    filas,
  });
}

export async function cargarClasificacion() {
  const snap = await getDoc(doc(db, 'clasificacion', 'global'));
  return snap.exists() ? snap.data() : null;
}

export function onClasificacionChange(cb) {
  return onSnapshot(doc(db, 'clasificacion', 'global'), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

// --------- Carga pública de TODAS las porras (solo lectura, vista de jornadas) ---------
// Para que los no-logueados puedan ver las predicciones de partidos ya jugados.
// IMPORTANTE: ver reglas de Firestore. Esto solo lo permitimos para la vista pública
// limitada (campos no sensibles).

export async function listarPorrasPublicas() {
  const snap = await getDocs(collection(db, 'porrasPublicas'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

// Cuando publicamos la clasificación también publicamos un "snapshot público"
// con info reducida que cualquiera puede leer.
export async function publicarPorraPublica(uid, datos) {
  await setDoc(doc(db, 'porrasPublicas', uid), datos);
}

// Borrar porra pública (usado cuando se borra una porra o se limpian dummies)
export async function borrarPorraPublica(uid) {
  try {
    await deleteDoc(doc(db, 'porrasPublicas', uid));
  } catch (e) {
    // Si no existe, no pasa nada
  }
}

// --------- Cierre de porras (helper) ---------

export function porrasCerradas() {
  // Coherente con las reglas Firestore (request.time < CIERRE → abierto).
  // Si Date.now() > CIERRE, está cerrado.
  return Date.now() > CIERRE_PORRAS_UTC;
}

export function fechaCierreLegible() {
  const d = new Date(CIERRE_PORRAS_UTC);
  return d.toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Madrid'
  });
}

export function tiempoRestanteCierre() {
  const diff = CIERRE_PORRAS_UTC - Date.now();
  if (diff <= 0) return null;
  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const minutos = Math.floor((diff % 3600000) / 60000);
  return { dias, horas, minutos, totalMs: diff };
}
