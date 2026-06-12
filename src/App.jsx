import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Trophy, Goal, Shield, Star, RefreshCw, Save, Award, Crown, Target,
  MapPin, Clock, Shuffle, Sparkles, Info, BookOpen, CheckCircle2,
  AlertCircle, KeyRound, LogOut, Download, Lock, Eye, Calendar,
  Users, BarChart3, Send, FlaskConical, FileSpreadsheet, Edit
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ADMIN_EMAIL,
  CIERRE_PORRAS_UTC,
  loginConGoogle,
  completarLoginRedirect,
  logout,
  onAuthChange,
  guardarPorra,
  cargarPorra,
  onPorraChange,
  listarTodasLasPorras,
  listarPorrasPublicas,
  publicarPorraPublica,
  borrarPorraPublica,
  borrarPorra,
  confirmarEnvio,
  cargarResultadosReales,
  guardarResultadosReales,
  onResultadosRealesChange,
  marcarDiaCerrado,
  desmarcarDiaCerrado,
  cargarDiasCerrados,
  publicarClasificacion,
  cargarClasificacion,
  onClasificacionChange,
  porrasCerradas,
  fechaCierreLegible,
  tiempoRestanteCierre,
} from './firebase';
import { calcularPuntos, porraCompleta, PTS, clasificacionGrupo } from './puntos';
import { ANEXO_C, R32_TO_COL, ANEXO_C_COLS, asignarTercerosAnexoC } from './anexo-c';

const PORTADA_IMG = '/portada-campeones.jpg';

// ============================================================
// DATOS DEL MUNDIAL 2026
// ============================================================
const EQUIPOS_INFO = {
  'México':              { flag: '🇲🇽', iso: 'mx' },
  'Sudáfrica':           { flag: '🇿🇦', iso: 'za' },
  'Corea del Sur':       { flag: '🇰🇷', iso: 'kr' },
  'Chequia':             { flag: '🇨🇿', iso: 'cz' },
  'Canadá':              { flag: '🇨🇦', iso: 'ca' },
  'Suiza':               { flag: '🇨🇭', iso: 'ch' },
  'Catar':               { flag: '🇶🇦', iso: 'qa' },
  'Bosnia y Herzegovina':         { flag: '🇧🇦', iso: 'ba' },
  'Brasil':              { flag: '🇧🇷', iso: 'br' },
  'Marruecos':           { flag: '🇲🇦', iso: 'ma' },
  'Haití':               { flag: '🇭🇹', iso: 'ht' },
  'Escocia':             { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', iso: 'gb-sct' },
  'Estados Unidos':              { flag: '🇺🇸', iso: 'us' },
  'Paraguay':            { flag: '🇵🇾', iso: 'py' },
  'Australia':           { flag: '🇦🇺', iso: 'au' },
  'Turquía':             { flag: '🇹🇷', iso: 'tr' },
  'Alemania':            { flag: '🇩🇪', iso: 'de' },
  'Curazao':             { flag: '🇨🇼', iso: 'cw' },
  'Costa de Marfil':     { flag: '🇨🇮', iso: 'ci' },
  'Ecuador':             { flag: '🇪🇨', iso: 'ec' },
  'Países Bajos':        { flag: '🇳🇱', iso: 'nl' },
  'Japón':               { flag: '🇯🇵', iso: 'jp' },
  'Suecia':              { flag: '🇸🇪', iso: 'se' },
  'Túnez':               { flag: '🇹🇳', iso: 'tn' },
  'Bélgica':             { flag: '🇧🇪', iso: 'be' },
  'Egipto':              { flag: '🇪🇬', iso: 'eg' },
  'Irán':                { flag: '🇮🇷', iso: 'ir' },
  'Nueva Zelanda':       { flag: '🇳🇿', iso: 'nz' },
  'España':              { flag: '🇪🇸', iso: 'es' },
  'Cabo Verde':          { flag: '🇨🇻', iso: 'cv' },
  'Arabia Saudí':        { flag: '🇸🇦', iso: 'sa' },
  'Uruguay':             { flag: '🇺🇾', iso: 'uy' },
  'Francia':             { flag: '🇫🇷', iso: 'fr' },
  'Senegal':             { flag: '🇸🇳', iso: 'sn' },
  'Noruega':             { flag: '🇳🇴', iso: 'no' },
  'Irak':                { flag: '🇮🇶', iso: 'iq' },
  'Argentina':           { flag: '🇦🇷', iso: 'ar' },
  'Argelia':             { flag: '🇩🇿', iso: 'dz' },
  'Austria':             { flag: '🇦🇹', iso: 'at' },
  'Jordania':            { flag: '🇯🇴', iso: 'jo' },
  'Portugal':            { flag: '🇵🇹', iso: 'pt' },
  'RD Congo':            { flag: '🇨🇩', iso: 'cd' },
  'Uzbekistán':          { flag: '🇺🇿', iso: 'uz' },
  'Colombia':            { flag: '🇨🇴', iso: 'co' },
  'Inglaterra':          { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', iso: 'gb-eng' },
  'Croacia':             { flag: '🇭🇷', iso: 'hr' },
  'Ghana':               { flag: '🇬🇭', iso: 'gh' },
  'Panamá':              { flag: '🇵🇦', iso: 'pa' },
};

// Componente reutilizable para mostrar bandera redonda (circle-flags vía GitHub Pages)
const Flag = ({ pais, size = 20, style = {} }) => {
  const info = EQUIPOS_INFO[pais];
  if (!info) return <span style={{ fontSize: size, ...style }}>⚽</span>;
  // circle-flags usa códigos ISO con guion bajo para regiones (gb-eng → gb-eng, igual)
  const code = info.iso;
  const url = `https://hatscripts.github.io/circle-flags/flags/${code}.svg`;
  return (
    <img
      src={url}
      alt={pais}
      title={pais}
      className="flag-img"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
      onError={(e) => {
        // Fallback: si falla la carga, mostrar el emoji
        e.target.style.display = 'none';
        const span = document.createElement('span');
        span.textContent = info.flag;
        span.style.fontSize = `${size}px`;
        e.target.parentNode.insertBefore(span, e.target);
      }}
    />
  );
};

const GRUPOS = {
  A: ['México', 'Sudáfrica', 'Corea del Sur', 'Chequia'],
  B: ['Canadá', 'Suiza', 'Catar', 'Bosnia y Herzegovina'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'Suecia', 'Túnez'],
  G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
  H: ['España', 'Cabo Verde', 'Arabia Saudí', 'Uruguay'],
  I: ['Francia', 'Senegal', 'Noruega', 'Irak'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'RD Congo', 'Uzbekistán', 'Colombia'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
};

const PARTIDOS_DATA = [
  // === JORNADA 1 (11-17 jun) ===
  // Jueves 11 junio
  { local: 'México',           visitante: 'Sudáfrica',        grupo: 'A', fecha: 'Jue 11 jun', horaCET: '21:00', sede: 'CDMX' },
  { local: 'Corea del Sur',    visitante: 'Chequia',          grupo: 'A', fecha: 'Vie 12 jun', horaCET: '04:00', sede: 'Guadalajara' },
  // Viernes 12 junio
  { local: 'Canadá',           visitante: 'Bosnia y Herzegovina', grupo: 'B', fecha: 'Vie 12 jun', horaCET: '21:00', sede: 'Toronto' },
  { local: 'Estados Unidos',   visitante: 'Paraguay',         grupo: 'D', fecha: 'Sáb 13 jun', horaCET: '03:00', sede: 'Los Ángeles' },
  // Sábado 13 junio
  { local: 'Catar',            visitante: 'Suiza',            grupo: 'B', fecha: 'Sáb 13 jun', horaCET: '21:00', sede: 'San Francisco' },
  { local: 'Brasil',           visitante: 'Marruecos',        grupo: 'C', fecha: 'Dom 14 jun', horaCET: '00:00', sede: 'New York/NJ' },
  { local: 'Haití',            visitante: 'Escocia',          grupo: 'C', fecha: 'Dom 14 jun', horaCET: '03:00', sede: 'Boston' },
  // Domingo 14 junio
  { local: 'Australia',        visitante: 'Turquía',          grupo: 'D', fecha: 'Dom 14 jun', horaCET: '18:00', sede: 'Vancouver' },
  { local: 'Alemania',         visitante: 'Curazao',          grupo: 'E', fecha: 'Dom 14 jun', horaCET: '19:00', sede: 'Houston' },
  { local: 'Países Bajos',     visitante: 'Japón',            grupo: 'F', fecha: 'Dom 14 jun', horaCET: '22:00', sede: 'Dallas' },
  { local: 'Costa de Marfil',  visitante: 'Ecuador',          grupo: 'E', fecha: 'Lun 15 jun', horaCET: '01:00', sede: 'Filadelfia' },
  { local: 'Suecia',           visitante: 'Túnez',            grupo: 'F', fecha: 'Lun 15 jun', horaCET: '04:00', sede: 'Monterrey' },
  // Lunes 15 junio
  { local: 'España',           visitante: 'Cabo Verde',       grupo: 'H', fecha: 'Lun 15 jun', horaCET: '18:00', sede: 'Atlanta' },
  { local: 'Bélgica',          visitante: 'Egipto',           grupo: 'G', fecha: 'Lun 15 jun', horaCET: '21:00', sede: 'Seattle' },
  { local: 'Arabia Saudí',     visitante: 'Uruguay',          grupo: 'H', fecha: 'Mar 16 jun', horaCET: '00:00', sede: 'Miami' },
  { local: 'Irán',             visitante: 'Nueva Zelanda',    grupo: 'G', fecha: 'Mar 16 jun', horaCET: '03:00', sede: 'Los Ángeles' },
  // Martes 16 junio
  { local: 'Francia',          visitante: 'Senegal',          grupo: 'I', fecha: 'Mar 16 jun', horaCET: '21:00', sede: 'New York/NJ' },
  { local: 'Irak',             visitante: 'Noruega',          grupo: 'I', fecha: 'Mié 17 jun', horaCET: '00:00', sede: 'Boston' },
  { local: 'Argentina',        visitante: 'Argelia',          grupo: 'J', fecha: 'Mié 17 jun', horaCET: '03:00', sede: 'Kansas City' },
  { local: 'Austria',          visitante: 'Jordania',         grupo: 'J', fecha: 'Mié 17 jun', horaCET: '06:00', sede: 'San Francisco' },
  // Miércoles 17 junio
  { local: 'Portugal',         visitante: 'RD Congo',         grupo: 'K', fecha: 'Mié 17 jun', horaCET: '19:00', sede: 'Houston' },
  { local: 'Inglaterra',       visitante: 'Croacia',          grupo: 'L', fecha: 'Mié 17 jun', horaCET: '22:00', sede: 'Dallas' },
  { local: 'Ghana',            visitante: 'Panamá',           grupo: 'L', fecha: 'Jue 18 jun', horaCET: '01:00', sede: 'Toronto' },
  { local: 'Uzbekistán',       visitante: 'Colombia',         grupo: 'K', fecha: 'Jue 18 jun', horaCET: '04:00', sede: 'CDMX' },

  // === JORNADA 2 (18-23 jun) ===
  // Jueves 18 junio
  { local: 'Chequia',          visitante: 'Sudáfrica',        grupo: 'A', fecha: 'Jue 18 jun', horaCET: '18:00', sede: 'Atlanta' },
  { local: 'Suiza',            visitante: 'Bosnia y Herzegovina', grupo: 'B', fecha: 'Jue 18 jun', horaCET: '21:00', sede: 'Los Ángeles' },
  { local: 'Canadá',           visitante: 'Catar',            grupo: 'B', fecha: 'Vie 19 jun', horaCET: '00:00', sede: 'Vancouver' },
  { local: 'México',           visitante: 'Corea del Sur',    grupo: 'A', fecha: 'Vie 19 jun', horaCET: '03:00', sede: 'Guadalajara' },
  // Viernes 19 junio
  { local: 'Estados Unidos',   visitante: 'Australia',        grupo: 'D', fecha: 'Vie 19 jun', horaCET: '21:00', sede: 'Seattle' },
  { local: 'Escocia',          visitante: 'Marruecos',        grupo: 'C', fecha: 'Sáb 20 jun', horaCET: '00:00', sede: 'Boston' },
  { local: 'Brasil',           visitante: 'Haití',            grupo: 'C', fecha: 'Sáb 20 jun', horaCET: '02:30', sede: 'Filadelfia' },
  { local: 'Turquía',          visitante: 'Paraguay',         grupo: 'D', fecha: 'Sáb 20 jun', horaCET: '05:00', sede: 'San Francisco' },
  // Sábado 20 junio
  { local: 'Países Bajos',     visitante: 'Suecia',           grupo: 'F', fecha: 'Sáb 20 jun', horaCET: '19:00', sede: 'Houston' },
  { local: 'Alemania',         visitante: 'Costa de Marfil',  grupo: 'E', fecha: 'Sáb 20 jun', horaCET: '22:00', sede: 'Toronto' },
  { local: 'Ecuador',          visitante: 'Curazao',          grupo: 'E', fecha: 'Dom 21 jun', horaCET: '02:00', sede: 'Kansas City' },
  { local: 'Túnez',            visitante: 'Japón',            grupo: 'F', fecha: 'Dom 21 jun', horaCET: '06:00', sede: 'Monterrey' },
  // Domingo 21 junio
  { local: 'España',           visitante: 'Arabia Saudí',     grupo: 'H', fecha: 'Dom 21 jun', horaCET: '18:00', sede: 'Atlanta' },
  { local: 'Bélgica',          visitante: 'Irán',             grupo: 'G', fecha: 'Dom 21 jun', horaCET: '21:00', sede: 'Los Ángeles' },
  { local: 'Uruguay',          visitante: 'Cabo Verde',       grupo: 'H', fecha: 'Lun 22 jun', horaCET: '00:00', sede: 'Miami' },
  { local: 'Nueva Zelanda',    visitante: 'Egipto',           grupo: 'G', fecha: 'Lun 22 jun', horaCET: '03:00', sede: 'Vancouver' },
  // Lunes 22 junio
  { local: 'Argentina',        visitante: 'Austria',          grupo: 'J', fecha: 'Lun 22 jun', horaCET: '19:00', sede: 'Dallas' },
  { local: 'Francia',          visitante: 'Irak',             grupo: 'I', fecha: 'Lun 22 jun', horaCET: '23:00', sede: 'Filadelfia' },
  { local: 'Noruega',          visitante: 'Senegal',          grupo: 'I', fecha: 'Mar 23 jun', horaCET: '02:00', sede: 'New York/NJ' },
  { local: 'Jordania',         visitante: 'Argelia',          grupo: 'J', fecha: 'Mar 23 jun', horaCET: '05:00', sede: 'San Francisco' },
  // Martes 23 junio
  { local: 'Portugal',         visitante: 'Uzbekistán',       grupo: 'K', fecha: 'Mar 23 jun', horaCET: '19:00', sede: 'Houston' },
  { local: 'Inglaterra',       visitante: 'Ghana',            grupo: 'L', fecha: 'Mar 23 jun', horaCET: '22:00', sede: 'Boston' },
  { local: 'Panamá',           visitante: 'Croacia',          grupo: 'L', fecha: 'Mié 24 jun', horaCET: '01:00', sede: 'Toronto' },
  { local: 'Colombia',         visitante: 'RD Congo',         grupo: 'K', fecha: 'Mié 24 jun', horaCET: '04:00', sede: 'Guadalajara' },

  // === JORNADA 3 (24-27 jun) ===
  // Miércoles 24 junio
  { local: 'Suiza',            visitante: 'Canadá',           grupo: 'B', fecha: 'Mié 24 jun', horaCET: '21:00', sede: 'Vancouver' },
  { local: 'Bosnia y Herzegovina', visitante: 'Catar',        grupo: 'B', fecha: 'Mié 24 jun', horaCET: '21:00', sede: 'Seattle' },
  { local: 'Escocia',          visitante: 'Brasil',           grupo: 'C', fecha: 'Jue 25 jun', horaCET: '00:00', sede: 'Miami' },
  { local: 'Marruecos',        visitante: 'Haití',            grupo: 'C', fecha: 'Jue 25 jun', horaCET: '00:00', sede: 'Atlanta' },
  { local: 'Chequia',          visitante: 'México',           grupo: 'A', fecha: 'Jue 25 jun', horaCET: '03:00', sede: 'CDMX' },
  { local: 'Sudáfrica',        visitante: 'Corea del Sur',    grupo: 'A', fecha: 'Jue 25 jun', horaCET: '03:00', sede: 'Monterrey' },
  // Jueves 25 junio
  { local: 'Curazao',          visitante: 'Costa de Marfil',  grupo: 'E', fecha: 'Jue 25 jun', horaCET: '22:00', sede: 'Filadelfia' },
  { local: 'Ecuador',          visitante: 'Alemania',         grupo: 'E', fecha: 'Jue 25 jun', horaCET: '22:00', sede: 'New York/NJ' },
  { local: 'Japón',            visitante: 'Suecia',           grupo: 'F', fecha: 'Vie 26 jun', horaCET: '01:00', sede: 'Dallas' },
  { local: 'Túnez',            visitante: 'Países Bajos',     grupo: 'F', fecha: 'Vie 26 jun', horaCET: '01:00', sede: 'Kansas City' },
  { local: 'Turquía',          visitante: 'Estados Unidos',   grupo: 'D', fecha: 'Vie 26 jun', horaCET: '04:00', sede: 'Los Ángeles' },
  { local: 'Paraguay',         visitante: 'Australia',        grupo: 'D', fecha: 'Vie 26 jun', horaCET: '04:00', sede: 'San Francisco' },
  // Viernes 26 junio
  { local: 'Noruega',          visitante: 'Francia',          grupo: 'I', fecha: 'Vie 26 jun', horaCET: '21:00', sede: 'Boston' },
  { local: 'Senegal',          visitante: 'Irak',             grupo: 'I', fecha: 'Vie 26 jun', horaCET: '21:00', sede: 'Toronto' },
  { local: 'Cabo Verde',       visitante: 'Arabia Saudí',     grupo: 'H', fecha: 'Sáb 27 jun', horaCET: '02:00', sede: 'Houston' },
  { local: 'Uruguay',          visitante: 'España',           grupo: 'H', fecha: 'Sáb 27 jun', horaCET: '02:00', sede: 'Guadalajara' },
  { local: 'Egipto',           visitante: 'Irán',             grupo: 'G', fecha: 'Sáb 27 jun', horaCET: '05:00', sede: 'Seattle' },
  { local: 'Nueva Zelanda',    visitante: 'Bélgica',          grupo: 'G', fecha: 'Sáb 27 jun', horaCET: '05:00', sede: 'Vancouver' },
  // Sábado 27 junio
  { local: 'Panamá',           visitante: 'Inglaterra',       grupo: 'L', fecha: 'Sáb 27 jun', horaCET: '23:00', sede: 'New York/NJ' },
  { local: 'Croacia',          visitante: 'Ghana',            grupo: 'L', fecha: 'Sáb 27 jun', horaCET: '23:00', sede: 'Filadelfia' },
  { local: 'Colombia',         visitante: 'Portugal',         grupo: 'K', fecha: 'Dom 28 jun', horaCET: '01:30', sede: 'Miami' },
  { local: 'RD Congo',         visitante: 'Uzbekistán',       grupo: 'K', fecha: 'Dom 28 jun', horaCET: '01:30', sede: 'Atlanta' },
  { local: 'Argelia',          visitante: 'Austria',          grupo: 'J', fecha: 'Dom 28 jun', horaCET: '04:00', sede: 'Kansas City' },
  { local: 'Jordania',         visitante: 'Argentina',        grupo: 'J', fecha: 'Dom 28 jun', horaCET: '04:00', sede: 'Dallas' },
];

// ============================================================
// MAPPING OFICIAL FIFA: nº de partido → equipos (Match 1-72)
// Fuente: calendario oficial FIFA Mundial 2026 (Wikipedia + cruce con
// tickets oficiales en VividSeats, TimeOut, Gametime, AAVacations,
// CBS, ABC7 NY, hudsonriverblue, AOL/NorthJersey calendar feb 2024).
// Clave: pareja de equipos ordenada alfabéticamente "equipo1|equipo2".
// Valor: número de partido FIFA (1..72).
// ============================================================
const FIFA_MATCH_BY_TEAMS = {
  "México|Sudáfrica": 1,
  "Chequia|Corea del Sur": 2,
  "Bosnia y Herzegovina|Canadá": 3,
  "Estados Unidos|Paraguay": 4,
  "Escocia|Haití": 5,
  "Australia|Turquía": 6,
  "Brasil|Marruecos": 7,
  "Catar|Suiza": 8,
  "Costa de Marfil|Ecuador": 9,
  "Alemania|Curazao": 10,
  "Japón|Países Bajos": 11,
  "Suecia|Túnez": 12,
  "Arabia Saudí|Uruguay": 13,
  "Cabo Verde|España": 14,
  "Irán|Nueva Zelanda": 15,
  "Bélgica|Egipto": 16,
  "Francia|Senegal": 17,
  "Irak|Noruega": 18,
  "Argelia|Argentina": 19,
  "Austria|Jordania": 20,
  "Ghana|Panamá": 21,
  "Croacia|Inglaterra": 22,
  "Portugal|RD Congo": 23,
  "Colombia|Uzbekistán": 24,
  "Chequia|Sudáfrica": 25,
  "Bosnia y Herzegovina|Suiza": 26,
  "Canadá|Catar": 27,
  "Corea del Sur|México": 28,
  "Brasil|Haití": 29,
  "Escocia|Marruecos": 30,
  "Paraguay|Turquía": 31,
  "Australia|Estados Unidos": 32,
  "Alemania|Costa de Marfil": 33,
  "Curazao|Ecuador": 34,
  "Países Bajos|Suecia": 35,
  "Japón|Túnez": 36,
  "Cabo Verde|Uruguay": 37,
  "Arabia Saudí|España": 38,
  "Bélgica|Irán": 39,
  "Egipto|Nueva Zelanda": 40,
  "Noruega|Senegal": 41,
  "Francia|Irak": 42,
  "Argentina|Austria": 43,
  "Argelia|Jordania": 44,
  "Ghana|Inglaterra": 45,
  "Croacia|Panamá": 46,
  "Portugal|Uzbekistán": 47,
  "Colombia|RD Congo": 48,
  "Brasil|Escocia": 49,
  "Haití|Marruecos": 50,
  "Canadá|Suiza": 51,
  "Bosnia y Herzegovina|Catar": 52,
  "Chequia|México": 53,
  "Corea del Sur|Sudáfrica": 54,
  "Costa de Marfil|Curazao": 55,
  "Alemania|Ecuador": 56,
  "Japón|Suecia": 57,
  "Países Bajos|Túnez": 58,
  "Estados Unidos|Turquía": 59,
  "Australia|Paraguay": 60,
  "Francia|Noruega": 61,
  "Irak|Senegal": 62,
  "Egipto|Irán": 63,
  "Bélgica|Nueva Zelanda": 64,
  "Arabia Saudí|Cabo Verde": 65,
  "España|Uruguay": 66,
  "Inglaterra|Panamá": 67,
  "Croacia|Ghana": 68,
  "Argelia|Austria": 69,
  "Argentina|Jordania": 70,
  "Colombia|Portugal": 71,
  "RD Congo|Uzbekistán": 72,
};

function generarPartidosCompletos() {
  const map = new Map();
  Object.entries(GRUPOS).forEach(([letra, equipos]) => {
    for (let i = 0; i < equipos.length; i++) {
      for (let j = i + 1; j < equipos.length; j++) {
        const key = [equipos[i], equipos[j]].sort().join('|');
        const fifaMatch = FIFA_MATCH_BY_TEAMS[key] || null;
        map.set(key, {
          id: '', grupo: letra, local: equipos[i], visitante: equipos[j],
          fecha: 'Por confirmar', horaCET: '—', sede: '—',
          fifaMatch,
        });
      }
    }
  });

  PARTIDOS_DATA.forEach(p => {
    const key = [p.local, p.visitante].sort().join('|');
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, {
        ...existing,
        local: p.local, visitante: p.visitante,
        fecha: p.fecha, horaCET: p.horaCET, sede: p.sede,
      });
    }
  });

  const partidos = Array.from(map.values());
  const dateOrder = {
    'Jue 11 jun': 1, 'Vie 12 jun': 2, 'Sáb 13 jun': 3, 'Dom 14 jun': 4,
    'Lun 15 jun': 5, 'Mar 16 jun': 6, 'Mié 17 jun': 7, 'Jue 18 jun': 8,
    'Vie 19 jun': 9, 'Sáb 20 jun': 10, 'Dom 21 jun': 11, 'Lun 22 jun': 12,
    'Mar 23 jun': 13, 'Mié 24 jun': 14, 'Jue 25 jun': 15, 'Vie 26 jun': 16,
    'Sáb 27 jun': 17, 'Dom 28 jun': 18, 'Lun 29 jun': 19,
  };
  partidos.sort((a, b) => {
    const da = dateOrder[a.fecha] || 999;
    const db = dateOrder[b.fecha] || 999;
    if (da !== db) return da - db;
    return (a.horaCET || '').localeCompare(b.horaCET || '');
  });
  partidos.forEach((p, idx) => { p.id = `M${idx + 1}`; });
  return partidos;
}

const PARTIDOS = generarPartidosCompletos();

// ============================================================
// UTILIDADES DE FECHA
// ============================================================
// Mapa de etiqueta de partido → fecha real ISO (para selector de días).
// Las etiquetas vienen como "Jue 11 jun" - las convertimos a fechas reales.
const FECHA_BASE = {
  'Jue 11 jun': '2026-06-11',
  'Vie 12 jun': '2026-06-12',
  'Sáb 13 jun': '2026-06-13',
  'Dom 14 jun': '2026-06-14',
  'Lun 15 jun': '2026-06-15',
  'Mar 16 jun': '2026-06-16',
  'Mié 17 jun': '2026-06-17',
  'Jue 18 jun': '2026-06-18',
  'Vie 19 jun': '2026-06-19',
  'Sáb 20 jun': '2026-06-20',
  'Dom 21 jun': '2026-06-21',
  'Lun 22 jun': '2026-06-22',
  'Mar 23 jun': '2026-06-23',
  'Mié 24 jun': '2026-06-24',
  'Jue 25 jun': '2026-06-25',
  'Vie 26 jun': '2026-06-26',
  'Sáb 27 jun': '2026-06-27',
  'Dom 28 jun': '2026-06-28',
  'Lun 29 jun': '2026-06-29',
};

function fechaPartido(p) {
  return FECHA_BASE[p.fecha] || '2026-06-11';
}

function todayKey() {
  const d = new Date();
const madrid = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
return `${madrid.getFullYear()}-${String(madrid.getMonth() + 1).padStart(2, '0')}-${String(madrid.getDate()).padStart(2, '0')}`;
}

function diaAyer(diaKey) {
  const [y, m, d] = diaKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// Lista única ordenada de días con partidos (incluye días de KO calculados)
// Info de partidos KO: fecha, hora CET, sede. Datos oficiales FIFA Mundial 2026.
const INFO_KO = {
  // === Dieciseisavos (28 jun - 3 jul) ===
  // 28 jun: A2 vs B2 (Los Ángeles, 3 p.m. ET)
  R32_1:  { fecha: '2026-06-28', horaCET: '21:00', sede: 'Los Ángeles (EE.UU.)' },
  // 29 jun
  R32_2:  { fecha: '2026-06-29', horaCET: '19:00', sede: 'Houston (EE.UU.)' },
  R32_3:  { fecha: '2026-06-29', horaCET: '22:30', sede: 'Boston (EE.UU.)' },
  R32_4:  { fecha: '2026-06-30', horaCET: '03:00', sede: 'Monterrey (México)' },
  // 30 jun
  R32_5:  { fecha: '2026-06-30', horaCET: '19:00', sede: 'Dallas (EE.UU.)' },
  R32_6:  { fecha: '2026-06-30', horaCET: '23:00', sede: 'Nueva York-Nueva Jersey (EE.UU.)' },
  R32_7:  { fecha: '2026-07-01', horaCET: '03:00', sede: 'Ciudad de México (México)' },
  // 1 jul
  R32_8:  { fecha: '2026-07-01', horaCET: '18:00', sede: 'Atlanta (EE.UU.)' },
  R32_9:  { fecha: '2026-07-01', horaCET: '22:00', sede: 'Seattle (EE.UU.)' },
  R32_10: { fecha: '2026-07-02', horaCET: '02:00', sede: 'San Francisco (EE.UU.)' },
  // 2 jul
  R32_11: { fecha: '2026-07-02', horaCET: '21:00', sede: 'Los Ángeles (EE.UU.)' },
  R32_12: { fecha: '2026-07-03', horaCET: '01:00', sede: 'Toronto (Canadá)' },
  R32_13: { fecha: '2026-07-03', horaCET: '05:00', sede: 'Vancouver (Canadá)' },
  // 3 jul
  R32_14: { fecha: '2026-07-03', horaCET: '20:00', sede: 'Dallas (EE.UU.)' },
  R32_15: { fecha: '2026-07-04', horaCET: '00:00', sede: 'Miami (EE.UU.)' },
  R32_16: { fecha: '2026-07-04', horaCET: '03:30', sede: 'Kansas City (EE.UU.)' },
  // === Octavos (4 - 7 jul) ===
  R16_1:  { fecha: '2026-07-04', horaCET: '19:00', sede: 'Houston (EE.UU.)' },
  R16_2:  { fecha: '2026-07-04', horaCET: '23:00', sede: 'Filadelfia (EE.UU.)' },
  R16_3:  { fecha: '2026-07-05', horaCET: '22:00', sede: 'Nueva York-Nueva Jersey (EE.UU.)' },
  R16_4:  { fecha: '2026-07-06', horaCET: '02:00', sede: 'Ciudad de México (México)' },
  R16_5:  { fecha: '2026-07-06', horaCET: '21:00', sede: 'Dallas (EE.UU.)' },
  R16_6:  { fecha: '2026-07-07', horaCET: '02:00', sede: 'Seattle (EE.UU.)' },
  R16_7:  { fecha: '2026-07-07', horaCET: '18:00', sede: 'Atlanta (EE.UU.)' },
  R16_8:  { fecha: '2026-07-07', horaCET: '22:00', sede: 'Vancouver (Canadá)' },
  // === Cuartos (9 - 11 jul) ===
  QF_1:   { fecha: '2026-07-09', horaCET: '22:00', sede: 'Boston (EE.UU.)' },
  QF_2:   { fecha: '2026-07-10', horaCET: '21:00', sede: 'Los Ángeles (EE.UU.)' },
  QF_3:   { fecha: '2026-07-11', horaCET: '23:00', sede: 'Miami (EE.UU.)' },
  QF_4:   { fecha: '2026-07-12', horaCET: '03:00', sede: 'Kansas City (EE.UU.)' },
  // === Semifinales (14 - 15 jul) ===
  SF_1:   { fecha: '2026-07-14', horaCET: '21:00', sede: 'Dallas (EE.UU.)' },
  SF_2:   { fecha: '2026-07-15', horaCET: '21:00', sede: 'Atlanta (EE.UU.)' },
  // === 3.º/4.º Puesto (18 jul) ===
  TP:     { fecha: '2026-07-18', horaCET: '23:00', sede: 'Miami (EE.UU.)' },
  // === Final (19 jul) ===
  FINAL:  { fecha: '2026-07-19', horaCET: '21:00', sede: 'Nueva York-Nueva Jersey (EE.UU.)' },
};

// Compatibilidad: DIAS_KO sigue siendo accesible
const DIAS_KO = Object.fromEntries(Object.entries(INFO_KO).map(([id, info]) => [id, info.fecha]));

function diasUnicos() {
  const set = new Set();
  PARTIDOS.forEach(p => set.add(fechaPartido(p)));
  Object.values(DIAS_KO).forEach(d => set.add(d));
  return Array.from(set).sort();
}

function fechaLegible(diaKey) {
  if (!diaKey) return '';
  const [y, m, d] = diaKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });
}

function fechaLegibleCorta(diaKey) {
  if (!diaKey) return '';
  const [y, m, d] = diaKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Formato igual al de Grupos: "Sáb 28 jun" (día capitalizado, sin coma, sin punto)
  const raw = date.toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
  });
  // raw es "sáb, 28 jun" → quitamos coma y capitalizamos primera letra
  const sinComa = raw.replace(',', '');
  return sinComa.charAt(0).toUpperCase() + sinComa.slice(1);
}

// Convierte "Los Ángeles (EE.UU.)" → "Los Ángeles". Quita el país que va entre paréntesis.
function sedeSinPais(sede) {
  if (!sede) return '';
  return sede.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// ============================================================
// AUTO-SALTO DE INPUTS MARCADOR EN MÓVIL
// ============================================================
// Detecta si estamos en un dispositivo táctil (móvil/tablet).
// Usa matchMedia('(pointer: coarse)') que es más fiable que userAgent.
function esDispositivoTactil() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
}

// Salta el foco al siguiente input marcador.
// Se llama desde el onChange tras introducir un dígito en móvil.
// Busca todos los inputs marcador en el DOM (por data-marker), localiza el actual,
// y enfoca el siguiente. Si no hay siguiente, cierra el teclado (blur).
function saltarAlSiguienteMarcador(inputActual) {
  if (!inputActual) return;
  const todos = Array.from(document.querySelectorAll('input[data-marker]'));
  const idx = todos.indexOf(inputActual);
  if (idx < 0 || idx >= todos.length - 1) {
    // Último input: cerrar teclado para que se vea el botón guardar / siguiente acción
    inputActual.blur();
    return;
  }
  const siguiente = todos[idx + 1];
  if (siguiente) siguiente.focus();
}

// Helper unificado para el onChange de un input marcador.
// Llama al onChange normal y, si en móvil acabamos de introducir UN dígito,
// salta al siguiente input.
function onChangeMarcadorAutoSalto(e, onChangeOriginal) {
  const value = e.target.value;
  onChangeOriginal(value);
  // Solo saltar si:
  //  - estamos en táctil (pointer coarse)
  //  - el valor es de 1 dígito (acabamos de introducirlo)
  if (esDispositivoTactil() && value.length === 1 && /^[0-9]$/.test(value)) {
    // Pequeño delay para que React procese el cambio antes del salto
    setTimeout(() => saltarAlSiguienteMarcador(e.target), 30);
  }
}

// ============================================================
// CLASIFICACIÓN
// ============================================================
function calcularClasificacionGrupo(letraGrupo, resultados, desempates) {
  const equipos = GRUPOS[letraGrupo];
  const partidosGrupo = PARTIDOS.filter(p => p.grupo === letraGrupo);
  // Delegar en puntos.js para mantener una única fuente de verdad con criterios FIFA.
  // El desempate manual del UI se almacena indexado por letra de grupo:
  // desempates[letraGrupo] = { 'eq1|eq2|eq3': 'eq2|eq1|eq3', ... }
  const desempatesGrupo = desempates && desempates[letraGrupo];
  return clasificacionGrupo(equipos, partidosGrupo, resultados, desempatesGrupo);
}

function calcularMejoresTerceros(clasificaciones, desempateTerceros) {
  const terceros = [];
  Object.entries(clasificaciones).forEach(([letra, info]) => {
    const tabla = info.tabla || info;
    if (tabla[2] && tabla[2].pj === 3) {
      terceros.push({ ...tabla[2], grupo: letra });
    }
  });
  terceros.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  });

  // Detectar empates exactos
  const empateGroups = [];
  let i = 0;
  while (i < terceros.length) {
    const grupoEmpate = [terceros[i]];
    let j = i + 1;
    while (j < terceros.length &&
           terceros[j].pts === terceros[i].pts &&
           terceros[j].dg === terceros[i].dg &&
           terceros[j].gf === terceros[i].gf) {
      grupoEmpate.push(terceros[j]);
      j++;
    }
    if (grupoEmpate.length > 1) {
      empateGroups.push({ startIdx: i, equipos: grupoEmpate });
    }
    i = j;
  }

  // Aplicar desempate manual
  if (desempateTerceros && empateGroups.length > 0) {
    empateGroups.forEach(eg => {
      const key = eg.equipos.map(e => e.equipo).sort().join('|');
      const orderStr = desempateTerceros[key];
      if (orderStr) {
        const desiredOrder = orderStr.split('|');
        const ordered = desiredOrder
          .map(name => eg.equipos.find(e => e.equipo === name))
          .filter(Boolean);
        if (ordered.length === eg.equipos.length) {
          ordered.forEach((eq, idx) => { terceros[eg.startIdx + idx] = eq; });
        }
      }
    });
  }

  const tieInfo = empateGroups.map(eg => {
    const key = eg.equipos.map(e => e.equipo).sort().join('|');
    const resolved = !!(desempateTerceros && desempateTerceros[key]);
    return {
      equipos: eg.equipos.map(e => e.equipo),
      startIdx: eg.startIdx,
      resolved,
      key,
      // Solo es relevante si afecta a la frontera del 8º (índices 0-7 = clasifican, 8+ no)
      criticoFrontera: eg.startIdx < 8 && (eg.startIdx + eg.equipos.length) > 8,
    };
  });

  return { tabla: terceros, empates: tieInfo };
}

// ============================================================
// ELIMINATORIAS
// ============================================================
// Cruces KO según calendario FIFA Mundial 2026.
// IDs en orden cronológico real: R32_1 es el primer partido de Dieciseisavos según FIFA.
// Los terceros se asignan según el Anexo C del Reglamento FIFA (495 escenarios).
// El campo 'col' indica la columna del Anexo C (qué 1.º recibe ese tercero).
const R32_PAIRS = [
  // 28 jun
  { id: 'R32_1',  fifaMatch: 73, a: { type: 'group', letter: 'A', pos: 2 }, b: { type: 'group', letter: 'B', pos: 2 }, label: 'A2 vs B2' },
  // 29 jun
  { id: 'R32_2',  fifaMatch: 76, a: { type: 'group', letter: 'C', pos: 1 }, b: { type: 'group', letter: 'F', pos: 2 }, label: 'C1 vs F2' },
  { id: 'R32_3',  fifaMatch: 74, a: { type: 'group', letter: 'E', pos: 1 }, b: { type: 'third', col: 'E' }, label: 'E1 vs 3.º (Anexo C)' },
  { id: 'R32_4',  fifaMatch: 75, a: { type: 'group', letter: 'F', pos: 1 }, b: { type: 'group', letter: 'C', pos: 2 }, label: 'F1 vs C2' },
  // 30 jun
  { id: 'R32_5',  fifaMatch: 78, a: { type: 'group', letter: 'E', pos: 2 }, b: { type: 'group', letter: 'I', pos: 2 }, label: 'E2 vs I2' },
  { id: 'R32_6',  fifaMatch: 77, a: { type: 'group', letter: 'I', pos: 1 }, b: { type: 'third', col: 'I' }, label: 'I1 vs 3.º (Anexo C)' },
  { id: 'R32_7',  fifaMatch: 79, a: { type: 'group', letter: 'A', pos: 1 }, b: { type: 'third', col: 'A' }, label: 'A1 vs 3.º (Anexo C)' },
  // 1 jul
  { id: 'R32_8',  fifaMatch: 80, a: { type: 'group', letter: 'L', pos: 1 }, b: { type: 'third', col: 'L' }, label: 'L1 vs 3.º (Anexo C)' },
  { id: 'R32_9',  fifaMatch: 82, a: { type: 'group', letter: 'G', pos: 1 }, b: { type: 'third', col: 'G' }, label: 'G1 vs 3.º (Anexo C)' },
  { id: 'R32_10', fifaMatch: 81, a: { type: 'group', letter: 'D', pos: 1 }, b: { type: 'third', col: 'D' }, label: 'D1 vs 3.º (Anexo C)' },
  // 2 jul
  { id: 'R32_11', fifaMatch: 84, a: { type: 'group', letter: 'H', pos: 1 }, b: { type: 'group', letter: 'J', pos: 2 }, label: 'H1 vs J2' },
  { id: 'R32_12', fifaMatch: 83, a: { type: 'group', letter: 'K', pos: 2 }, b: { type: 'group', letter: 'L', pos: 2 }, label: 'K2 vs L2' },
  { id: 'R32_13', fifaMatch: 85, a: { type: 'group', letter: 'B', pos: 1 }, b: { type: 'third', col: 'B' }, label: 'B1 vs 3.º (Anexo C)' },
  // 3 jul
  { id: 'R32_14', fifaMatch: 88, a: { type: 'group', letter: 'D', pos: 2 }, b: { type: 'group', letter: 'G', pos: 2 }, label: 'D2 vs G2' },
  { id: 'R32_15', fifaMatch: 86, a: { type: 'group', letter: 'J', pos: 1 }, b: { type: 'group', letter: 'H', pos: 2 }, label: 'J1 vs H2' },
  { id: 'R32_16', fifaMatch: 87, a: { type: 'group', letter: 'K', pos: 1 }, b: { type: 'third', col: 'K' }, label: 'K1 vs 3.º (Anexo C)' },
];
// R16: orden cronológico (M89-M96). Bracket FIFA oficial.
const R16_PAIRS = [
  { id: 'R16_1', fifaMatch: 89, from: ['R32_3', 'R32_6'] },   // W74 vs W77
  { id: 'R16_2', fifaMatch: 90, from: ['R32_1', 'R32_4'] },   // W73 vs W75
  { id: 'R16_3', fifaMatch: 91, from: ['R32_2', 'R32_5'] },   // W76 vs W78
  { id: 'R16_4', fifaMatch: 92, from: ['R32_7', 'R32_8'] },   // W79 vs W80
  { id: 'R16_5', fifaMatch: 93, from: ['R32_11', 'R32_12'] }, // W83 vs W84
  { id: 'R16_6', fifaMatch: 94, from: ['R32_9', 'R32_10'] },  // W81 vs W82
  { id: 'R16_7', fifaMatch: 95, from: ['R32_14', 'R32_15'] }, // W86 vs W88
  { id: 'R16_8', fifaMatch: 96, from: ['R32_13', 'R32_16'] }, // W85 vs W87
];
// QF: orden cronológico (M97-M100). Bracket FIFA oficial.
const QF_PAIRS = [
  { id: 'QF_1', fifaMatch: 97,  from: ['R16_1', 'R16_2'] }, // W89 vs W90
  { id: 'QF_2', fifaMatch: 98,  from: ['R16_5', 'R16_6'] }, // W93 vs W94
  { id: 'QF_3', fifaMatch: 99,  from: ['R16_3', 'R16_4'] }, // W91 vs W92
  { id: 'QF_4', fifaMatch: 100, from: ['R16_7', 'R16_8'] }, // W95 vs W96
];
const SF_PAIRS = [
  { id: 'SF_1', fifaMatch: 101, from: ['QF_1', 'QF_2'] }, // W97 vs W98
  { id: 'SF_2', fifaMatch: 102, from: ['QF_3', 'QF_4'] }, // W99 vs W100
];
const FINAL_PAIR = { id: 'FINAL', fifaMatch: 104, from: ['SF_1', 'SF_2'] };
const THIRD_PLACE = { id: 'TP',   fifaMatch: 103, from: ['SF_1', 'SF_2'] };

// ============================================================
// HELPERS: identificadores y etiquetas de partidos KO
// ============================================================
// Devuelve el número de partido FIFA (Match X) de cualquier ID de KO.
function fifaMatchOf(matchId) {
  if (!matchId) return null;
  const all = [...R32_PAIRS, ...R16_PAIRS, ...QF_PAIRS, ...SF_PAIRS, FINAL_PAIR, THIRD_PLACE];
  const m = all.find(p => p.id === matchId);
  return m ? m.fifaMatch : null;
}

// Etiqueta legible del partido. Para R32 usa "A2 vs B2"; para R16+ usa "W74 vs W77"; para 3.º usa "L101 vs L102".
function buildKOLabel(matchId) {
  // R32: usa el label del propio R32_PAIRS
  const r32 = R32_PAIRS.find(p => p.id === matchId);
  if (r32) return r32.label || '';
  // R16, QF, SF: construir "W## vs W##" con los fifaMatch de los from
  const inner = [...R16_PAIRS, ...QF_PAIRS, ...SF_PAIRS].find(p => p.id === matchId);
  if (inner) {
    const f1 = fifaMatchOf(inner.from[0]);
    const f2 = fifaMatchOf(inner.from[1]);
    return `W${f1} vs W${f2}`;
  }
  if (matchId === FINAL_PAIR.id) {
    const f1 = fifaMatchOf(FINAL_PAIR.from[0]);
    const f2 = fifaMatchOf(FINAL_PAIR.from[1]);
    return `W${f1} vs W${f2}`;
  }
  if (matchId === THIRD_PLACE.id) {
    // 3.º puesto = perdedores de SF_1 y SF_2
    const f1 = fifaMatchOf(THIRD_PLACE.from[0]);
    const f2 = fifaMatchOf(THIRD_PLACE.from[1]);
    return `L${f1} vs L${f2}`;
  }
  return '';
}

const ALL_KO_IDS = [
  ...R32_PAIRS.map(p => p.id),
  ...R16_PAIRS.map(p => p.id),
  ...QF_PAIRS.map(p => p.id),
  ...SF_PAIRS.map(p => p.id),
  FINAL_PAIR.id, THIRD_PLACE.id,
];

// Constantes para que puntos.js pueda hacer cálculos
const CONSTANTES = {
  GRUPOS, PARTIDOS, R32_PAIRS, R16_PAIRS, QF_PAIRS, SF_PAIRS,
  FINAL_PAIR, THIRD_PLACE, ALL_KO_IDS
};

function resolverEquipo(ref, clasificaciones, terceros, anexoCMap) {
  if (ref.type === 'group') {
    const info = clasificaciones[ref.letter];
    const tabla = info.tabla || info;
    const equipo = tabla[ref.pos - 1];
    if (!equipo || equipo.pj < 3) return null;
    return equipo.equipo;
  }
  if (ref.type === 'third') {
    // Si recibimos un mapping pre-calculado del Anexo C, usarlo
    if (anexoCMap && anexoCMap[ref._r32id]) return anexoCMap[ref._r32id];
    return null;
  }
  return null;
}

function getGanador(matchId, resultadosKO, equiposCruces) {
  const cruce = equiposCruces[matchId];
  if (!cruce || !cruce.a || !cruce.b) return null;
  const r = resultadosKO[matchId];
  if (!r) return null;
  if (r.golesLocal === '' || r.golesVisitante === '') return null;
  const gl = parseInt(r.golesLocal);
  const gv = parseInt(r.golesVisitante);
  if (isNaN(gl) || isNaN(gv)) return null;
  if (gl > gv) return cruce.a;
  if (gv > gl) return cruce.b;
  if (r.clasifica === 'a') return cruce.a;
  if (r.clasifica === 'b') return cruce.b;
  return null;
}

// ============================================================
// PORTADA con imagen real de los campeones
// ============================================================
const LandingPage = ({ onEnter, nombre }) => (
  <div className="landing">
    <img src={PORTADA_IMG} alt="Últimos campeones del mundo" className="landing-bg" />
    <div className="landing-gradient" />
    <div className="landing-content">
      <div className="landing-top">
        <div className="landing-eyebrow">
          <Trophy size={14} />
          <span>FIFA WORLD CUP</span>
        </div>
        <h1 className="landing-title">PORRA<br/>MUNDIAL 2026</h1>
        <div className="landing-sub">ESTADOS UNIDOS · CANADÁ · MÉXICO</div>
        <div className="landing-dates">11 jun — 19 jul · 48 selecciones · 104 partidos</div>
      </div>
      <div className="landing-bottom">
        <button type="button" className="landing-cta" onClick={onEnter}>
          <span className="landing-cta-text">
            {nombre && nombre.trim() ? `Continuar como ${nombre.trim()}` : 'Entrar a la porra'}
          </span>
          <span className="landing-cta-arrow">→</span>
        </button>
        <div className="landing-hint">
          {nombre && nombre.trim()
            ? 'Tu progreso está guardado'
            : 'Predicciones · Eliminatorias · Premios'}
        </div>
      </div>
    </div>
  </div>
);

// ============================================================
// COMPONENTES UI
// ============================================================
const Header = ({
  tab, setTab, onReset, tabStatus, nombre,
  isAdmin, onLogout, saving, userEmail,
  publicMode = false, editandoUid = null, onSalirEdicion,
  porraCerrada = false,
}) => {
  let tabs;
  if (publicMode) {
    tabs = [
      { id: 'clasificacion', label: 'Clasificación', icon: BarChart3, grupo: 'general' },
      { id: 'jornadas', label: 'Jornadas', icon: Calendar, grupo: 'general' },
      { id: 'cuadrofinal', label: 'Cuadro Final', icon: Crown, grupo: 'general' },
    ];
  } else {
    tabs = [
      { id: 'instrucciones', label: 'Info', icon: BookOpen, grupo: 'porra' },
      { id: 'partidos', label: 'Grupos', icon: Goal, grupo: 'porra' },
      { id: 'terceros', label: '3ºs', icon: Star, grupo: 'porra' },
      { id: 'eliminatorias', label: 'KO', icon: Shield, grupo: 'porra' },
      { id: 'premios', label: 'Premios', icon: Award, grupo: 'porra' },
      { id: 'clasificacion', label: 'Clasificación', icon: BarChart3, grupo: 'general' },
      { id: 'jornadas', label: 'Jornadas', icon: Calendar, grupo: 'general' },
      { id: 'cuadrofinal', label: 'Cuadro Final', icon: Crown, grupo: 'general' },
    ];
    if (isAdmin) tabs.push({ id: 'admin', label: 'Admin', icon: KeyRound, grupo: 'admin' });
  }

  const editandoLabel = editandoUid
    ? `EDITANDO PORRA DE ${(nombre || '').toUpperCase() || 'PARTICIPANTE'}`
    : null;

  return (
    <>
      {isAdmin && !publicMode && (
        <div className="admin-banner">
          <KeyRound size={13} />
          <span>MODO ADMINISTRADOR</span>
          {editandoLabel && (
            <>
              <span style={{ opacity: 0.6 }}>·</span>
              <span style={{ color: 'var(--accent-2)', fontWeight: 700 }}>{editandoLabel}</span>
              <button className="admin-banner-back" onClick={onSalirEdicion}>
                Volver a mi porra
              </button>
            </>
          )}
        </div>
      )}
      {publicMode && (
        <div className="public-banner">
          <Eye size={13} />
          <span>MODO CONSULTA PÚBLICA</span>
        </div>
      )}
      {porraCerrada && !publicMode && !isAdmin && (
        <div className="closed-banner">
          <Lock size={13} />
          <span>PORRAS CERRADAS · El Mundial ha comenzado</span>
        </div>
      )}
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <div className="brand-mark"><Trophy size={20} strokeWidth={2.5} /></div>
            <div>
              <div className="brand-title">
                {publicMode
                  ? 'PORRA · MUNDIAL 2026'
                  : (nombre && nombre.trim() ? `PORRA · ${nombre.trim().toUpperCase()}` : 'PORRA · MUNDIAL 2026')}
              </div>
              <div className="brand-sub">
                {publicMode ? 'Estados Unidos · Canadá · México' : (userEmail || 'Estados Unidos · Canadá · México')}
                {saving && <span className="saving-dot"> · guardando…</span>}
              </div>
            </div>
          </div>
          {!publicMode && (
            <div className="header-actions">
              <button className="reset-btn" onClick={onReset} title="Reiniciar mis predicciones">
                <RefreshCw size={14} />
              </button>
              <button className="reset-btn reset-btn-logout" onClick={onLogout} title="Cerrar sesión">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
        <nav className="tabs">
          {tabs.map((t, idx) => {
            const Icon = t.icon;
            const st = (tabStatus && tabStatus[t.id]) || { status: 'empty', pending: 0 };
            const isActive = tab === t.id;
            // Insertar separador antes de la pestaña cuando cambia de grupo respecto a la anterior
            const grupoAnterior = idx > 0 ? tabs[idx - 1].grupo : null;
            const necesitaSeparador = grupoAnterior && grupoAnterior !== t.grupo;
            let badgeText = '';
            if (!isActive) {
              if (t.id === 'instrucciones') {
                badgeText = st.pending > 0 ? '•' : '';
              } else if (t.id === 'admin' || t.id === 'clasificacion' || t.id === 'jornadas' || t.id === 'cuadrofinal') {
                badgeText = '';
              } else {
                badgeText = st.status === 'ok' ? '✓' : (st.pending > 0 ? st.pending : '');
              }
            }
            return (
              <React.Fragment key={t.id}>
                {necesitaSeparador && <span className="tab-separator" aria-hidden="true" />}
                <button className={`tab tab-grupo-${t.grupo} ${isActive ? 'tab-active' : ''} ${t.id === 'admin' ? 'tab-admin' : ''}`}
                  onClick={() => setTab(t.id)}>
                  <Icon size={14} />
                  <span>{t.label}</span>
                  {badgeText !== '' && (
                    <span className={`tab-badge tab-badge-${st.status}`}>
                      {badgeText}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </header>
    </>
  );
};

const PendingIndicator = ({ status, pending, totalLabel, allDoneLabel = '¡Todo completo!' }) => {
  if (status === 'ok') {
    return (
      <div className="pending-card pending-card-ok">
        <CheckCircle2 size={18} />
        <div className="pending-text">
          <strong>{allDoneLabel}</strong>
          <span>Esta pestaña no tiene nada pendiente.</span>
        </div>
      </div>
    );
  }
  if (status === 'warn') {
    return (
      <div className="pending-card pending-card-warn">
        <AlertCircle size={18} />
        <div className="pending-text">
          <strong>{pending} {pending === 1 ? 'elemento pendiente' : 'elementos pendientes'}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
    );
  }
  // empty
  return (
    <div className="pending-card pending-card-empty">
      <Info size={18} />
      <div className="pending-text">
        <strong>Pendiente de completar pasos previos</strong>
        <span>Completa primero las pestañas anteriores para habilitar ésta.</span>
      </div>
    </div>
  );
};

// Barra de progreso visible al inicio de Grupos/KO con "X de N completados".
const MatchProgressCard = ({ completados, total, etiquetaSingular = 'partido', etiquetaPlural = 'partidos' }) => {
  const pendientes = Math.max(0, total - completados);
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
  const todoCompleto = pendientes === 0;
  return (
    <div className={`progress-card ${todoCompleto ? 'progress-card-done' : ''}`}>
      <div className="progress-card-row">
        <div className="progress-card-text">
          {todoCompleto ? (
            <>
              <strong>{total} {etiquetaPlural} completados</strong>
              <span>Esta pestaña ya está al 100 %.</span>
            </>
          ) : (
            <>
              <strong>{pendientes} {pendientes === 1 ? etiquetaSingular : etiquetaPlural} por completar</strong>
              <span>{completados} de {total} ({pct} %)</span>
            </>
          )}
        </div>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
};

const RandomBtn = ({ onClick, label = 'Rellenar al azar' }) => (
  <button type="button" className="random-btn" onClick={onClick}>
    <Shuffle size={14} />
    <span>{label}</span>
    <Sparkles size={12} />
  </button>
);

const PartidoRow = ({ partido, resultado, onChange, publishedInfo, onPublicar, onDespublicar }) => {
  const completo = resultado.golesLocal !== '' && resultado.golesVisitante !== '';
  const infoLocal = EQUIPOS_INFO[partido.local] || { flag: '⚽' };
  const infoVisi = EQUIPOS_INFO[partido.visitante] || { flag: '⚽' };
  const publicado = publishedInfo && publishedInfo[partido.id];
  return (
    <div className={`match ${completo ? 'match-done' : ''} ${publicado ? 'match-published' : ''}`}>
      <div className="match-meta">
        <Clock size={11} />
        <span>{partido.fecha} · {partido.horaCET} CET</span>
        <span className="match-meta-dot">·</span>
        <MapPin size={11} />
        <span>{partido.sede}</span>
      </div>
      <div className="match-body">
        <div className="match-team match-team-left">
          <Flag pais={partido.local} size={22} />
          <span className="match-name">{partido.local}</span>
        </div>
        <div className="match-score">
          <input type="number" min="0" max="9" inputMode="numeric" pattern="[0-9]*"
            data-marker={`grupos-${partido.id}-local`}
            value={resultado.golesLocal}
            onChange={e => onChangeMarcadorAutoSalto(e, v => onChange(partido.id, 'golesLocal', v))}
            placeholder="–" />
          <span className="match-dash">:</span>
          <input type="number" min="0" max="9" inputMode="numeric" pattern="[0-9]*"
            data-marker={`grupos-${partido.id}-visitante`}
            value={resultado.golesVisitante}
            onChange={e => onChangeMarcadorAutoSalto(e, v => onChange(partido.id, 'golesVisitante', v))}
            placeholder="–" />
        </div>
        <div className="match-team match-team-right">
          <span className="match-name">{partido.visitante}</span>
          <Flag pais={partido.visitante} size={22} />
        </div>
      </div>
      {/* Botón publicar / despublicar SOLO en modo admin (cuando se pasa onPublicar) */}
      {onPublicar && (
        <div className="match-publish-bar">
          {publicado ? (
            <>
              <span className="match-published-chip"><CheckCircle2 size={12} />Publicado</span>
              <button type="button" className="match-publish-btn match-publish-btn-undo"
                onClick={() => onDespublicar && onDespublicar(partido.id)}>
                ↩ Despublicar
              </button>
            </>
          ) : (
            <button type="button" className="match-publish-btn"
              disabled={!completo}
              onClick={() => onPublicar(partido.id)}
              title={completo ? 'Publicar este partido' : 'Rellena el marcador primero'}>
              📢 Publicar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const TieBreakerBox = ({ empates, onResolve, contextLabel = 'grupo' }) => {
  if (!empates || empates.length === 0) return null;
  return (
    <div className="tiebreaker-box">
      {empates.map((emp) => (
        <TieBreakerItem
          key={emp.key}
          emp={emp}
          onResolve={onResolve}
          contextLabel={contextLabel}
        />
      ))}
    </div>
  );
};

const TieBreakerItem = ({ emp, onResolve, contextLabel }) => {
  const [order, setOrder] = useState(emp.equipos);

  useEffect(() => { setOrder(emp.equipos); }, [emp.key]);

  const move = (idx, dir) => {
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };

  const confirmar = () => {
    onResolve(emp.key, order.join('|'));
  };

  return (
    <div className={`tie-item ${emp.resolved ? 'tie-item-resolved' : 'tie-item-pending'}`}>
      <div className="tie-header">
        <span className="tie-dot" />
        <span className="tie-title">
          {emp.resolved ? 'Desempate resuelto' : 'Empate exacto · Define el orden'}
        </span>
      </div>
      <div className="tie-subtitle">
        Mismos pts · diferencia · goles a favor. Ordena de mejor a peor en este {contextLabel}.
      </div>
      <div className="tie-list">
        {order.map((equipo, idx) => {
          return (
            <div key={equipo} className="tie-row">
              <span className="tie-pos">{emp.startIdx + idx + 1}º</span>
              <Flag pais={equipo} size={18} />
              <span className="tie-name">{equipo}</span>
              <div className="tie-arrows">
                <button type="button" className="tie-arrow" disabled={idx === 0}
                  onClick={() => move(idx, -1)} title="Subir">▲</button>
                <button type="button" className="tie-arrow" disabled={idx === order.length - 1}
                  onClick={() => move(idx, 1)} title="Bajar">▼</button>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className="tie-confirm" onClick={confirmar}>
        {emp.resolved ? 'Actualizar orden' : 'Confirmar desempate'}
      </button>
    </div>
  );
};

const MiniClasificacion = ({ tabla }) => (
  <div className="mini-table-wrap">
    <table className="mini-table">
      <thead>
        <tr>
          <th className="mt-pos">#</th>
          <th className="mt-team">Equipo</th>
          <th className="mt-pts">Pts</th>
          <th>PJ</th>
          <th>GF</th>
          <th>GC</th>
          <th>DG</th>
        </tr>
      </thead>
      <tbody>
        {tabla.map((eq, i) => {
          return (
            <tr key={eq.equipo} className={i < 2 ? 'row-qual' : i === 2 ? 'row-third' : 'row-out'}>
              <td className="mt-pos">
                <span className={`pos-pill pos-${i + 1}`}>{i + 1}</span>
              </td>
              <td className="mt-team">
                <Flag pais={eq.equipo} size={18} />
                <span className="mt-name">{eq.equipo}</span>
              </td>
              <td className="mt-pts">{eq.pts}</td>
              <td>{eq.pj}</td>
              <td>{eq.gf}</td>
              <td>{eq.gc}</td>
              <td className={eq.dg > 0 ? 'dg-plus' : eq.dg < 0 ? 'dg-minus' : ''}>
                {eq.dg > 0 ? '+' : ''}{eq.dg}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const VistaPartidos = ({ resultados, clasificaciones, onChange, onResolveDesempate, publishedInfo, onPublicarPartido, onDespublicarPartido }) => {
  const completados = PARTIDOS.reduce((acc, p) => {
    const r = resultados[p.id];
    return r && r.golesLocal !== '' && r.golesVisitante !== '' ? acc + 1 : acc;
  }, 0);
  return (
  <div className="content">
    <MatchProgressCard completados={completados} total={72} />
    <div className="info-card">
      <Trophy size={16} />
      <span>Los dos primeros de cada grupo se clasifican directamente a Dieciseisavos. Criterios FIFA de desempate: 1.º puntos; 2.º diferencia de goles; 3.º goles a favor. Si hay empate exacto a puntos, diferencia de goles y goles a favor, aparecerá un activador para definir el orden manualmente.</span>
    </div>
    {Object.keys(GRUPOS).map(letra => {
      const partidosGrupo = PARTIDOS.filter(p => p.grupo === letra);
      const { tabla, empates } = clasificaciones[letra];
      return (
        <section key={letra} className="group-section">
          <div className="group-header">
            <div className="group-letter">{letra}</div>
            <div className="group-info">
              <div className="group-title">Grupo {letra}</div>
              <div className="group-teams">
                {GRUPOS[letra].join(' · ')}
              </div>
            </div>
          </div>
          <div className="group-split">
            <div className="group-matches">
              <div className="split-label">Partidos</div>
              {partidosGrupo.map(p => (
                <PartidoRow key={p.id} partido={p} resultado={resultados[p.id]} onChange={onChange}
                  publishedInfo={publishedInfo}
                  onPublicar={onPublicarPartido}
                  onDespublicar={onDespublicarPartido} />
              ))}
            </div>
            <div className="group-standings">
              <div className="split-label">Clasificación</div>
              <MiniClasificacion tabla={tabla} />
              <TieBreakerBox
                empates={empates}
                onResolve={(key, order) => onResolveDesempate(letra, key, order)}
                contextLabel="grupo"
              />
            </div>
          </div>
        </section>
      );
    })}
  </div>
  );
};


const VistaTerceros = ({ clasificaciones, desempateTerceros, onResolveTerceros, status, pending }) => {
  const { tabla: terceros, empates } = useMemo(
    () => calcularMejoresTerceros(clasificaciones, desempateTerceros),
    [clasificaciones, desempateTerceros]
  );
  return (
    <div className="content">
      <PendingIndicator
        status={status}
        pending={pending}
        totalLabel="Desempates de terceros pendientes que afectan al 8º clasificado."
        allDoneLabel="Ranking de terceros resuelto"
      />
      <div className="info-card">
        <Star size={16} />
        <span>Los 8 mejores terceros pasan a Dieciseisavos. Criterios FIFA de desempate: 1.º puntos; 2.º diferencia de goles; 3.º goles a favor. Si hay empate exacto a puntos, diferencia de goles y goles a favor, aparecerá un activador para definir el orden manualmente.</span>
      </div>
      <section className="group-section">
        <div className="group-header">
          <div className="group-letter group-letter-special">★</div>
          <div className="group-info">
            <div className="group-title">Ranking de Terceros</div>
            <div className="group-teams">8 mejores se clasifican</div>
          </div>
        </div>
        {terceros.length === 0 ? (
          <div className="empty-state">Aún no hay terceros con sus 3 partidos jugados.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th-pos">#</th><th>Gr.</th>
                    <th className="th-team">Equipo</th>
                    <th className="th-pts">Pts</th>
                    <th>PJ</th><th>G</th><th>E</th><th>P</th>
                    <th>GF</th><th>GC</th><th>DG</th>
                  </tr>
                </thead>
                <tbody>
                  {terceros.map((eq, i) => {
                    return (
                      <tr key={eq.equipo} className={i < 8 ? 'row-qual' : 'row-out'}>
                        <td className="td-pos">
                          <span className={`pos-pill ${i < 8 ? 'pos-qual' : 'pos-out'}`}>{i + 1}</span>
                        </td>
                        <td className="td-group">{eq.grupo}</td>
                        <td className="td-team">
                          <Flag pais={eq.equipo} size={18} />
                          <span>{eq.equipo}</span>
                        </td>
                        <td className="td-pts">{eq.pts}</td>
                        <td>{eq.pj}</td><td>{eq.pg}</td><td>{eq.pe}</td><td>{eq.pp}</td>
                        <td>{eq.gf}</td><td>{eq.gc}</td>
                        <td className={eq.dg > 0 ? 'dg-plus' : eq.dg < 0 ? 'dg-minus' : ''}>
                          {eq.dg > 0 ? '+' : ''}{eq.dg}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {empates && empates.length > 0 && (
              <div style={{ padding: '0 14px 14px' }}>
                <TieBreakerBox
                  empates={empates}
                  onResolve={onResolveTerceros}
                  contextLabel="ranking"
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

const KOMatch = ({ matchId, label, teamA, teamB, resultado, onChange, ronda, publishedInfo, onPublicar, onDespublicar }) => {
  const infoA = teamA ? EQUIPOS_INFO[teamA] || { flag: '⚽' } : null;
  const infoB = teamB ? EQUIPOS_INFO[teamB] || { flag: '⚽' } : null;
  const empate = resultado.golesLocal !== '' && resultado.golesVisitante !== '' &&
                 parseInt(resultado.golesLocal) === parseInt(resultado.golesVisitante);
  const completo = teamA && teamB && resultado.golesLocal !== '' && resultado.golesVisitante !== '';
  // Si es empate, requiere selección de clasificado para considerar "completo y publicable"
  const completoPublicable = completo && (!empate || resultado.clasifica);
  const disabled = !teamA || !teamB;
  const info = INFO_KO[matchId];
  const publicado = publishedInfo && publishedInfo[matchId];
  // Etiqueta y nº FIFA: si el caller no pasa label, lo construimos automáticamente.
  const lbl = label || buildKOLabel(matchId) || '';
  const fifaMatch = fifaMatchOf(matchId);

  return (
    <div className={`ko-match ${completo ? 'ko-match-done' : ''} ${disabled ? 'ko-match-disabled' : ''} ${publicado ? 'match-published' : ''}`}>
      <div className="ko-label">
        <span>{ronda}{fifaMatch ? ` · Match ${fifaMatch}` : ''}{lbl ? ' · ' + lbl : ''}</span>
        {info && (
          <div className="match-meta match-meta-inko">
            <Clock size={11} />
            <span>{fechaLegibleCorta(info.fecha)} · {info.horaCET} CET</span>
            <span className="match-meta-dot">·</span>
            <MapPin size={11} />
            <span>{sedeSinPais(info.sede)}</span>
          </div>
        )}
      </div>
      <div className="ko-body">
        <div className="ko-team ko-team-left">
          {teamA ? (<><Flag pais={teamA} size={20} /><span className="ko-name">{teamA}</span></>)
                 : (<span className="ko-tbd">Pendiente</span>)}
        </div>
        <div className="ko-score">
          <input type="number" min="0" max="9" inputMode="numeric" pattern="[0-9]*"
            data-marker={`ko-${matchId}-local`}
            value={resultado.golesLocal} disabled={disabled}
            onChange={e => onChangeMarcadorAutoSalto(e, v => onChange(matchId, 'golesLocal', v))}
            placeholder="–" />
          <span className="match-dash">:</span>
          <input type="number" min="0" max="9" inputMode="numeric" pattern="[0-9]*"
            data-marker={`ko-${matchId}-visitante`}
            value={resultado.golesVisitante} disabled={disabled}
            onChange={e => onChangeMarcadorAutoSalto(e, v => onChange(matchId, 'golesVisitante', v))}
            placeholder="–" />
        </div>
        <div className="ko-team ko-team-right">
          {teamB ? (<><span className="ko-name">{teamB}</span><Flag pais={teamB} size={20} /></>)
                 : (<span className="ko-tbd">Pendiente</span>)}
        </div>
      </div>
      {empate && teamA && teamB && (
        <div className="ko-penalties">
          <span className="ko-pen-label">¿Quién clasifica? <span className="ko-pen-hint">(por penaltis)</span></span>
          <button type="button" className={`pen-btn ${resultado.clasifica === 'a' ? 'pen-btn-active' : ''}`}
            onClick={() => onChange(matchId, 'clasifica', resultado.clasifica === 'a' ? '' : 'a')}>
            <Flag pais={teamA} size={16} /> {teamA}
          </button>
          <button type="button" className={`pen-btn ${resultado.clasifica === 'b' ? 'pen-btn-active' : ''}`}
            onClick={() => onChange(matchId, 'clasifica', resultado.clasifica === 'b' ? '' : 'b')}>
            {teamB} <Flag pais={teamB} size={16} />
          </button>
        </div>
      )}
      {empate && teamA && teamB && resultado.clasifica && (
        <div className="ko-pen-note">
          Clasificado por penaltis: {resultado.clasifica === 'a' ? teamA : teamB}
        </div>
      )}
      {/* Botón publicar / despublicar SOLO en modo admin */}
      {onPublicar && (
        <div className="match-publish-bar">
          {publicado ? (
            <>
              <span className="match-published-chip"><CheckCircle2 size={12} />Publicado</span>
              <button type="button" className="match-publish-btn match-publish-btn-undo"
                onClick={() => onDespublicar && onDespublicar(matchId)}>
                ↩ Despublicar
              </button>
            </>
          ) : (
            <button type="button" className="match-publish-btn"
              disabled={!completoPublicable}
              onClick={() => onPublicar(matchId)}
              title={completoPublicable ? 'Publicar este partido' : (empate ? 'Marca quién clasifica primero' : 'Rellena el marcador primero')}>
              📢 Publicar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const VistaEliminatorias = ({ clasificaciones, desempateTerceros, resultadosKO, onChangeKO, status, pending, publishedInfo, onPublicarPartido, onDespublicarPartido }) => {
  const tercerosObj = useMemo(
    () => calcularMejoresTerceros(clasificaciones, desempateTerceros),
    [clasificaciones, desempateTerceros]
  );
  const terceros = tercerosObj.tabla;

  // Aplicar Anexo C: mapping R32 → equipo tercero
  const top8 = terceros.slice(0, 8).map(t => ({ equipo: t.equipo, grupo: t.grupo }));
  const anexoCMap = (top8.length === 8) ? asignarTercerosAnexoC(top8) : {};

  const equiposCruces = {};
  R32_PAIRS.forEach(p => {
    equiposCruces[p.id] = {
      a: resolverEquipo({ ...p.a, _r32id: p.id }, clasificaciones, terceros, anexoCMap),
      b: resolverEquipo({ ...p.b, _r32id: p.id }, clasificaciones, terceros, anexoCMap),
      label: p.label,
    };
  });
  R16_PAIRS.forEach(p => {
    equiposCruces[p.id] = {
      a: getGanador(p.from[0], resultadosKO, equiposCruces),
      b: getGanador(p.from[1], resultadosKO, equiposCruces),
      label: '',
    };
  });
  QF_PAIRS.forEach(p => {
    equiposCruces[p.id] = {
      a: getGanador(p.from[0], resultadosKO, equiposCruces),
      b: getGanador(p.from[1], resultadosKO, equiposCruces),
      label: '',
    };
  });
  SF_PAIRS.forEach(p => {
    equiposCruces[p.id] = {
      a: getGanador(p.from[0], resultadosKO, equiposCruces),
      b: getGanador(p.from[1], resultadosKO, equiposCruces),
      label: '',
    };
  });
  equiposCruces[FINAL_PAIR.id] = {
    a: getGanador(SF_PAIRS[0].id, resultadosKO, equiposCruces),
    b: getGanador(SF_PAIRS[1].id, resultadosKO, equiposCruces),
    label: '',
  };
  const getPerdedor = (matchId) => {
    const cruce = equiposCruces[matchId];
    const ganador = getGanador(matchId, resultadosKO, equiposCruces);
    if (!ganador || !cruce.a || !cruce.b) return null;
    return ganador === cruce.a ? cruce.b : cruce.a;
  };
  equiposCruces[THIRD_PLACE.id] = {
    a: getPerdedor(SF_PAIRS[0].id),
    b: getPerdedor(SF_PAIRS[1].id),
    label: '',
  };

  const campeon = getGanador(FINAL_PAIR.id, resultadosKO, equiposCruces);
  const subcampeon = campeon && (campeon === equiposCruces[FINAL_PAIR.id].a
    ? equiposCruces[FINAL_PAIR.id].b : equiposCruces[FINAL_PAIR.id].a);
  const tercer = getGanador(THIRD_PLACE.id, resultadosKO, equiposCruces);

  const grupiCompletos = Object.values(clasificaciones).every(info => (info.tabla || info).every(e => e.pj === 3));

  // Contador de partidos KO completados (con marcador, y para empates con clasifica marcado)
  const koCompletados = ALL_KO_IDS.reduce((acc, id) => {
    const r = resultadosKO[id];
    if (!r) return acc;
    const tieneMarcador = r.golesLocal !== '' && r.golesVisitante !== '';
    if (!tieneMarcador) return acc;
    const empate = parseInt(r.golesLocal) === parseInt(r.golesVisitante);
    if (empate && !r.clasifica) return acc;
    return acc + 1;
  }, 0);

  return (
    <div className="content">
      <MatchProgressCard completados={koCompletados} total={32} />
      <PendingIndicator
        status={status}
        pending={pending}
        totalLabel="Cruces o desempates pendientes en eliminatorias."
        allDoneLabel="Eliminatorias completas"
      />
      <div className="info-card">
        <Shield size={16} />
        <span>Las eliminatorias se generan automáticamente. El resultado es para el partido completo (incluyendo prórroga si la hubiese). Si hay empate, marca quién clasifica a la siguiente ronda.</span>
      </div>

      {campeon && (
        <section className="champion-box">
          <div className="champion-trophy"><Trophy size={32} /></div>
          <div className="champion-label">CAMPEÓN DEL MUNDO</div>
          <div className="champion-name">
            <Flag pais={campeon} size={28} /> {campeon}
          </div>
          <div className="champion-podium">
            {subcampeon && (
              <div className="podium-item podium-silver">
                <span className="podium-pos">2º</span>
                <span><Flag pais={subcampeon} size={18} /> {subcampeon}</span>
              </div>
            )}
            {tercer && (
              <div className="podium-item podium-bronze">
                <span className="podium-pos">3º</span>
                <span><Flag pais={tercer} size={18} /> {tercer}</span>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="group-section">
        <div className="group-header">
          <div className="ko-round-letter">32</div>
          <div className="group-info">
            <div className="group-title">Dieciseisavos</div>
            <div className="group-teams">16 partidos · 28 jun – 3 jul</div>
          </div>
        </div>
        <div className="matches">
          {R32_PAIRS.map(p => (
            <KOMatch key={p.id} matchId={p.id} label={p.label}
              teamA={equiposCruces[p.id].a} teamB={equiposCruces[p.id].b}
              resultado={resultadosKO[p.id]} onChange={onChangeKO} ronda="1/16"
              publishedInfo={publishedInfo}
              onPublicar={onPublicarPartido}
              onDespublicar={onDespublicarPartido} />
          ))}
        </div>
      </section>

      <section className="group-section">
        <div className="group-header">
          <div className="ko-round-letter">16</div>
          <div className="group-info">
            <div className="group-title">Octavos</div>
            <div className="group-teams">8 partidos · 4 – 7 jul</div>
          </div>
        </div>
        <div className="matches">
          {R16_PAIRS.map(p => (
            <KOMatch key={p.id} matchId={p.id} label=""
              teamA={equiposCruces[p.id].a} teamB={equiposCruces[p.id].b}
              resultado={resultadosKO[p.id]} onChange={onChangeKO} ronda="1/8"
              publishedInfo={publishedInfo}
              onPublicar={onPublicarPartido}
              onDespublicar={onDespublicarPartido} />
          ))}
        </div>
      </section>

      <section className="group-section">
        <div className="group-header">
          <div className="ko-round-letter">8</div>
          <div className="group-info">
            <div className="group-title">Cuartos</div>
            <div className="group-teams">4 partidos · 9 – 11 jul</div>
          </div>
        </div>
        <div className="matches">
          {QF_PAIRS.map(p => (
            <KOMatch key={p.id} matchId={p.id} label=""
              teamA={equiposCruces[p.id].a} teamB={equiposCruces[p.id].b}
              resultado={resultadosKO[p.id]} onChange={onChangeKO} ronda="1/4"
              publishedInfo={publishedInfo}
              onPublicar={onPublicarPartido}
              onDespublicar={onDespublicarPartido} />
          ))}
        </div>
      </section>

      <section className="group-section">
        <div className="group-header">
          <div className="ko-round-letter">4</div>
          <div className="group-info">
            <div className="group-title">Semifinales</div>
            <div className="group-teams">2 partidos · 14 – 15 jul</div>
          </div>
        </div>
        <div className="matches">
          {SF_PAIRS.map(p => (
            <KOMatch key={p.id} matchId={p.id} label=""
              teamA={equiposCruces[p.id].a} teamB={equiposCruces[p.id].b}
              resultado={resultadosKO[p.id]} onChange={onChangeKO} ronda="SF"
              publishedInfo={publishedInfo}
              onPublicar={onPublicarPartido}
              onDespublicar={onDespublicarPartido} />
          ))}
        </div>
      </section>

      <section className="group-section">
        <div className="group-header">
          <div className="ko-round-letter ko-round-bronze">3º</div>
          <div className="group-info">
            <div className="group-title">Tercer puesto</div>
            <div className="group-teams">Sáb 18 jul</div>
          </div>
        </div>
        <div className="matches">
          <KOMatch matchId={THIRD_PLACE.id} label=""
            teamA={equiposCruces[THIRD_PLACE.id].a} teamB={equiposCruces[THIRD_PLACE.id].b}
            resultado={resultadosKO[THIRD_PLACE.id]} onChange={onChangeKO} ronda="3.º"
            publishedInfo={publishedInfo}
            onPublicar={onPublicarPartido}
            onDespublicar={onDespublicarPartido} />
        </div>
      </section>

      <section className="group-section group-section-final">
        <div className="group-header">
          <div className="ko-round-letter ko-round-gold"><Trophy size={18} /></div>
          <div className="group-info">
            <div className="group-title">FINAL</div>
            <div className="group-teams">Dom 19 jul · MetLife Stadium</div>
          </div>
        </div>
        <div className="matches">
          <KOMatch matchId={FINAL_PAIR.id} label=""
            teamA={equiposCruces[FINAL_PAIR.id].a} teamB={equiposCruces[FINAL_PAIR.id].b}
            resultado={resultadosKO[FINAL_PAIR.id]} onChange={onChangeKO} ronda="FINAL"
            publishedInfo={publishedInfo}
            onPublicar={onPublicarPartido}
            onDespublicar={onDespublicarPartido} />
        </div>
      </section>
    </div>
  );
};

const VistaPremios = ({ premios, onChange, completaPendiente, completed, onGoToInfo, titulo }) => (
  <div className="content">
    <div className="info-card">
      <Award size={16} />
      <span>{titulo || 'Tus predicciones para los premios individuales del torneo.'}</span>
    </div>
    {completaPendiente && (
      <div className="confirm-reminder">
        <Send size={18} />
        <div className="confirm-reminder-text">
          <strong>Tu porra está completa, pero falta confirmarla</strong>
          <span>Ve a la pestaña Info y pulsa "Confirmar envío". Podrás seguir editando hasta 1h antes del arranque del Mundial.</span>
        </div>
        <button className="confirm-reminder-btn" onClick={onGoToInfo}>Ir a Info</button>
      </div>
    )}
    {completed && (
      <div className="confirm-reminder confirm-reminder-ok">
        <CheckCircle2 size={18} />
        <div className="confirm-reminder-text">
          <strong>Porra enviada</strong>
          <span>Puedes seguir editándola hasta 1h antes del arranque del Mundial. Los cambios se guardan automáticamente.</span>
        </div>
      </div>
    )}
    <div className="awards">
      <div className="award-card">
        <div className="award-icon"><Crown size={22} /></div>
        <label className="award-label">Mejor Jugador del Mundial</label>
        <div className="award-sub">Balón de Oro</div>
        <input type="text" className="award-input" placeholder="Ej: Kylian Mbappé"
          value={premios.mejorJugador} onChange={e => onChange('mejorJugador', e.target.value)} />
      </div>
      <div className="award-card">
        <div className="award-icon"><Target size={22} /></div>
        <label className="award-label">Máximo Goleador</label>
        <div className="award-sub">Bota de Oro</div>
        <input type="text" className="award-input" placeholder="Ej: Erling Haaland"
          value={premios.maximoGoleador} onChange={e => onChange('maximoGoleador', e.target.value)} />
      </div>
      <div className="award-card">
        <div className="award-icon"><Shield size={22} /></div>
        <label className="award-label">Mejor Portero</label>
        <div className="award-sub">Guante de Oro</div>
        <input type="text" className="award-input" placeholder="Ej: Emiliano Martínez"
          value={premios.mejorPortero} onChange={e => onChange('mejorPortero', e.target.value)} />
      </div>
    </div>
    <div className="save-hint">
      <Save size={14} /><span>Tus predicciones se guardan automáticamente.</span>
    </div>
  </div>
);

// ============================================================
// VISTA INSTRUCCIONES
// ============================================================
const PUNTOS = [
  {
    fase: 'FASE DE GRUPOS',
    color: '#00d9a3',
    items: [
      { regla: 'Signo 1X2 (local, empate, visitante)', puntos: 2 },
      { regla: 'Acertar diferencia de goles (acertando signo)', puntos: 1 },
      { regla: 'Resultado exacto', puntos: 2 },
      { regla: 'Posición exacta (1º)', puntos: 2 },
      { regla: 'Posición exacta (2º)', puntos: 2 },
      { regla: 'Posición exacta (3º)', puntos: 2 },
      { regla: 'Posición exacta (4º)', puntos: 2 },
    ],
  },
  {
    fase: 'DIECISEISAVOS',
    color: '#6366f1',
    items: [
      { regla: 'Equipo clasificado para DIECISEISAVOS', puntos: 1 },
      { regla: 'Signo 1X2', puntos: 3 },
      { regla: 'Acertar diferencia de goles (acertando signo)', puntos: 2 },
      { regla: 'Resultado exacto', puntos: 3 },
    ],
  },
  {
    fase: 'OCTAVOS',
    color: '#6366f1',
    items: [
      { regla: 'Equipo clasificado para OCTAVOS', puntos: 4 },
      { regla: 'Signo 1X2', puntos: 4 },
      { regla: 'Acertar diferencia de goles (acertando signo)', puntos: 3 },
      { regla: 'Resultado exacto', puntos: 4 },
    ],
  },
  {
    fase: 'CUARTOS',
    color: '#6366f1',
    items: [
      { regla: 'Equipo clasificado para CUARTOS', puntos: 10 },
      { regla: 'Signo 1X2', puntos: 8 },
      { regla: 'Acertar diferencia de goles (acertando signo)', puntos: 8 },
      { regla: 'Resultado exacto', puntos: 8 },
    ],
  },
  {
    fase: 'SEMIFINALES',
    color: '#6366f1',
    items: [
      { regla: 'Equipo clasificado para SEMIFINALES', puntos: 25 },
      { regla: 'Signo 1X2', puntos: 10 },
      { regla: 'Acertar diferencia de goles (acertando signo)', puntos: 10 },
      { regla: 'Resultado exacto', puntos: 10 },
    ],
  },
  {
    fase: '3º Y 4º PUESTO',
    color: '#cd7f32',
    items: [
      { regla: 'Equipo clasificado para 3º y 4º Puesto', puntos: 16 },
      { regla: 'Signo 1X2', puntos: 12 },
      { regla: 'Acertar diferencia de goles (acertando signo)', puntos: 12 },
      { regla: 'Resultado exacto', puntos: 12 },
    ],
  },
  {
    fase: 'FINAL',
    color: '#ffb838',
    items: [
      { regla: 'Equipo clasificado para LA FINAL', puntos: 35 },
      { regla: 'Signo 1X2', puntos: 20 },
      { regla: 'Acertar diferencia de goles (acertando signo)', puntos: 20 },
      { regla: 'Resultado exacto', puntos: 20 },
    ],
  },
  {
    fase: 'TÍTULOS',
    color: '#ffb838',
    items: [
      { regla: 'Campeón', puntos: 100 },
      { regla: 'Subcampeón', puntos: 40 },
      { regla: '3º Clasificado', puntos: 30 },
    ],
  },
  {
    fase: 'PREMIOS INDIVIDUALES',
    color: '#ff3d6b',
    items: [
      { regla: 'Bota de Oro (máximo goleador)', puntos: 20 },
      { regla: 'Balón de Oro (mejor jugador)', puntos: 20 },
      { regla: 'Guante de Oro (mejor portero)', puntos: 20 },
    ],
  },
];

const VistaInstrucciones = ({ nombre, onChangeNombre, cerradas, completed, onConfirmarEnvio, puedeConfirmar }) => {
  const nombreVacio = !nombre || !nombre.trim();
  const tr = tiempoRestanteCierre();
  return (
  <div className="content">
    {cerradas && (
      <div className="pending-card pending-card-warn">
        <Lock size={18} />
        <div className="pending-text">
          <strong>Porras cerradas</strong>
          <span>El Mundial ha comenzado. Puedes consultar tus predicciones pero ya no editarlas.</span>
        </div>
      </div>
    )}
    {!cerradas && tr && (
      <div className="pending-card pending-card-empty">
        <Clock size={18} />
        <div className="pending-text">
          <strong>Cierre de porras: {fechaCierreLegible()}</strong>
          <span>
            Quedan {tr.dias > 0 ? `${tr.dias} días, ` : ''}{tr.horas}h {tr.minutos}min para que se cierren las predicciones.
          </span>
        </div>
      </div>
    )}
    {completed && (
      <div className="pending-card pending-card-ok">
        <CheckCircle2 size={18} />
        <div className="pending-text">
          <strong>Porra enviada</strong>
          <span>{cerradas ? 'Ya no se pueden hacer cambios.' : 'Aún puedes editar hasta 1h antes del arranque del Mundial.'}</span>
        </div>
      </div>
    )}
    <section className={`nombre-card ${!nombreVacio ? 'nombre-card-ok' : ''}`}>
      <div className="nombre-icon"><Crown size={20} /></div>
      <div className="nombre-body">
        <label className="nombre-label">Incluir mi nombre</label>
        <div className="nombre-sub">Cómo quieres aparecer en la clasificación de la porra</div>
        <input
          type="text"
          className="nombre-input"
          placeholder="Ej: Juan García"
          value={nombre}
          onChange={e => onChangeNombre(e.target.value)}
          maxLength={40}
          disabled={cerradas}
        />
      </div>
    </section>

    {puedeConfirmar && (
      <section className="confirm-card">
        <Send size={22} />
        <div>
          <div className="confirm-title">¡Tu porra está completa!</div>
          <div className="confirm-sub">Confirma el envío para que conste como definitiva.</div>
        </div>
        <button className="confirm-btn" onClick={onConfirmarEnvio}>
          Confirmar envío
        </button>
      </section>
    )}

    <section className="instr-section">
      <div className="instr-header">
        <BookOpen size={20} />
        <h2>Cómo completar tu porra</h2>
      </div>
      <ol className="instr-list">
        <li>
          <strong>Pestaña Grupos:</strong> rellena el resultado (goles del local y visitante) de los <strong>72 partidos</strong> de fase de grupos. La clasificación de cada grupo se calcula automáticamente a la derecha.
        </li>
        <li>
          <strong>Empates exactos en grupos:</strong> si dos o más equipos terminan con los mismos puntos, diferencia de goles y goles a favor, aparecerá un cuadro rojo de <em>desempate</em>. Usa las flechas ▲▼ para ordenarlos y pulsa "Confirmar desempate".
        </li>
        <li>
          <strong>Pestaña 3ºs:</strong> revisa el ranking de los mejores terceros (los 8 mejores pasan a Dieciseisavos). Si hay empate exacto, resuélvelo igual que en grupos.
        </li>
        <li>
          <strong>Pestaña KO:</strong> los cruces de Dieciseisavos se generan automáticamente cuando cierras todos los grupos. Rellena marcadores de cada eliminatoria. Si hay empate, marca quién clasifica con los botones.
        </li>
        <li>
          <strong>Tercer puesto y Final:</strong> al final del KO tienes el partido por el 3º puesto y la Final.
        </li>
        <li>
          <strong>Pestaña Premios:</strong> escribe el nombre del jugador que crees que ganará el Balón, la Bota y el Guante de Oro.
        </li>
      </ol>
    </section>

    <section className="instr-section">
      <div className="instr-header">
        <CheckCircle2 size={20} />
        <h2>Cómo verificar que está todo correcto</h2>
      </div>
      <ul className="instr-list">
        <li>
          Mira los <strong>badges junto a cada pestaña</strong>:
          <div className="instr-badges">
            <span className="instr-badge instr-badge-ok">✓</span> verde = pestaña completa y sin pendientes.
          </div>
          <div className="instr-badges">
            <span className="instr-badge instr-badge-warn">3</span> rojo (parpadea) = quedan elementos por rellenar o desempates sin resolver.
          </div>
          <div className="instr-badges">
            <span className="instr-badge instr-badge-empty">72</span> gris = aún no puedes completarla porque depende de pestañas anteriores.
          </div>
        </li>
        <li>
          <strong>Grupos completos:</strong> cuando los 72 partidos tengan marcador y no haya empates pendientes de desempatar.
        </li>
        <li>
          <strong>3ºs correcto:</strong> cuando no haya empates críticos sin resolver (los que afecten al 8º clasificado).
        </li>
        <li>
          <strong>KO correcto:</strong> cuando todos los partidos con equipos asignados tengan marcador, y los empates tengan clasificado marcado.
        </li>
        <li>
          <strong>Premios completos:</strong> cuando los tres campos (Balón, Bota y Guante de Oro) estén escritos.
        </li>
        <li>
          La barra de progreso superior muestra cuántos partidos de grupos llevas rellenos.
        </li>
        <li>
          Si quieres empezar de cero, pulsa el botón <RefreshCw size={12} style={{verticalAlign: 'middle'}} /> arriba a la derecha.
        </li>
      </ul>
    </section>

    <section className="instr-section">
      <div className="instr-header">
        <Trophy size={20} />
        <h2>Sistema de puntuación</h2>
      </div>
      <div className="puntos-grid">
        {PUNTOS.map((bloque) => (
          <div key={bloque.fase} className="puntos-bloque">
            <div className="puntos-bloque-header" style={{ borderLeftColor: bloque.color }}>
              <span className="puntos-bloque-title">{bloque.fase}</span>
            </div>
            <table className="puntos-table">
              <tbody>
                {bloque.items.map((it, i) => (
                  <tr key={i}>
                    <td className="puntos-regla">{it.regla}</td>
                    <td className="puntos-valor" style={{ color: bloque.color }}>+{it.puntos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="puntos-note">
        <AlertCircle size={14} />
        <span>
          <strong>Importante:</strong> en las rondas eliminatorias (Dieciseisavos en adelante), los puntos del marcador solo se conceden si tu predicción del enfrentamiento coincide con la realidad, es decir, si los dos equipos del partido que predijiste son los mismos que los del partido real. Si fallas alguno de los dos equipos, ese marcador NO suma puntos por signo, diferencia ni resultado exacto, aunque coincida numéricamente con la realidad. Sí puedes sumar los puntos por clasificación (equipo que pasa de ronda).
        </span>
      </div>
      <div className="puntos-note">
        <AlertCircle size={14} />
        <span>
          <strong>Resumen:</strong> para ganar puntos de marcador (signo, diferencia, exacto) en eliminatorias, el partido que predijiste debe tener exactamente los mismos dos equipos que el partido real. Si solo aciertas uno (o ninguno) de los equipos del cruce, ese marcador no suma puntos por la jugada. El acierto de clasificación (equipo que pasa de ronda) sí cuenta por separado.
        </span>
      </div>
    </section>

    <section className="instr-section instr-note">
      <Info size={16} />
      <span>
        Tus predicciones se guardan automáticamente en la nube. Puedes cerrar y volver más tarde, todo seguirá ahí.
      </span>
    </section>
  </div>
  );
};

// ============================================================
// APP PRINCIPAL
// ============================================================
// ============================================================
// PANTALLA DE LOGIN
// ============================================================
const LoginScreen = ({ onLogin, onPublicView, error }) => (
  <div className="landing">
    <img src={PORTADA_IMG} alt="Últimos campeones del mundo" className="landing-bg" />
    <div className="landing-gradient" />
    <div className="landing-content">
      <div className="landing-top">
        <div className="landing-eyebrow">
          <Trophy size={14} />
          <span>FIFA WORLD CUP</span>
        </div>
        <h1 className="landing-title">PORRA<br/>MUNDIAL 2026</h1>
        <div className="landing-sub">ESTADOS UNIDOS · CANADÁ · MÉXICO</div>
        <div className="landing-dates">11 jun — 19 jul 2026</div>
      </div>
      <div className="landing-bottom">
        <button type="button" className="landing-cta login-cta" onClick={onLogin}>
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          <span className="landing-cta-text">Entrar con Google</span>
        </button>
        <button type="button" className="landing-cta-secondary" onClick={onPublicView}>
          <Eye size={16} />
          <span>Ver clasificación pública</span>
        </button>
        {error && (
          <div className="login-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        <div className="landing-hint">Solo necesitamos tu nombre y email · Cero spam</div>
      </div>
    </div>
  </div>
);

// ============================================================
// VISTA CLASIFICACIÓN PÚBLICA
// ============================================================
const VistaClasificacion = ({ clasificacion, currentUid }) => {
  const [expanded, setExpanded] = useState(null); // uid de la fila expandida

  if (!clasificacion || !clasificacion.filas || clasificacion.filas.length === 0) {
    return (
      <div className="content">
        <div className="pending-card pending-card-empty">
          <Trophy size={18} />
          <div className="pending-text">
            <strong>Aún no hay clasificación publicada</strong>
            <span>El administrador la publicará tras los primeros partidos del Mundial.</span>
          </div>
        </div>
      </div>
    );
  }

  const fechaUpd = new Date(clasificacion.actualizadoEn);
  const filas = clasificacion.filas;

  const toggleExpand = (uid) => {
    setExpanded(expanded === uid ? null : uid);
  };

  return (
    <div className="content">
      <div className="info-card">
        <Trophy size={16} />
        <span>Clasificación general — Actualizada {fechaUpd.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
      <section className="group-section">
        <div className="group-header">
          <div className="group-letter group-letter-special"><BarChart3 size={20} /></div>
          <div className="group-info">
            <div className="group-title">Ranking · {filas.length} participantes</div>
            <div className="group-teams">Pulsa una fila para ver el desglose detallado</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table clasif-table">
            <thead>
              <tr>
                <th className="th-pos">#</th>
                <th className="th-team">Participante</th>
                <th className="th-pts">Total</th>
<th className="th-pts">Premio</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const isMe = f.uid === currentUid;
                const isExpanded = expanded === f.uid;
                const d = f.porFase || {};
                // KO de partidos = suma de marcadores de R32 + R16 + QF + SF + TP + Final
                const ptsKOResultados = (d.diecisei?.pts || 0) + (d.octavos?.pts || 0) + (d.cuartos?.pts || 0)
                  + (d.semis?.pts || 0) + (d.tercerPuesto?.pts || 0) + (d.final?.pts || 0);
                // Clasificados por ronda
                const ptsClasifR32 = d.diecisei?.clasif || 0;
                const ptsClasifOct = d.octavos?.clasif || 0;
                const ptsClasifQF = d.cuartos?.clasif || 0;
                const ptsClasifSF = d.semis?.clasif || 0;
                const ptsClasifFinal = d.final?.clasif || 0;
                // Cuadro final (títulos)
                const ptsCuadroFinal = d.titulos || 0;
                const ptsPremios = d.premios || 0;
                return (
                  <React.Fragment key={f.uid}>
                    <tr
                      className={`${isMe ? 'row-qual' : (i === 0 ? 'row-third' : '')} clasif-row-clickable`}
                      onClick={() => toggleExpand(f.uid)}
                    >
                      <td className="td-pos">
                        <span className={`pos-pill ${i < 3 ? 'pos-qual' : i < 8 ? 'pos-3' : ''}`}>{i + 1}</span>
                      </td>
                      <td className="td-team">
                        <span style={{ fontWeight: isMe ? 700 : 500 }}>{f.nombre || '(sin nombre)'}</span>
                        {isMe && <span className="me-tag">tú</span>}
                        <span className="expand-arrow">{isExpanded ? '▾' : '▸'}</span>
                      </td>
                      <td className="td-pts" style={{ fontSize: 14 }}>{f.puntosTotales || 0}</td>
                      <td className="td-pts" style={{ fontSize: 12 }}>
  {i === 0 ? '327.60€' : i === 1 ? '189€' : i === 2 ? '94.50€' : '—'}
</td>
                    </tr>
                    {isExpanded && (
                      <tr className="clasif-detail-row">
                        <td colSpan={4}>
                          <div className="clasif-detail">
                            <div className="clasif-detail-item">
                              <span>Resultados Fase de Grupos</span>
                              <strong>{d.grupos || 0}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Posiciones Grupos</span>
                              <strong>{d.gruposPos || 0}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Clasificados a Dieciseisavos</span>
                              <strong>{ptsClasifR32}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Clasificados a Octavos</span>
                              <strong>{ptsClasifOct}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Clasificados a Cuartos</span>
                              <strong>{ptsClasifQF}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Clasificados a Semifinales</span>
                              <strong>{ptsClasifSF}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Clasificados a Final</span>
                              <strong>{ptsClasifFinal}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Resultados KO</span>
                              <strong>{ptsKOResultados}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Cuadro Final (Campeón + Sub + 3º)</span>
                              <strong>{ptsCuadroFinal}</strong>
                            </div>
                            <div className="clasif-detail-item">
                              <span>Premios Individuales</span>
                              <strong>{ptsPremios}</strong>
                            </div>
                            <div className="clasif-detail-item clasif-detail-total">
                              <span>TOTAL</span>
                              <strong>{f.puntosTotales || 0}</strong>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// ============================================================
// VISTA JORNADAS - todos los partidos de un día con predicciones
// ============================================================
const VistaJornadas = ({ resultadosReales, todasLasPorras, filtroParticipante, setFiltroParticipante, cerradas }) => {
  const dias = useMemo(() => diasUnicos(), []);
  const hoy = todayKey();
  // Por defecto: día previo + día actual (si hay partidos hoy o ayer)
  // Si no hay partidos hoy/ayer, mostramos el siguiente día con partidos.
  const defaultDia = useMemo(() => {
    const ayer = diaAyer(hoy);
    if (dias.includes(hoy)) return hoy;
    if (dias.includes(ayer)) return ayer;
    // Próximo día con partidos
    const futuro = dias.find(d => d >= hoy);
    return futuro || dias[dias.length - 1];
  }, [hoy, dias]);

  const [diaSeleccionado, setDiaSeleccionado] = useState(defaultDia);
  const [verAmbos, setVerAmbos] = useState(true); // ayer + hoy

  // Lista de partidos del día seleccionado (y opcionalmente del anterior)
  const diasMostrar = useMemo(() => {
    if (!verAmbos) return [diaSeleccionado];
    const prev = diaAyer(diaSeleccionado);
    return dias.includes(prev) ? [prev, diaSeleccionado] : [diaSeleccionado];
  }, [diaSeleccionado, verAmbos, dias]);

  // Partidos a mostrar: de grupos + KO
  const partidosMostrar = useMemo(() => {
    const lista = [];
    diasMostrar.forEach(dia => {
      PARTIDOS.filter(p => fechaPartido(p) === dia).forEach(p => {
        lista.push({ tipo: 'grupos', id: p.id, partido: p, fechaDia: dia });
      });
      // KO
      Object.entries(DIAS_KO).filter(([id, d]) => d === dia).forEach(([id]) => {
        lista.push({ tipo: 'ko', id, fechaDia: dia });
      });
    });
    return lista;
  }, [diasMostrar]);

  const rRes = resultadosReales?.resultados || {};
  const rKO = resultadosReales?.resultadosKO || {};
  // Calcular cruces KO sobre la marcha desde los resultados reales (igual que AdminResultadosReales)
  const crucesKO = useMemo(() => {
    try {
      return resolverCrucesPorra(
        {
          resultados: rRes,
          resultadosKO: rKO,
          desempates: resultadosReales?.desempates || {},
          desempateTerceros: resultadosReales?.desempateTerceros || {},
        },
        CONSTANTES
      );
    } catch (e) {
      return {};
    }
  }, [rRes, rKO, resultadosReales?.desempates, resultadosReales?.desempateTerceros]);

  // Filtro de participantes
  const porrasFiltradas = filtroParticipante === '__all__'
    ? todasLasPorras
    : todasLasPorras.filter(p => p.uid === filtroParticipante);

  return (
    <div className="content">
      <div className="info-card">
        <Calendar size={16} />
        <span>Jornadas con resultados reales y predicciones. Las predicciones de un partido se revelan cuando el resultado real está publicado.</span>
      </div>

      {/* Selector de día y participante */}
      <section className="jornadas-controls">
        <div className="jornada-field">
          <label>Día</label>
          <select value={diaSeleccionado} onChange={e => setDiaSeleccionado(e.target.value)}>
            {dias.map(d => (
              <option key={d} value={d}>{fechaLegible(d)}</option>
            ))}
          </select>
        </div>
        <label className="jornada-toggle">
          <input type="checkbox" checked={verAmbos} onChange={e => setVerAmbos(e.target.checked)} />
          <span>Incluir día anterior</span>
        </label>
        <div className="jornada-field">
          <label>Participante</label>
          <select value={filtroParticipante} onChange={e => setFiltroParticipante(e.target.value)}>
            <option value="__all__">Todos los participantes</option>
            {todasLasPorras.map(p => (
              <option key={p.uid} value={p.uid}>{p.nombre || '(sin nombre)'}</option>
            ))}
          </select>
        </div>
      </section>

      {partidosMostrar.length === 0 && (
        <div className="empty-state">No hay partidos en estos días.</div>
      )}

      {partidosMostrar.map(item => {
        const partido = item.tipo === 'grupos' ? item.partido : null;
        const koInfo = item.tipo === 'ko' ? crucesKO[item.id] : null;
        const local = partido?.local || koInfo?.a || '?';
        const visitante = partido?.visitante || koInfo?.b || '?';
        // Para grupos usamos los datos del propio partido.
        // Para KO usamos INFO_KO (la fuente de verdad).
        const fechaKO = item.tipo === 'ko' ? INFO_KO[item.id] : null;
        const fecha = partido?.fecha || (fechaKO ? fechaLegibleCorta(fechaKO.fecha) : item.fechaDia);
        const hora = partido?.horaCET || fechaKO?.horaCET || '';
        const sede = partido?.sede || fechaKO?.sede || '';
        const realM = item.tipo === 'grupos' ? rRes[item.id] : rKO[item.id];
        const partidosPublicados = resultadosReales?.partidosPublicados || {};
        const tieneMarcadorReal = realM && realM.golesLocal !== '' && realM.golesVisitante !== '';
        // "yaJugado" para visualización: el partido está publicado por admin (o cerradas globales como fallback compatible)
        const yaJugado = !!partidosPublicados[item.id] || (cerradas && tieneMarcadorReal);

        const infoL = EQUIPOS_INFO[local] || { flag: '⚽' };
        const infoV = EQUIPOS_INFO[visitante] || { flag: '⚽' };

        return (
          <section key={item.tipo + '_' + item.id} className="jornada-card">
            <div className="jornada-card-head">
              <div className="jornada-meta">
                <span>{fecha}{hora ? ' · ' + hora + ' CET' : ''}{sede ? ' · ' + sede : ''}</span>
                <span className="jornada-tipo">{
                  item.tipo === 'ko'
                    ? (item.id.startsWith('R32_') ? '1/16'
                      : item.id.startsWith('R16_') ? '1/8'
                      : item.id.startsWith('QF_') ? '1/4'
                      : item.id.startsWith('SF_') ? 'SF'
                      : item.id === 'TP' ? '3.º'
                      : item.id === 'FINAL' ? 'FINAL'
                      : 'Eliminatoria')
                    : `Grupo ${partido?.grupo}`
                }</span>
              </div>
              <div className="jornada-marcador">
                <div className="jornada-team">
                  <Flag pais={local} size={22} />
                  <span>{local}</span>
                </div>
                {yaJugado ? (
                  <div className="jornada-result">
                    <span>{realM.golesLocal}</span>
                    <span style={{ color: 'var(--text-faint)' }}>—</span>
                    <span>{realM.golesVisitante}</span>
                  </div>
                ) : (
                  <div className="jornada-pending">
                    <Clock size={14} />
                    <span>Pendiente</span>
                  </div>
                )}
                <div className="jornada-team">
                  <span>{visitante}</span>
                  <Flag pais={visitante} size={22} />
                </div>
              </div>
            </div>

            {/* Predicciones: se muestran si el partido ya se jugó o las porras están cerradas */}
            {!yaJugado && !cerradas ? (
              <div className="jornada-veiled">
                <Lock size={14} />
                <span>Las predicciones se mostrarán cuando se publique el resultado.</span>
              </div>
            ) : (
              <div className="jornada-predicciones">
                <div className="jornada-pred-head">
                  <span>Participante</span>
                  <span>Predicción</span>
                  <span>Pts</span>
                </div>
                {porrasFiltradas.map(p => {
                  const pred = item.tipo === 'grupos'
                    ? (p.resultados || {})[item.id]
                    : (p.resultadosKO || {})[item.id];
                  if (!pred || pred.golesLocal === '' || pred.golesVisitante === '') {
                    return (
                      <div key={p.uid} className="jornada-pred-row">
                        <span>{p.nombre || '(sin nombre)'}</span>
                        <span style={{ color: 'var(--text-faint)' }}>—</span>
                        <span style={{ color: 'var(--text-faint)' }}>0</span>
                      </div>
                    );
                  }
                  // Calcular puntos del partido
                  let ptsLocales = 0;
                  try {
                    const escala = item.tipo === 'grupos' ? PTS.grupos
                      : item.id.startsWith('R32') ? PTS.diecisei
                      : item.id.startsWith('R16') ? PTS.octavos
                      : item.id.startsWith('QF') ? PTS.cuartos
                      : item.id.startsWith('SF') ? PTS.semis
                      : item.id === 'TP' ? PTS.tercerPuesto
                      : item.id === 'FINAL' ? PTS.final
                      : PTS.grupos;
                    // Solo evaluamos si en KO los dos equipos coinciden con la realidad
                    // Para grupos siempre evaluamos
                    let acierto = item.tipo === 'grupos';
                    if (item.tipo === 'ko' && koInfo) {
                      // Aquí simplificamos: si tu predicción del partido tiene equipos correctos asumidos, vale
                      acierto = true;
                    }
                    if (acierto) {
                      const sP = parseInt(pred.golesLocal) > parseInt(pred.golesVisitante) ? '1'
                        : parseInt(pred.golesLocal) < parseInt(pred.golesVisitante) ? '2' : 'X';
                      const sR = parseInt(realM.golesLocal) > parseInt(realM.golesVisitante) ? '1'
                        : parseInt(realM.golesLocal) < parseInt(realM.golesVisitante) ? '2' : 'X';
                      if (sP === sR) ptsLocales += escala.signo;
                      const dP = parseInt(pred.golesLocal) - parseInt(pred.golesVisitante);
                      const dR = parseInt(realM.golesLocal) - parseInt(realM.golesVisitante);
                      if (sP === sR && dP === dR) ptsLocales += escala.dif;
                      if (pred.golesLocal === realM.golesLocal && pred.golesVisitante === realM.golesVisitante) ptsLocales += escala.exacto;
                    }
                  } catch (e) {}
                  return (
                    <div key={p.uid} className="jornada-pred-row">
                      <span>{p.nombre || '(sin nombre)'}</span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                        {pred.golesLocal}-{pred.golesVisitante}
                      </span>
                      <span className={ptsLocales > 0 ? 'pts-gain' : ''}>{ptsLocales}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

// ============================================================
// VISTA ADMIN (solo visible para el email administrador)
// ============================================================

// ============================================================
// VISTA ADMIN (solo visible para el email administrador)
// ============================================================

const VistaAdmin = ({
  todasLasPorras,
  resultadosReales, setResultadosRealesLocal,
  diasCerrados, setDiasCerradosLocal,
  onPublicarClasificacion, publicando,
  onEditarPorraDe, onClasificacionUpdate, onBorrarPorraDe,
  onGenerarDummies, onLimpiarDummies, simulando,
  onRellenarMiPorraAlAzar,
  onImportarExcel,
  onPublicarTodos, onDespublicarTodos, onBorrarTodo,
  onCopiarPorraAdminAReales,
  clasificacion, currentUid,
}) => {
  const [subTab, setSubTab] = useState('resumen');

  const sub = [
    { id: 'resumen', label: 'Resumen', icon: Users },
    { id: 'grupos', label: 'Grupos', icon: Goal },
    { id: 'terceros', label: '3.os', icon: Star },
    { id: 'ko', label: 'KO', icon: Shield },
    { id: 'premios', label: 'Premios', icon: Award },
    { id: 'recalcular', label: 'Acciones', icon: BarChart3 },
    { id: 'descargar', label: 'Descargar Excel', icon: FileSpreadsheet },
  ];

  // Estado y handlers compartidos para "resultados reales como porra".
  // IMPORTANTE: inicializamos cada partido con objeto vacío por defecto, porque los componentes
  // PartidoRow y KOMatch asumen que reciben siempre un objeto válido { golesLocal, golesVisitante[, clasifica] }.
  const rResRaw = useMemo(() => resultadosReales?.resultados || {}, [resultadosReales]);
  const rKORaw = useMemo(() => resultadosReales?.resultadosKO || {}, [resultadosReales]);
  const rRes = useMemo(() => {
    const out = {};
    PARTIDOS.forEach(p => {
      out[p.id] = rResRaw[p.id] || { golesLocal: '', golesVisitante: '' };
    });
    return out;
  }, [rResRaw]);
  const rKO = useMemo(() => {
    const out = {};
    ALL_KO_IDS.forEach(id => {
      out[id] = rKORaw[id] || { golesLocal: '', golesVisitante: '', clasifica: '' };
    });
    return out;
  }, [rKORaw]);
  const rPrem = useMemo(() => ({
    mejorJugador: resultadosReales?.premios?.mejorJugador || '',
    mejorPortero: resultadosReales?.premios?.mejorPortero || '',
    maximoGoleador: resultadosReales?.premios?.maximoGoleador || '',
  }), [resultadosReales]);
  const rDes = resultadosReales?.desempates || {};
  const rDesT = resultadosReales?.desempateTerceros || {};
  const partidosPublicados = resultadosReales?.partidosPublicados || {};

  // Persistir cambio en resultadosReales y guardar en Firestore
  const guardarRR = (next) => {
    setResultadosRealesLocal(next);
    guardarResultadosReales(next).catch(e => console.error('Error guardando real', e));
  };

  const onChangeGrupoReal = (id, campo, valor) => {
    const limpio = valor === '' ? '' : String(Math.max(0, Math.min(9, parseInt(valor) || 0)));
    // Usamos rResRaw (sin defaults) para que el documento de Firestore no se llene de partidos vacíos
    const nuevo = { ...rResRaw, [id]: { ...(rResRaw[id] || { golesLocal: '', golesVisitante: '' }), [campo]: valor === '' ? '' : limpio } };
    guardarRR({ ...resultadosReales, resultados: nuevo });
  };
  const onChangeKOReal = (id, campo, valor) => {
    if (campo === 'clasifica') {
      const nuevo = { ...rKORaw, [id]: { ...(rKORaw[id] || { golesLocal: '', golesVisitante: '', clasifica: '' }), clasifica: valor } };
      guardarRR({ ...resultadosReales, resultadosKO: nuevo });
      return;
    }
    const limpio = valor === '' ? '' : String(Math.max(0, Math.min(9, parseInt(valor) || 0)));
    const nuevo = { ...rKORaw, [id]: { ...(rKORaw[id] || { golesLocal: '', golesVisitante: '', clasifica: '' }), [campo]: valor === '' ? '' : limpio } };
    guardarRR({ ...resultadosReales, resultadosKO: nuevo });
  };
  const onChangePremioReal = (campo, valor) => {
    const nuevo = { ...rPrem, [campo]: valor };
    guardarRR({ ...resultadosReales, premios: nuevo });
  };
  const onResolveDesempateReal = (letraGrupo, key, order) => {
    const nuevoDes = { ...rDes, [letraGrupo]: { ...(rDes[letraGrupo] || {}), [key]: order } };
    guardarRR({ ...resultadosReales, desempates: nuevoDes });
  };
  const onResolveTercerosReal = (key, order) => {
    const nuevoDesT = { ...rDesT, [key]: order };
    guardarRR({ ...resultadosReales, desempateTerceros: nuevoDesT });
  };

  // Publicar / despublicar partido individual
  const onPublicarPartido = async (matchId) => {
    const nuevo = { ...partidosPublicados, [matchId]: Date.now() };
    const next = { ...resultadosReales, partidosPublicados: nuevo };
    setResultadosRealesLocal(next);
    try {
      await guardarResultadosReales(next);
      await onPublicarClasificacion(next);
    } catch (e) {
      alert('Error publicando: ' + e.message);
    }
  };
  const onDespublicarPartido = async (matchId) => {
    if (!window.confirm('¿Despublicar este partido?\n\nEl marcador seguirá guardado pero los participantes ya no lo verán como confirmado.')) return;
    const nuevo = { ...partidosPublicados };
    delete nuevo[matchId];
    const next = { ...resultadosReales, partidosPublicados: nuevo };
    setResultadosRealesLocal(next);
    try {
      await guardarResultadosReales(next);
      await onPublicarClasificacion(next);
    } catch (e) {
      alert('Error despublicando: ' + e.message);
    }
  };

  // Clasificaciones reales (a partir de los resultados reales) para reusar componentes
  const clasificacionesReales = useMemo(() => {
    const result = {};
    Object.keys(GRUPOS).forEach(letra => {
      result[letra] = calcularClasificacionGrupo(letra, rRes, rDes);
    });
    return result;
  }, [rRes, rDes]);

  return (
    <div className="content">
      <div className="info-card">
        <KeyRound size={16} />
        <span>Panel de administración · {todasLasPorras.length} {todasLasPorras.length === 1 ? 'porra registrada' : 'porras registradas'}</span>
      </div>
      <nav className="sub-tabs">
        {sub.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id}
              className={`sub-tab ${subTab === s.id ? 'sub-tab-active' : ''}`}
              onClick={() => setSubTab(s.id)}>
              <Icon size={13} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>

      {subTab === 'resumen' && (
        <AdminResumen
          porras={todasLasPorras}
          onEditar={onEditarPorraDe}
          onBorrar={onBorrarPorraDe}
          onGenerarDummies={onGenerarDummies}
          onLimpiarDummies={onLimpiarDummies}
          onRellenarMiPorraAlAzar={onRellenarMiPorraAlAzar}
          onImportarExcel={onImportarExcel}
          onCopiarPorraAdminAReales={onCopiarPorraAdminAReales}
          publicando={publicando}
          simulando={simulando}
        />
      )}

      {subTab === 'grupos' && (
        <>
          <div className="admin-banner admin-banner-results">
            <Goal size={13} />
            <span>Estás introduciendo <strong>RESULTADOS REALES</strong> de los partidos de grupos. Cada marcador se guarda automáticamente. Pulsa "📢 Publicar" para confirmar el resultado de cada partido.</span>
          </div>
          <VistaPartidos
            resultados={rRes}
            clasificaciones={clasificacionesReales}
            onChange={onChangeGrupoReal}
            onResolveDesempate={onResolveDesempateReal}
            publishedInfo={partidosPublicados}
            onPublicarPartido={onPublicarPartido}
            onDespublicarPartido={onDespublicarPartido}
          />
        </>
      )}

      {subTab === 'terceros' && (
        <>
          <div className="admin-banner admin-banner-results">
            <Star size={13} />
            <span>Ranking de los 12 terceros según los resultados reales. Si hay empate exacto, resuelve manualmente.</span>
          </div>
          <VistaTerceros
            clasificaciones={clasificacionesReales}
            desempateTerceros={rDesT}
            onResolveTerceros={onResolveTercerosReal}
            status="ok"
            pending={0}
          />
        </>
      )}

      {subTab === 'ko' && (
        <>
          <div className="admin-banner admin-banner-results">
            <Shield size={13} />
            <span>Estás introduciendo <strong>RESULTADOS REALES</strong> de eliminatorias. Pulsa "📢 Publicar" en cada partido para confirmar.</span>
          </div>
          <VistaEliminatorias
            clasificaciones={clasificacionesReales}
            desempateTerceros={rDesT}
            resultadosKO={rKO}
            onChangeKO={onChangeKOReal}
            status="ok"
            pending={0}
            publishedInfo={partidosPublicados}
            onPublicarPartido={onPublicarPartido}
            onDespublicarPartido={onDespublicarPartido}
          />
        </>
      )}

      {subTab === 'premios' && (
        <>
          <div className="admin-banner admin-banner-results">
            <Award size={13} />
            <span>Premios individuales <strong>REALES</strong> del Mundial. Rellena al final del torneo.</span>
          </div>
          <VistaPremios
            premios={rPrem}
            onChange={onChangePremioReal}
            completaPendiente={false}
            completed={false}
            onGoToInfo={() => {}}
            titulo="Premios individuales reales del Mundial 2026. Rellena al final del torneo cuando FIFA los anuncie."
          />
        </>
      )}

      {subTab === 'recalcular' && (
        <AdminRecalcular
          publicando={publicando}
          onPublicarTodos={onPublicarTodos}
          onDespublicarTodos={onDespublicarTodos}
          onBorrarTodo={onBorrarTodo}
        />
      )}
      {subTab === 'descargar' && (
        <AdminDescargarExcel
          porras={todasLasPorras}
          resultadosReales={resultadosReales}
        />
      )}
    </div>
  );
};

// ---------- AdminResumen: lista de porras ----------
const AdminResumen = ({ porras, onEditar, onBorrar, onGenerarDummies, onLimpiarDummies, onRellenarMiPorraAlAzar, onImportarExcel, onCopiarPorraAdminAReales, publicando, simulando }) => {
  const sorted = [...porras].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const completar = (p) => porraCompleta(p, CONSTANTES);

  return (
    <>
      <div className="admin-actions">
        {onRellenarMiPorraAlAzar && (
          <RandomBtn onClick={onRellenarMiPorraAlAzar} label="Rellenar mi porra al azar" />
        )}
        {onCopiarPorraAdminAReales && (
          <button
            className="admin-btn admin-btn-warn"
            onClick={onCopiarPorraAdminAReales}
            disabled={publicando}
            title="Copia tu propia porra como resultados reales (útil para simular)"
          >
            📋 Copiar mi porra como resultados reales
          </button>
        )}
        <button className="admin-btn admin-btn-warn" onClick={onGenerarDummies} disabled={simulando} title="Genera 20 porras ficticias + Mundial simulado">
          {simulando ? <RefreshCw size={14} className="spin" /> : '🧪'} Generar 20 porras dummy
        </button>
        <button className="admin-btn admin-btn-warn" onClick={onLimpiarDummies} disabled={simulando} title="Borra todas las porras con email @demo.test">
          🧹 Limpiar dummies
        </button>
        {onImportarExcel && (
          <button className="admin-btn" onClick={onImportarExcel} disabled={simulando} title="Importa porras desde un Excel exportado (hoja _BACKUP)">
            📥 Importar Excel
          </button>
        )}
      </div>
      <section className="group-section">
        <div className="group-header">
          <div className="ko-round-letter"><Users size={18} /></div>
          <div className="group-info">
            <div className="group-title">Porras de los participantes</div>
            <div className="group-teams">{porras.length} total · click "editar" para modificar o 🗑 para borrar</div>
          </div>
        </div>
        {porras.length === 0 ? (
          <div className="empty-state">Aún no hay ninguna porra registrada.</div>
        ) : (
          <div className="table-wrap">
            <table className="table admin-table">
              <thead>
                <tr>
                  <th className="th-team">Nombre</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Predicciones</th>
                  <th>Actualizada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => {
                  const partidos = p.resultados
                    ? Object.values(p.resultados).filter(r => r && r.golesLocal !== '' && r.golesVisitante !== '').length
                    : 0;
                  const koDone = p.resultadosKO
                    ? Object.values(p.resultadosKO).filter(r => r && r.golesLocal !== '' && r.golesVisitante !== '').length
                    : 0;
                  const premios = p.premios
                    ? Object.values(p.premios).filter(v => v && v.trim()).length
                    : 0;
                  const fecha = p.updatedAt
                    ? new Date(p.updatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                    : '—';
                  const completa = completar(p);
                  const confirmada = p.completed;
                  return (
                    <tr key={p.uid} className="admin-row">
                      <td className="td-team">
                        <span style={{ color: 'var(--text)' }}>{p.nombre || '(sin nombre)'}</span>
                      </td>
                      <td style={{ fontSize: 11 }}>{p.email || '—'}</td>
                      <td>
                        {confirmada ? (
                          <span className="status-tag status-ok">Enviada</span>
                        ) : completa ? (
                          <span className="status-tag status-warn">Sin enviar</span>
                        ) : (
                          <span className="status-tag status-pending">Incompleta</span>
                        )}
                      </td>
                      <td>
                        <span className="pred-pill">
                          <span className={partidos === PARTIDOS.length ? 'pred-ok' : ''}>G:{partidos}/{PARTIDOS.length}</span>
                          <span className={koDone === ALL_KO_IDS.length ? 'pred-ok' : ''}>K:{koDone}/{ALL_KO_IDS.length}</span>
                          <span className={premios === 3 ? 'pred-ok' : ''}>P:{premios}/3</span>
                        </span>
                      </td>
                      <td style={{ fontSize: 11 }}>{fecha}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        <button className="admin-btn-mini" onClick={() => onEditar(p)}>
                          <Edit size={11} /> Editar
                        </button>
                        <button className="admin-btn-mini admin-btn-danger" onClick={() => onBorrar(p)} title="Borrar porra">
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

// ---------- AdminRecalcular ----------
const AdminRecalcular = ({ publicando, onPublicarTodos, onDespublicarTodos, onBorrarTodo }) => (
  <section className="group-section">
    <div className="group-header">
      <div className="ko-round-letter"><BarChart3 size={18} /></div>
      <div className="group-info">
        <div className="group-title">Acciones globales</div>
        <div className="group-teams">Publicar/despublicar todos los partidos · borrar resultados reales</div>
      </div>
    </div>
    <div style={{ padding: 20 }}>
      {/* ------- BLOQUE 1: Publicar / despublicar todos los partidos ------- */}
      <div className="recalc-block">
        <div className="recalc-block-title">📢 Publicar / despublicar todos los partidos</div>
        <div className="recalc-block-body">
          <button
            className="admin-btn admin-btn-primary"
            onClick={onPublicarTodos}
            disabled={publicando}
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            📢 Publicar TODOS los partidos
          </button>
          <button
            className="admin-btn"
            onClick={onDespublicarTodos}
            disabled={publicando}
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            ↩ Despublicar TODOS los partidos
          </button>
        </div>
        <div className="recalc-block-note">
          Publicar TODOS marca como publicados todos los partidos que tengan marcador completo (en KO, el empate también necesita clasificado).<br/>
          Despublicar TODOS quita las marcas de publicado pero <strong>conserva</strong> los marcadores guardados.
        </div>
      </div>

      {/* ------- BLOQUE 2: Borrar todo ------- */}
      <div className="recalc-block recalc-block-danger">
        <div className="recalc-block-title">🧹 Borrar resultados reales</div>
        <div className="recalc-block-body">
          <button
            className="admin-btn admin-btn-warn"
            onClick={onBorrarTodo}
            disabled={publicando}
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            🧹 Borrar TODOS los resultados reales
          </button>
        </div>
        <div className="recalc-block-note">
          Borra TODOS los marcadores reales, premios, títulos, desempates y la publicación. Vacía la clasificación.<br/>
          Las porras de los participantes NO se tocan. <strong>Acción destructiva.</strong>
        </div>
      </div>
    </div>
  </section>
);

// ---------- AdminDescargarExcel ----------
const AdminDescargarExcel = ({ porras, resultadosReales }) => {
  const generar = () => {
    const wb = XLSX.utils.book_new();

    // Pre-calculamos los cruces reales y los cruces de cada porra UNA SOLA VEZ
    // (los usamos en varias hojas).
    const crucesReales = resolverCrucesPorra(
      {
        resultados: resultadosReales?.resultados || {},
        resultadosKO: resultadosReales?.resultadosKO || {},
        desempates: resultadosReales?.desempates || {},
        desempateTerceros: resultadosReales?.desempateTerceros || {},
      },
      CONSTANTES
    );
    const crucesPorParticipante = {};
    porras.forEach(part => {
      try {
        crucesPorParticipante[part.uid] = resolverCrucesPorra(part, CONSTANTES);
      } catch (e) {
        crucesPorParticipante[part.uid] = {};
      }
    });

    // Hoja Resumen
    const resumen = porras.map((p, idx) => {
      const calc = calcularPuntos(p, resultadosReales, CONSTANTES);
      const d = calc.desglose;
      return {
        'Posición': idx + 1, // será actualizada al ordenar
        'Nombre': p.nombre || '(sin nombre)',
        'Email': p.email || '',
        'Puntos totales': calc.total,
        'Pts Grupos': d.ptsGrupos,
        'Pts Posiciones grupos': d.ptsGruposPos,
        'Pts Clasif. Dieciseisavos': d.ptsClasif1_16,
        'Pts Dieciseisavos': d.pts1_16,
        'Pts Clasif. Octavos': d.ptsClasifOct,
        'Pts Octavos': d.ptsOct,
        'Pts Clasif. Cuartos': d.ptsClasifQF,
        'Pts Cuartos': d.ptsQF,
        'Pts Clasif. Semis': d.ptsClasifSF,
        'Pts Semis': d.ptsSF,
        'Pts Clasif. 3º/4º': d.ptsClasif34,
        'Pts Partido 3º/4º': d.pts34,
        'Pts Clasif. Final': d.ptsClasifFinal,
        'Pts Final': d.ptsFinal,
        'Pts Campeón': d.ptsCampeon,
        'Pts Subcampeón': d.ptsSub,
        'Pts 3er Clasificado': d.pts3,
        'Pts Balón de Oro': d.ptsBalon,
        'Pts Bota de Oro': d.ptsBota,
        'Pts Guante de Oro': d.ptsGuante,
        '% Partidos completados': Math.round(((p.resultados ? Object.values(p.resultados).filter(r => r && r.golesLocal !== '').length : 0) / 72) * 100) + '%',
        'Última actualización': p.updatedAt ? new Date(p.updatedAt).toLocaleString('es-ES') : '',
      };
    }).sort((a, b) => b['Puntos totales'] - a['Puntos totales']);
    resumen.forEach((r, i) => { r['Posición'] = i + 1; });
    const hojaResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, hojaResumen, 'Resumen');

    // Hoja Grupos - matriz de partidos × participantes
    const filasGrupos = PARTIDOS.map(p => {
      const fila = {
        'ID': p.id,
        'Grupo': p.grupo,
        'Local': p.local,
        'Visitante': p.visitante,
      };
      const real = resultadosReales?.resultados?.[p.id];
      fila['Real'] = (real && real.golesLocal !== '') ? `${real.golesLocal}-${real.golesVisitante}` : '';
      porras.forEach(part => {
        const pred = part.resultados?.[p.id];
        fila[part.nombre || part.uid] = (pred && pred.golesLocal !== '') ? `${pred.golesLocal}-${pred.golesVisitante}` : '';
      });
      return fila;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasGrupos), 'Grupos');

    // Hoja KO - dos columnas por participante: "Equipos predichos" y "Marcador"
    const filasKO = ALL_KO_IDS.map(id => {
      const fila = { 'ID': id };
      const cR = crucesReales[id];
      const real = resultadosReales?.resultadosKO?.[id];
      // Resultados reales: Local, Visitante, Marcador
      fila['Real Local'] = cR?.a || '';
      fila['Real Visitante'] = cR?.b || '';
      fila['Real Marcador'] = (real && real.golesLocal !== '')
        ? `${real.golesLocal}-${real.golesVisitante}${real.clasifica ? ' (clasifica '+(real.clasifica === 'a' ? cR?.a || 'A' : cR?.b || 'B')+')' : ''}`
        : '';
      // Por participante: 3 columnas (Local, Visitante, Marcador)
      porras.forEach(part => {
        const nombre = part.nombre || part.uid;
        const cP = crucesPorParticipante[part.uid]?.[id];
        const pred = part.resultadosKO?.[id];
        fila[`${nombre} - Local`] = cP?.a || '';
        fila[`${nombre} - Visitante`] = cP?.b || '';
        fila[`${nombre} - Marcador`] = (pred && pred.golesLocal !== '')
          ? `${pred.golesLocal}-${pred.golesVisitante}${pred.clasifica ? ' (clasifica '+(pred.clasifica === 'a' ? cP?.a || 'A' : cP?.b || 'B')+')' : ''}`
          : '';
      });
      return fila;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasKO), 'KO');

    // Hoja Premios
    const filasPremios = porras.map(part => ({
      'Nombre': part.nombre || part.uid,
      'Email': part.email || '',
      'Balón de Oro': part.premios?.mejorJugador || '',
      'Bota de Oro': part.premios?.maximoGoleador || '',
      'Guante de Oro': part.premios?.mejorPortero || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasPremios), 'Premios');

    // Hoja "Partidos por participante" - vista vertical con todos los marcadores de cada uno
    const filasPartPart = [];
    porras.forEach((part, idx) => {
      const nombre = part.nombre || part.uid;
      // Cabecera de bloque
      filasPartPart.push({
        'Participante': nombre,
        'Email': part.email || '',
        'Fase': '— PARTIDOS DE GRUPOS —',
        'Partido': '',
        'Fecha': '',
        'Hora CET': '',
        'Predicción': '',
        'Resultado real': '',
      });
      PARTIDOS.forEach(p => {
        const pred = part.resultados?.[p.id];
        const real = resultadosReales?.resultados?.[p.id];
        filasPartPart.push({
          'Participante': '',
          'Email': '',
          'Fase': `Grupo ${p.grupo}`,
          'Partido': `${p.local} vs ${p.visitante}`,
          'Fecha': p.fecha,
          'Hora CET': p.horaCET,
          'Predicción': (pred && pred.golesLocal !== '') ? `${pred.golesLocal}-${pred.golesVisitante}` : '',
          'Resultado real': (real && real.golesLocal !== '') ? `${real.golesLocal}-${real.golesVisitante}` : '',
        });
      });
      // Bloque KO
      filasPartPart.push({
        'Participante': '',
        'Email': '',
        'Fase': '— ELIMINATORIAS —',
        'Partido': '',
        'Fecha': '',
        'Hora CET': '',
        'Predicción': '',
        'Resultado real': '',
      });
      ALL_KO_IDS.forEach(id => {
        const pred = part.resultadosKO?.[id];
        const real = resultadosReales?.resultadosKO?.[id];
        const cP = crucesPorParticipante[part.uid]?.[id];
        const cR = crucesReales[id];
        const labelP = (cP && cP.a && cP.b) ? `${cP.a} vs ${cP.b}` : id;
        const labelR = (cR && cR.a && cR.b) ? `${cR.a} vs ${cR.b}` : '';
        filasPartPart.push({
          'Participante': '',
          'Email': '',
          'Fase': 'KO',
          'Partido': labelP,
          'Fecha': '',
          'Hora CET': '',
          'Predicción': (pred && pred.golesLocal !== '')
            ? `${pred.golesLocal}-${pred.golesVisitante}${pred.clasifica ? ' (clasifica '+(pred.clasifica === 'a' ? cP?.a || 'A' : cP?.b || 'B')+')' : ''}`
            : '',
          'Resultado real': (real && real.golesLocal !== '')
            ? `${labelR ? labelR + ' ' : ''}${real.golesLocal}-${real.golesVisitante}${real.clasifica ? ' (clasifica '+(real.clasifica === 'a' ? cR?.a || 'A' : cR?.b || 'B')+')' : ''}`
            : '',
        });
      });
      // Separador entre participantes
      if (idx < porras.length - 1) {
        filasPartPart.push({});
      }
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasPartPart), 'Partidos por participante');

    // Hoja Resultados Reales
    const realRows = [];
    PARTIDOS.forEach(p => {
      const r = resultadosReales?.resultados?.[p.id];
      realRows.push({
        'Tipo': 'Grupos', 'ID': p.id, 'Grupo': p.grupo,
        'Local': p.local, 'Visitante': p.visitante,
        'Goles Local': r?.golesLocal || '', 'Goles Visit.': r?.golesVisitante || '',
      });
    });
    ALL_KO_IDS.forEach(id => {
      const r = resultadosReales?.resultadosKO?.[id];
      realRows.push({
        'Tipo': 'KO', 'ID': id, 'Grupo': '', 'Local': '', 'Visitante': '',
        'Goles Local': r?.golesLocal || '', 'Goles Visit.': r?.golesVisitante || '',
        'Clasifica': r?.clasifica || '',
      });
    });
    realRows.push({ 'Tipo': 'Título', 'ID': 'campeon', 'Local': resultadosReales?.titulos?.campeon || '' });
    realRows.push({ 'Tipo': 'Título', 'ID': 'subcampeon', 'Local': resultadosReales?.titulos?.subcampeon || '' });
    realRows.push({ 'Tipo': 'Título', 'ID': 'tercer', 'Local': resultadosReales?.titulos?.tercer || '' });
    realRows.push({ 'Tipo': 'Premio', 'ID': 'balon', 'Local': resultadosReales?.premios?.mejorJugador || '' });
    realRows.push({ 'Tipo': 'Premio', 'ID': 'bota', 'Local': resultadosReales?.premios?.maximoGoleador || '' });
    realRows.push({ 'Tipo': 'Premio', 'ID': 'guante', 'Local': resultadosReales?.premios?.mejorPortero || '' });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(realRows), 'Resultados Reales');

    // === Hoja _BACKUP: formato robusto para reimportación ===
    // Cada porra se serializa completa en una celda JSON. Mantiene UID, email,
    // nombre, marcadores de grupos, KO, premios, desempates y desempateTerceros.
    const backupRows = porras.map(part => ({
      'Tipo': 'porra',
      'UID': part.uid || '',
      'Email': part.email || '',
      'Nombre': part.nombre || '',
      'Datos (JSON)': JSON.stringify({
        resultados: part.resultados || {},
        resultadosKO: part.resultadosKO || {},
        premios: part.premios || {},
        desempates: part.desempates || {},
        desempateTerceros: part.desempateTerceros || {},
        nombre: part.nombre || '',
        email: part.email || '',
      }),
    }));
    // Añadir cabecera con versión para futura compatibilidad
    const backupSheet = XLSX.utils.json_to_sheet(backupRows);
    XLSX.utils.book_append_sheet(wb, backupSheet, '_BACKUP');

    XLSX.writeFile(wb, `porras_mundial_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <section className="group-section">
      <div className="group-header">
        <div className="ko-round-letter"><FileSpreadsheet size={18} /></div>
        <div className="group-info">
          <div className="group-title">Descargar todo en Excel</div>
          <div className="group-teams">6 hojas: Resumen · Grupos · KO · Premios · Resultados Reales · _BACKUP (reimportable)</div>
        </div>
      </div>
      <div style={{ padding: 24, textAlign: 'center' }}>
        <button
          className="admin-btn admin-btn-primary"
          onClick={generar}
          disabled={porras.length === 0}
          style={{ padding: '12px 24px', fontSize: 14 }}
        >
          <Download size={16} /> Generar y descargar Excel
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-faint)' }}>
          {porras.length} {porras.length === 1 ? 'porra incluida' : 'porras incluidas'}
        </div>
      </div>
    </section>
  );
};

// ============================================================
// VISTA CUADRO FINAL (Campeón, Subcampeón, 3º + 3 premios)
// Compartida entre vista pública y admin
// ============================================================
const CuadroFinalView = ({ todasLasPorras, resultadosReales, clasificacion, currentUid, filtroParticipante, setFiltroParticipante, contexto = 'publico', cerradas = false }) => {
  // En modo público, si las porras no han cerrado todavía, ocultamos las predicciones
  const ocultoHastaCierre = contexto === 'publico' && !cerradas;

  // Estado de ordenación de la tabla
  const [sortBy, setSortBy] = useState('pos');
  const [sortDir, setSortDir] = useState('asc');
  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const porrasFiltradas = filtroParticipante === '__all__'
    ? todasLasPorras
    : todasLasPorras.filter(p => p.uid === filtroParticipante);

  const rTit = resultadosReales?.titulos || {};
  const rPrem = resultadosReales?.premios || {};

  // Calcular qué equipos están ELIMINADOS del torneo según los resultados reales del KO.
  // Un equipo está eliminado si perdió cualquier partido KO ya jugado.
  // Construimos un Set con todos los equipos eliminados (perdieron al menos un partido).
  const equiposEliminados = useMemo(() => {
    const elim = new Set();
    try {
      const cruces = resolverCrucesPorra(
        {
          resultados: resultadosReales?.resultados || {},
          resultadosKO: resultadosReales?.resultadosKO || {},
          desempates: resultadosReales?.desempates || {},
          desempateTerceros: resultadosReales?.desempateTerceros || {},
        },
        CONSTANTES
      );
      const rKO = resultadosReales?.resultadosKO || {};
      // Para cada partido KO ya jugado, marcar al perdedor como eliminado.
      Object.entries(rKO).forEach(([id, r]) => {
        if (!r || r.golesLocal === '' || r.golesVisitante === '') return;
        const c = cruces[id];
        if (!c || !c.a || !c.b) return;
        const gl = parseInt(r.golesLocal);
        const gv = parseInt(r.golesVisitante);
        if (isNaN(gl) || isNaN(gv)) return;
        // El partido de 3.º/4.º NO elimina al perdedor del cuadro principal
        // (ya estaba eliminado de la lucha por el título). Solo perder en
        // semifinales, cuartos, octavos, dieciseisavos o la final cuenta.
        let perdedor;
        if (gl > gv) perdedor = c.b;
        else if (gv > gl) perdedor = c.a;
        else {
          // Empate: clasifica gana, el otro pierde
          if (r.clasifica === 'a') perdedor = c.b;
          else if (r.clasifica === 'b') perdedor = c.a;
          else return; // empate sin clasificado: nadie eliminado aún
        }
        if (perdedor) elim.add(perdedor);
      });
    } catch (e) {
      // En caso de error, no marcamos a nadie como eliminado
    }
    return elim;
  }, [resultadosReales]);

  // Determinar si una predicción de Campeón / Sub / 3.º ya es imposible
  // según los resultados reales del KO.
  //
  // - Campeón: si el equipo perdió cualquier partido (incluida la Final), ya no puede ser campeón.
  // - Subcampeón: si el equipo perdió cualquier partido ANTES de la Final, ya no puede ser sub.
  //   (Solo se sabe que un equipo es sub cuando pierde la Final.)
  // - 3.º: si el equipo perdió antes de Semifinales, no puede ser 3.º. Tampoco si perdió el 3.º/4.º.
  const tachadoCampeon = (equipo) => {
    if (!equipo || equipo === '?' || equipo === '—') return false;
    return equiposEliminados.has(equipo);
  };
  const tachadoSub = (equipo) => {
    if (!equipo || equipo === '?' || equipo === '—') return false;
    // Si el equipo ganó la Final, ya tampoco es sub. Pero si perdió antes de la Final,
    // tampoco puede ser sub. La única manera de NO estar tachado es estar pendiente o haber perdido la Final.
    if (!equiposEliminados.has(equipo)) return false;
    // Si llegó a la Final y perdió, podemos detectarlo: cR de FINAL contiene a este equipo.
    try {
      const cruces = resolverCrucesPorra(
        {
          resultados: resultadosReales?.resultados || {},
          resultadosKO: resultadosReales?.resultadosKO || {},
          desempates: resultadosReales?.desempates || {},
          desempateTerceros: resultadosReales?.desempateTerceros || {},
        },
        CONSTANTES
      );
      const cF = cruces['FINAL'];
      const rF = resultadosReales?.resultadosKO?.['FINAL'];
      if (cF && (cF.a === equipo || cF.b === equipo) && rF && rF.golesLocal !== '') {
        // Sí llegó a la Final. Si la perdió, no se tacha (pudo ser sub).
        const gl = parseInt(rF.golesLocal), gv = parseInt(rF.golesVisitante);
        let perdedor;
        if (gl > gv) perdedor = cF.b;
        else if (gv > gl) perdedor = cF.a;
        else if (rF.clasifica === 'a') perdedor = cF.b;
        else if (rF.clasifica === 'b') perdedor = cF.a;
        if (perdedor === equipo) return false; // perdió la final, ES el sub real
      }
    } catch (e) {}
    return true; // perdió antes de la Final → no puede ser sub
  };
  const tachadoTercer = (equipo) => {
    if (!equipo || equipo === '?' || equipo === '—') return false;
    if (!equiposEliminados.has(equipo)) return false;
    // Si jugó el 3.º/4.º y lo ganó, no se tacha.
    try {
      const cruces = resolverCrucesPorra(
        {
          resultados: resultadosReales?.resultados || {},
          resultadosKO: resultadosReales?.resultadosKO || {},
          desempates: resultadosReales?.desempates || {},
          desempateTerceros: resultadosReales?.desempateTerceros || {},
        },
        CONSTANTES
      );
      const cT = cruces['TP'];
      const rT = resultadosReales?.resultadosKO?.['TP'];
      if (cT && (cT.a === equipo || cT.b === equipo) && rT && rT.golesLocal !== '') {
        const gl = parseInt(rT.golesLocal), gv = parseInt(rT.golesVisitante);
        let ganador;
        if (gl > gv) ganador = cT.a;
        else if (gv > gl) ganador = cT.b;
        else if (rT.clasifica === 'a') ganador = cT.a;
        else if (rT.clasifica === 'b') ganador = cT.b;
        if (ganador === equipo) return false; // ganó el 3.º/4.º, ES el tercero real
      }
    } catch (e) {}
    return true;
  };

  // Mapa de posiciones en clasificación general
  const posicionesPorUid = useMemo(() => {
    const map = {};
    (clasificacion?.filas || []).forEach((f, idx) => {
      map[f.uid] = idx + 1;
    });
    return map;
  }, [clasificacion]);

  // Construir las filas con todos los campos calculados
  const filas = porrasFiltradas.map(p => {
    const titPred = p.titulosPred || {};
    return {
      uid: p.uid,
      nombre: p.nombre || '(sin nombre)',
      pos: posicionesPorUid[p.uid] || 999,
      campeon: titPred.campeon || calcularCampeonDePorra(p, CONSTANTES) || '—',
      sub: titPred.subcampeon || calcularSubDePorra(p, CONSTANTES) || '—',
      tercer: titPred.tercer || calcularTercerDePorra(p, CONSTANTES) || '—',
      balon: p.premios?.mejorJugador || '—',
      bota: p.premios?.maximoGoleador || '—',
      guante: p.premios?.mejorPortero || '—',
    };
  });

  // Ordenar
  const filasOrdenadas = [...filas].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'pos') {
      cmp = a.pos - b.pos;
    } else {
      const aV = String(a[sortBy] || '').toLowerCase();
      const bV = String(b[sortBy] || '').toLowerCase();
      cmp = aV.localeCompare(bV, 'es');
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Cabecera ordenable
  const SortableTh = ({ col, label, className }) => (
    <th
      className={`cf-th-sortable ${className || ''} ${sortBy === col ? 'cf-th-active' : ''}`}
      onClick={() => toggleSort(col)}
      title="Ordenar por esta columna"
    >
      {label}
      {sortBy === col && (
        <span className="cf-sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
      )}
    </th>
  );

  return (
    <div className="content">
      <div className="info-card">
        <Crown size={16} />
        <span>
          {ocultoHastaCierre
            ? 'Las predicciones se mostrarán cuando se cierre el plazo de envío.'
            : 'Cuadro Final: campeón, subcampeón, tercero y premios individuales. Pulsa una cabecera para ordenar. Las predicciones tachadas indican equipos ya eliminados.'}
        </span>
      </div>

      {!ocultoHastaCierre && todasLasPorras.length > 0 && (
        <section className="jornadas-controls">
          <div className="jornada-field">
            <label>Participante</label>
            <select value={filtroParticipante} onChange={e => setFiltroParticipante(e.target.value)}>
              <option value="__all__">Todos los participantes</option>
              {todasLasPorras.map(p => (
                <option key={p.uid} value={p.uid}>{p.nombre || '(sin nombre)'}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Resultados reales (si los hay) */}
      {(rTit.campeon || rPrem.mejorJugador) && (
        <section className="group-section">
          <div className="group-header">
            <div className="ko-round-letter ko-round-gold"><Trophy size={18} /></div>
            <div className="group-info">
              <div className="group-title">Resultados oficiales</div>
              <div className="group-teams">Publicados por el administrador</div>
            </div>
          </div>
          <div className="cf-real">
            {rTit.campeon && <div className="cf-real-row"><span>🏆 Campeón</span><strong>{rTit.campeon}</strong></div>}
            {rTit.subcampeon && <div className="cf-real-row"><span>🥈 Subcampeón</span><strong>{rTit.subcampeon}</strong></div>}
            {rTit.tercer && <div className="cf-real-row"><span>🥉 3er Clasificado</span><strong>{rTit.tercer}</strong></div>}
            {rPrem.mejorJugador && <div className="cf-real-row"><span>👑 Balón de Oro</span><strong>{rPrem.mejorJugador}</strong></div>}
            {rPrem.maximoGoleador && <div className="cf-real-row"><span>🎯 Bota de Oro</span><strong>{rPrem.maximoGoleador}</strong></div>}
            {rPrem.mejorPortero && <div className="cf-real-row"><span>🛡️ Guante de Oro</span><strong>{rPrem.mejorPortero}</strong></div>}
          </div>
        </section>
      )}

      {ocultoHastaCierre ? (
        <div className="pending-card pending-card-empty">
          <Lock size={18} />
          <div className="pending-text">
            <strong>Predicciones bloqueadas</strong>
            <span>Se revelarán cuando se cierre el plazo de envío de porras.</span>
          </div>
        </div>
      ) : filasOrdenadas.length === 0 ? (
        <div className="empty-state">No hay porras para mostrar.</div>
      ) : (
        <section className="group-section">
          <div className="group-header">
            <div className="ko-round-letter"><Users size={18} /></div>
            <div className="group-info">
              <div className="group-title">Predicciones · {filasOrdenadas.length} {filasOrdenadas.length === 1 ? 'porra' : 'porras'}</div>
              <div className="group-teams">Cuadro final de cada participante</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table cf-table">
              <thead>
                <tr>
                  <SortableTh col="pos" label="Pos" />
                  <SortableTh col="nombre" label="Participante" className="th-team" />
                  <SortableTh col="campeon" label="🏆 Campeón" />
                  <SortableTh col="sub" label="🥈 Sub" />
                  <SortableTh col="tercer" label="🥉 3.º" />
                  <SortableTh col="balon" label="👑 Balón Oro" />
                  <SortableTh col="bota" label="🎯 Bota Oro" />
                  <SortableTh col="guante" label="🛡️ Guante Oro" />
                </tr>
              </thead>
              <tbody>
                {filasOrdenadas.map(f => {
                  const esYo = currentUid && f.uid === currentUid;
                  return (
                    <tr key={f.uid} className={esYo ? 'row-me' : ''}>
                      <td className="td-pos">{f.pos < 999 ? f.pos : '—'}</td>
                      <td className="td-team">
                        {f.nombre}
                        {esYo && <span className="me-tag">tú</span>}
                      </td>
                      <td className={tachadoCampeon(f.campeon) ? 'cf-eliminado' : ''}>{f.campeon}</td>
                      <td className={tachadoSub(f.sub) ? 'cf-eliminado' : ''}>{f.sub}</td>
                      <td className={tachadoTercer(f.tercer) ? 'cf-eliminado' : ''}>{f.tercer}</td>
                      <td>{f.balon}</td>
                      <td>{f.bota}</td>
                      <td>{f.guante}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

// Funciones helper para calcular campeón/sub/3º a partir del KO predicho.
// Resuelve los cruces igual que puntos.js.
function calcularCampeonDePorra(porra, CONSTANTES) {
  try {
    const ko = porra.resultadosKO || {};
    const finalM = ko['FINAL'];
    if (!finalM || finalM.golesLocal === '' || finalM.golesVisitante === '') return null;
    const cruces = resolverCrucesPorra(porra, CONSTANTES);
    const f = cruces['FINAL'];
    if (!f || !f.a || !f.b) return null;
    const gl = parseInt(finalM.golesLocal), gv = parseInt(finalM.golesVisitante);
    if (gl > gv) return f.a;
    if (gv > gl) return f.b;
    if (finalM.clasifica === 'a') return f.a;
    if (finalM.clasifica === 'b') return f.b;
    return null;
  } catch (e) { return null; }
}

function calcularSubDePorra(porra, CONSTANTES) {
  try {
    const camp = calcularCampeonDePorra(porra, CONSTANTES);
    if (!camp) return null;
    const cruces = resolverCrucesPorra(porra, CONSTANTES);
    const f = cruces['FINAL'];
    if (!f) return null;
    return camp === f.a ? f.b : f.a;
  } catch (e) { return null; }
}

function calcularTercerDePorra(porra, CONSTANTES) {
  try {
    const ko = porra.resultadosKO || {};
    const tpM = ko['TP'];
    if (!tpM || tpM.golesLocal === '' || tpM.golesVisitante === '') return null;
    const cruces = resolverCrucesPorra(porra, CONSTANTES);
    const t = cruces['TP'];
    if (!t || !t.a || !t.b) return null;
    const gl = parseInt(tpM.golesLocal), gv = parseInt(tpM.golesVisitante);
    if (gl > gv) return t.a;
    if (gv > gl) return t.b;
    if (tpM.clasifica === 'a') return t.a;
    if (tpM.clasifica === 'b') return t.b;
    return null;
  } catch (e) { return null; }
}

// Resuelve los cruces de una porra (versión simplificada de la de puntos.js)
function resolverCrucesPorra(porra, C) {
  const { GRUPOS, PARTIDOS, R32_PAIRS, R16_PAIRS, QF_PAIRS, SF_PAIRS, FINAL_PAIR, THIRD_PLACE } = C;
  const pRes = porra.resultados || {};
  const pKO = porra.resultadosKO || {};
  const pDes = porra.desempates || {};
  const pDesT = porra.desempateTerceros || {};

  // Importar localmente la lógica de clasificación
  const tieneMarcador = (r) => r && r.golesLocal !== '' && r.golesLocal != null && r.golesVisitante !== '' && r.golesVisitante != null;

  const clasificacionGrupo = (equipos, partidosG) => {
    const stats = {};
    equipos.forEach(eq => { stats[eq] = { equipo: eq, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, pts:0 }; });
    partidosG.forEach(p => {
      const r = pRes[p.id];
      if (!tieneMarcador(r)) return;
      const gl = parseInt(r.golesLocal), gv = parseInt(r.golesVisitante);
      if (isNaN(gl) || isNaN(gv)) return;
      const L = stats[p.local], V = stats[p.visitante];
      if (!L || !V) return;
      L.pj++; V.pj++; L.gf += gl; L.gc += gv; V.gf += gv; V.gc += gl;
      if (gl > gv) { L.pg++; L.pts += 3; V.pp++; }
      else if (gl < gv) { V.pg++; V.pts += 3; L.pp++; }
      else { L.pe++; V.pe++; L.pts++; V.pts++; }
    });
    Object.values(stats).forEach(s => { s.dg = s.gf - s.gc; });
    const arr = Object.values(stats);
    arr.sort((a, b) => (b.pts !== a.pts ? b.pts - a.pts : b.dg !== a.dg ? b.dg - a.dg : b.gf - a.gf));
    // Aplicar desempates manuales de grupo si existen.
    // Formato esperado: pDes = { letraGrupo: { 'EquipoA|EquipoB': 'EquipoA|EquipoB' } }
    if (pDes && typeof pDes === 'object') {
      let i = 0;
      while (i < arr.length) {
        const g = [arr[i]];
        let j = i + 1;
        while (j < arr.length && arr[j].pts === arr[i].pts && arr[j].dg === arr[i].dg && arr[j].gf === arr[i].gf) {
          g.push(arr[j]);
          j++;
        }
        if (g.length > 1) {
          // Identificar el grupo de letra para buscar desempates
          // La letra del grupo se obtiene buscando en GRUPOS
          let letraGrupo = null;
          for (const [l, eqs] of Object.entries(GRUPOS)) {
            if (g.every(s => eqs.includes(s.equipo))) { letraGrupo = l; break; }
          }
          if (letraGrupo && pDes[letraGrupo]) {
            const key = g.map(s => s.equipo).sort().join('|');
            const orderStr = pDes[letraGrupo][key];
            if (orderStr) {
              const desired = orderStr.split('|');
              const ordered = desired.map(name => g.find(s => s.equipo === name)).filter(Boolean);
              if (ordered.length === g.length) {
                ordered.forEach((eq, idx) => { arr[i + idx] = eq; });
              }
            }
          }
        }
        i = j;
      }
    }
    return arr;
  };

  const clas = {};
  Object.entries(GRUPOS).forEach(([letra, equipos]) => {
    const pGr = PARTIDOS.filter(p => p.grupo === letra);
    clas[letra] = clasificacionGrupo(equipos, pGr);
  });
  const terceros = [];
  Object.entries(clas).forEach(([letra, tabla]) => {
    if (tabla[2] && tabla[2].pj === 3) terceros.push({ ...tabla[2], grupo: letra });
  });
  terceros.sort((a, b) => (b.pts !== a.pts ? b.pts - a.pts : b.dg !== a.dg ? b.dg - a.dg : b.gf - a.gf));

  // Aplicar desempates manuales entre terceros igual que en puntos.js
  if (pDesT) {
    let i = 0;
    while (i < terceros.length) {
      const g = [terceros[i]];
      let j = i + 1;
      while (j < terceros.length && terceros[j].pts === terceros[i].pts && terceros[j].dg === terceros[i].dg && terceros[j].gf === terceros[i].gf) {
        g.push(terceros[j]);
        j++;
      }
      if (g.length > 1) {
        const key = g.map(e => e.equipo).sort().join('|');
        const orderStr = pDesT[key];
        if (orderStr) {
          const desired = orderStr.split('|');
          const ordered = desired.map(name => g.find(e => e.equipo === name)).filter(Boolean);
          if (ordered.length === g.length) {
            ordered.forEach((eq, idx) => { terceros[i + idx] = eq; });
          }
        }
      }
      i = j;
    }
  }

  // Aplicar Anexo C FIFA: asignar los 8 mejores terceros a los 8 cruces R32 que reciben tercero,
  // siguiendo la tabla oficial de 495 escenarios (en lugar de "tercero[0] → primer cruce, etc.").
  const top8Terceros = terceros.slice(0, 8);
  const r32ATercero = (top8Terceros.length === 8)
    ? asignarTercerosAnexoC(top8Terceros)
    : {};

  const cruces = {};
  R32_PAIRS.forEach(p => {
    const resolverRef = (ref) => {
      if (ref.type === 'group') {
        const t = clas[ref.letter];
        const eq = t && t[ref.pos - 1];
        return (eq && eq.pj === 3) ? eq.equipo : null;
      }
      if (ref.type === 'third') {
        // Buscar el equipo asignado por el Anexo C a este R32_id
        return r32ATercero[p.id] || null;
      }
      return null;
    };
    cruces[p.id] = { a: resolverRef(p.a), b: resolverRef(p.b) };
  });

  const getGanador = (id) => {
    const c = cruces[id]; if (!c || !c.a || !c.b) return null;
    const r = pKO[id]; if (!tieneMarcador(r)) return null;
    const gl = parseInt(r.golesLocal), gv = parseInt(r.golesVisitante);
    if (gl > gv) return c.a;
    if (gv > gl) return c.b;
    if (r.clasifica === 'a') return c.a;
    if (r.clasifica === 'b') return c.b;
    return null;
  };
  const getPerdedor = (id) => {
    const c = cruces[id]; const g = getGanador(id);
    if (!g || !c.a || !c.b) return null;
    return g === c.a ? c.b : c.a;
  };
  [R16_PAIRS, QF_PAIRS, SF_PAIRS].forEach(arr => {
    arr.forEach(p => {
      cruces[p.id] = { a: getGanador(p.from[0]), b: getGanador(p.from[1]) };
    });
  });
  cruces[FINAL_PAIR.id] = { a: getGanador(SF_PAIRS[0].id), b: getGanador(SF_PAIRS[1].id) };
  cruces[THIRD_PLACE.id] = { a: getPerdedor(SF_PAIRS[0].id), b: getPerdedor(SF_PAIRS[1].id) };
  return cruces;
}

function randomGoal() {
  return String(Math.floor(Math.random() * 7) + 1);
}

export default function PorraMundial2026() {
  const [tab, setTab] = useState('instrucciones');
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'public' | 'app'

  // Estado de autenticación
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState(null);
  // Mientras procesamos un redirect de Google (móvil), bloqueamos el render para no
  // mostrar "Login" en el medio segundo entre que volvemos y Firebase nos identifica.
  const [procesandoRedirect, setProcesandoRedirect] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados nuevos compartidos
  const [todasLasPorras, setTodasLasPorras] = useState([]);
  const [resultadosReales, setResultadosReales] = useState(null);
  const [diasCerrados, setDiasCerrados] = useState({});
  const [clasificacion, setClasificacion] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [simulando, setSimulando] = useState(false);

  // Cuando admin edita la porra de otro usuario, guardamos referencia
  const [editandoUid, setEditandoUid] = useState(null);
  // Bandera para evitar autoguardado durante las transiciones de entrar/salir
  // del modo edición (evita race conditions que sobrescriban porras)
  const [switchingEdit, setSwitchingEdit] = useState(false);

  // dirtyRef: bandera que indica si los estados en memoria han sido modificados POR EL USUARIO
  // desde la última carga desde Firestore. Solo si dirty=true, el autoguardado dispara.
  // Esto evita "escrituras fantasma" cuando los datos llegan del listener onSnapshot.
  // - Cargar de Firestore (carga inicial o cambio remoto) → NO marca dirty.
  // - El usuario toca un input → marca dirty=true.
  // - Tras guardar correctamente → vuelve a dirty=false.
  // Usamos useRef en lugar de useState para que cambiarlo NO dispare re-render.
  const dirtyRef = useRef(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filtro en Jornadas
  const [filtroJornada, setFiltroJornada] = useState('__all__');
  // Filtro en Cuadro Final
  const [filtroCuadroFinal, setFiltroCuadroFinal] = useState('__all__');

  // Para hipótesis ("qué pasa si...")
  const [hipotesis, setHipotesis] = useState({}); // { 'M12': { golesLocal: '2', golesVisitante: '1' } }

  const [resultados, setResultados] = useState(() => {
    const init = {};
    PARTIDOS.forEach(p => { init[p.id] = { golesLocal: '', golesVisitante: '' }; });
    return init;
  });

  const [resultadosKO, setResultadosKO] = useState(() => {
    const init = {};
    ALL_KO_IDS.forEach(id => {
      init[id] = { golesLocal: '', golesVisitante: '', clasifica: '' };
    });
    return init;
  });

  const [premios, setPremios] = useState({ mejorJugador: '', mejorPortero: '', maximoGoleador: '' });
  const [nombre, setNombre] = useState('');
  const [desempates, setDesempates] = useState({});
  const [desempateTerceros, setDesempateTerceros] = useState({});
  const [completed, setCompleted] = useState(false);

  const isAdmin = user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const cerradas = porrasCerradas();
  const readOnly = cerradas && !editandoUid;

  // 1) Detectar cambios de autenticación.
  // Importante el orden: PRIMERO esperamos a getRedirectResult (por si volvemos de móvil),
  // y SOLO DESPUÉS suscribimos onAuthChange. Si lo hiciéramos al revés, el listener
  // se dispararía con null y mostraríamos la pantalla de login antes de completar el redirect.
  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    (async () => {
      // Completar redirect pendiente (si lo hay). En escritorio no pasa nada.
      // En móvil, esto resuelve el login tras volver de Google.
      // IMPORTANTE: completarLoginRedirect dentro espera a que la persistencia esté lista.
      try {
        const result = await completarLoginRedirect();
        if (result && result.user) {
          console.log('[Auth] Login completado via redirect:', result.user.email);
        }
      } catch (e) {
        console.error('[Auth] Error completando redirect:', e);
        if (e?.code === 'auth/unauthorized-domain') {
          setLoginError('Este dominio no está autorizado en Firebase. Añádelo en Authentication → Settings → Dominios autorizados.');
        } else if (e?.message) {
          setLoginError(e.message);
        }
      }

      if (cancelled) return;

      // Ya hemos procesado el redirect (con éxito o no), desbloqueamos el render.
      setProcesandoRedirect(false);

      // Suscribir onAuthChange. Si el redirect tuvo éxito, este listener se disparará
      // con el usuario logueado de forma natural.
      // Usamos setMode funcional (prev => ...) para no depender del closure de `mode`.
      unsub = onAuthChange((u) => {
        console.log('[Auth] onAuthChange:', u ? u.email : 'sin usuario');
        setUser(u);
        setAuthChecked(true);
        if (u) {
          setMode('app');
        } else {
          setMode(prev => {
            if (prev === 'public') return prev;
            setLoading(false);
            setEntered(false);
            return 'login';
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  // 2) Cuando hay usuario logueado, SUSCRIBIR a SU porra de Firestore en tiempo real.
  // Esto reemplaza la carga puntual anterior. Beneficios:
  // - Si editas la porra desde otro dispositivo, este la actualiza automáticamente.
  // - No hay estado obsoleto que sobrescriba datos recientes.
  // - Las actualizaciones del listener NO marcan dirty, así no se reescribe Firestore con lo mismo.
  useEffect(() => {
    if (!user) return;
    // No suscribirse a la porra propia si estamos editando la de otro (admin),
    // porque los estados están reflejando los del otro usuario.
    if (editandoUid) return;
    setLoading(true);
    let primera = true;
    const unsub = onPorraChange(user.uid, (datos) => {
      if (datos) {
        // Aplicar datos remotos SIN marcar dirty (los cambios vienen de Firestore).
        if (datos.resultados) setResultados(prev => ({ ...prev, ...datos.resultados }));
        if (datos.resultadosKO) setResultadosKO(prev => ({ ...prev, ...datos.resultadosKO }));
        if (datos.premios) setPremios(datos.premios);
        if (datos.desempates) setDesempates(datos.desempates);
        if (datos.desempateTerceros) setDesempateTerceros(datos.desempateTerceros);
        if (datos.nombre) setNombre(datos.nombre);
        else if (primera && user.displayName) setNombre(user.displayName);
        if (typeof datos.completed === 'boolean') setCompleted(!!datos.completed);
      } else if (primera) {
        // Primera vez sin porra previa: usar nombre de Google
        if (user.displayName) setNombre(user.displayName);
      }
      // Resetear dirty: los datos actuales coinciden con los de Firestore
      dirtyRef.current = false;
      if (primera) {
        setLoading(false);
        primera = false;
      }
    });
    return () => unsub();
  }, [user, editandoUid]);

  // 3) Cargar resultados reales, días cerrados y clasificación (en vivo)
  useEffect(() => {
    if (!user && mode !== 'public') return;
    let unsub1, unsub2;
    (async () => {
      try {
        const d = await cargarDiasCerrados();
        setDiasCerrados(d || {});
      } catch (e) {}
    })();
    unsub1 = onResultadosRealesChange((datos) => setResultadosReales(datos));
    unsub2 = onClasificacionChange((datos) => setClasificacion(datos));
    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, [user, mode]);

  // 4) Cargar todas las porras (admin + para vista de jornadas)
  const recargarPorras = useCallback(async () => {
    try {
     const list = isAdmin
      ? await listarTodasLasPorras()
      : await listarPorrasPublicas();
    setTodasLasPorras(list);
  } catch (e) {
    console.error('Error cargando porras:', e);
  }
}, [isAdmin]);
  useEffect(() => {
    if (user) recargarPorras();
  }, [user, recargarPorras]);

  // 5) Guardado automático (sólo si no estamos en read-only y no estamos editando porra ajena)
  const targetUid = editandoUid || user?.uid;
  useEffect(() => {
    if (loading || !targetUid) return;
    if (readOnly && !isAdmin) return;
    // CRÍTICO: si estamos en transición de entrada/salida de edición, NO guardar.
    if (switchingEdit) return;
    // CRÍTICO 2: solo guardar si los cambios vienen del usuario (dirty=true).
    // Si dirtyRef es false, los estados actuales coinciden con Firestore o vienen
    // de una actualización remota. Guardar reescribiría lo mismo sin necesidad.
    if (!dirtyRef.current) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await guardarPorra(targetUid, {
          nombre,
          email: editandoUid ? (todasLasPorras.find(p => p.uid === editandoUid)?.email || '') : user.email,
          resultados,
          resultadosKO,
          premios,
          desempates,
          desempateTerceros,
          ...(editandoUid && { lastEditedBy: 'admin', lastEditedAt: Date.now() }),
        });
        // Tras guardar correctamente, los datos en memoria coinciden con Firestore.
        dirtyRef.current = false;
      } catch (e) {
        console.error('Error guardando porra:', e);
      }
      setSaving(false);
    }, 800);
    return () => clearTimeout(t);
  }, [resultados, resultadosKO, premios, nombre, desempates, desempateTerceros, loading, targetUid, editandoUid, readOnly, isAdmin, switchingEdit]);

  // Handlers de login / logout
  const handleLogin = async () => {
    setLoginError(null);
    try {
      await loginConGoogle();
    } catch (e) {
      console.error(e);
      if (e.code === 'auth/popup-closed-by-user') {
        setLoginError('Has cerrado la ventana de login.');
      } else if (e.code === 'auth/unauthorized-domain') {
        setLoginError('Este dominio no está autorizado en Firebase. Añádelo en Authentication → Settings → Dominios autorizados.');
      } else {
        setLoginError(e.message || 'Error al iniciar sesión.');
      }
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Cerrar sesión? Tus datos están guardados en la nube y los recuperarás al volver a entrar.')) return;
    await logout();
    setMode('login');
  };

  const handlePublicView = () => {
    setMode('public');
    setAuthChecked(true);
    setLoading(false);
    setTab('clasificacion');
  };

  // Cargar porras públicas para el modo público (sin login)
  useEffect(() => {
    if (mode === 'public' && todasLasPorras.length === 0) {
      // En modo público leemos de la colección /porrasPublicas (sanitizada, sin emails).
      // Esta colección es pública según las reglas de Firestore.
      listarPorrasPublicas().then(list => setTodasLasPorras(list)).catch(err => {
        console.error('Error cargando porras públicas:', err);
      });
    }
  }, [mode]);


  const onChangeResultado = (id, campo, valor) => {
    const limpio = valor === '' ? '' : String(Math.max(0, Math.min(9, parseInt(valor) || 0)));
    dirtyRef.current = true;
    setResultados(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor === '' ? '' : limpio }
    }));
  };

  const onChangeKO = (id, campo, valor) => {
    dirtyRef.current = true;
    if (campo === 'clasifica') {
      setResultadosKO(prev => ({ ...prev, [id]: { ...prev[id], clasifica: valor } }));
      return;
    }
    const limpio = valor === '' ? '' : String(Math.max(0, Math.min(9, parseInt(valor) || 0)));
    setResultadosKO(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor === '' ? '' : limpio }
    }));
  };

  const onChangePremio = (campo, valor) => {
    dirtyRef.current = true;
    setPremios(prev => ({ ...prev, [campo]: valor }));
  };

  // ----- RANDOM HANDLERS - SIN confirm() para evitar fallos silenciosos -----
  const onRandomAll = () => {
    const nuevo = {};
    PARTIDOS.forEach(p => {
      nuevo[p.id] = { golesLocal: randomGoal(), golesVisitante: randomGoal() };
    });
    dirtyRef.current = true;
    setResultados(nuevo);
  };

  const onRandomKO = () => {
    const nuevoKO = {};
    ALL_KO_IDS.forEach(id => {
      const gl = randomGoal();
      const gv = randomGoal();
      const clasifica = (gl === gv) ? (Math.random() < 0.5 ? 'a' : 'b') : '';
      nuevoKO[id] = { golesLocal: gl, golesVisitante: gv, clasifica };
    });
    dirtyRef.current = true;
    setResultadosKO(nuevoKO);
  };

  const onResolveDesempate = (letraGrupo, key, order) => {
    dirtyRef.current = true;
    setDesempates(prev => ({
      ...prev,
      [letraGrupo]: { ...(prev[letraGrupo] || {}), [key]: order }
    }));
  };

  const onResolveTerceros = (key, order) => {
    dirtyRef.current = true;
    setDesempateTerceros(prev => ({ ...prev, [key]: order }));
  };

  const handleReset = () => {
    if (!window.confirm(
      '⚠️ ¿Borrar TODAS tus predicciones?\n\n' +
      'Se eliminarán:\n' +
      '• Los 72 marcadores de grupos\n' +
      '• Los 32 marcadores de eliminatorias\n' +
      '• Los desempates de grupo y terceros\n' +
      '• Los premios individuales (Balón, Bota, Guante)\n\n' +
      'Tu nombre se mantiene. Esta acción NO se puede deshacer.'
    )) return;
    const init = {};
    PARTIDOS.forEach(p => { init[p.id] = { golesLocal: '', golesVisitante: '' }; });
    dirtyRef.current = true;
    setResultados(init);
    const initKO = {};
    ALL_KO_IDS.forEach(id => { initKO[id] = { golesLocal: '', golesVisitante: '', clasifica: '' }; });
    setResultadosKO(initKO);
    setPremios({ mejorJugador: '', mejorPortero: '', maximoGoleador: '' });
    setDesempates({});
    setDesempateTerceros({});
  };

  // Rellenar mi propia porra con datos aleatorios (atajo de admin para pruebas).
  // SOBRESCRIBE todo lo que ya tuviera (pide confirmación).
  const handleRellenarMiPorraAlAzar = () => {
    if (!isAdmin) return;
    if (!window.confirm(
      '🎲 ¿Rellenar TU porra con datos aleatorios?\n\n' +
      'Se sobrescribirán todos tus marcadores, desempates y premios.\n' +
      'Esto es un atajo para probar; úsalo solo si no te importa perder lo que tengas.'
    )) return;

    const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const marcador = () => {
      const r = Math.random();
      if (r < 0.3) return aleatorio(0, 1);
      if (r < 0.7) return aleatorio(1, 2);
      if (r < 0.95) return aleatorio(2, 3);
      return aleatorio(3, 5);
    };

    // Grupos
    const nuevosResultados = {};
    PARTIDOS.forEach(p => {
      nuevosResultados[p.id] = { golesLocal: String(marcador()), golesVisitante: String(marcador()) };
    });
    // KO
    const nuevosKO = {};
    ALL_KO_IDS.forEach(id => {
      const gl = marcador();
      let gv = marcador();
      if (gl === gv && Math.random() < 0.7) gv = gl + (Math.random() < 0.5 ? -1 : 1);
      if (gv < 0) gv = 0;
      nuevosKO[id] = {
        golesLocal: String(gl),
        golesVisitante: String(gv),
        clasifica: gl === gv ? (Math.random() < 0.5 ? 'a' : 'b') : '',
      };
    });
    // Premios
    const jugadores = ['Mbappé', 'Bellingham', 'Vinicius', 'Lamine Yamal', 'Haaland', 'Pedri', 'Rodrygo', 'Foden'];
    const goleadores = ['Mbappé', 'Haaland', 'Kane', 'Vinicius', 'Lewandowski', 'Lamine Yamal', 'Álvarez', 'Lukaku'];
    const porteros = ['Courtois', 'Bono', 'Maignan', 'Donnarumma', 'Ter Stegen', 'Onana', 'Lloris', 'Alisson'];

    dirtyRef.current = true;
    setResultados(nuevosResultados);
    setResultadosKO(nuevosKO);
    setPremios({
      mejorJugador: pick(jugadores),
      maximoGoleador: pick(goleadores),
      mejorPortero: pick(porteros),
    });
    setDesempates({});
    setDesempateTerceros({});
  };

  // Cargar porra de otro usuario para editarla (admin)
  const handleEditarPorra = async (porra) => {
    if (!isAdmin) return;
    if (!user) return;
    // Si ya estábamos editando otra porra, salir primero limpiamente
    if (editandoUid && editandoUid !== porra.uid) {
      await handleSalirEdicion();
    }
    // BLOQUEAR autoguardado durante la transición
    setSwitchingEdit(true);

    // Antes de cargar la porra de otro, asegurar que mi porra propia
    // está sincronizada en Firestore (en caso de que hubiera un guardado pendiente).
    if (!editandoUid) {
      try {
        await guardarPorra(user.uid, {
          nombre,
          email: user.email,
          resultados,
          resultadosKO,
          premios,
          desempates,
          desempateTerceros,
        });
      } catch (e) {
        console.error('Error guardando mi porra antes de editar otra:', e);
      }
    }

    // Ahora sí cargamos los datos del otro usuario en los estados.
    setEditandoUid(porra.uid);
    setNombre(porra.nombre || '');
    setResultados({
      ...Object.fromEntries(PARTIDOS.map(p => [p.id, { golesLocal: '', golesVisitante: '' }])),
      ...(porra.resultados || {})
    });
    setResultadosKO({
      ...Object.fromEntries(ALL_KO_IDS.map(id => [id, { golesLocal: '', golesVisitante: '', clasifica: '' }])),
      ...(porra.resultadosKO || {})
    });
    setPremios(porra.premios || { mejorJugador: '', mejorPortero: '', maximoGoleador: '' });
    setDesempates(porra.desempates || {});
    setDesempateTerceros(porra.desempateTerceros || {});
    setCompleted(!!porra.completed);
    setTab('partidos');

    // Resetear dirty: los estados actuales coinciden con los de la porra cargada
    dirtyRef.current = false;

    // Desbloquear autoguardado tras un pequeño delay
    setTimeout(() => setSwitchingEdit(false), 100);
  };

  // Salir del modo edición y volver a mi propia porra
  const handleSalirEdicion = async () => {
    if (!user) return;
    if (!editandoUid) return;

    // BLOQUEAR autoguardado durante la transición
    setSwitchingEdit(true);

    // Antes de salir, asegurar que los cambios pendientes en la porra editada
    // se han escrito en Firestore.
    try {
      await guardarPorra(editandoUid, {
        nombre,
        email: todasLasPorras.find(p => p.uid === editandoUid)?.email || '',
        resultados,
        resultadosKO,
        premios,
        desempates,
        desempateTerceros,
        lastEditedBy: 'admin',
        lastEditedAt: Date.now(),
      });
    } catch (e) {
      console.error('Error guardando porra editada antes de salir:', e);
    }

    // Ahora sí cambiamos a mi porra
    setEditandoUid(null);
    const datos = await cargarPorra(user.uid);
    if (datos) {
      setResultados({
        ...Object.fromEntries(PARTIDOS.map(p => [p.id, { golesLocal: '', golesVisitante: '' }])),
        ...(datos.resultados || {})
      });
      setResultadosKO({
        ...Object.fromEntries(ALL_KO_IDS.map(id => [id, { golesLocal: '', golesVisitante: '', clasifica: '' }])),
        ...(datos.resultadosKO || {})
      });
      setPremios(datos.premios || { mejorJugador: '', mejorPortero: '', maximoGoleador: '' });
      setDesempates(datos.desempates || {});
      setDesempateTerceros(datos.desempateTerceros || {});
      setNombre(datos.nombre || user.displayName || '');
      setCompleted(!!datos.completed);
    } else {
      // Si nunca tuve porra propia, dejarla vacía
      const init = {};
      PARTIDOS.forEach(p => { init[p.id] = { golesLocal: '', golesVisitante: '' }; });
      setResultados(init);
      const initKO = {};
      ALL_KO_IDS.forEach(id => { initKO[id] = { golesLocal: '', golesVisitante: '', clasifica: '' }; });
      setResultadosKO(initKO);
      setPremios({ mejorJugador: '', mejorPortero: '', maximoGoleador: '' });
      setDesempates({});
      setDesempateTerceros({});
      setNombre(user.displayName || '');
      setCompleted(false);
    }
    await recargarPorras();
    setTab('admin');

    // Resetear dirty: estamos volviendo a "mi porra" y los datos son los de Firestore
    dirtyRef.current = false;

    // Desbloquear autoguardado tras un pequeño delay
    setTimeout(() => setSwitchingEdit(false), 50);
  };

  // Recalcular y publicar clasificación (admin)
  const handlePublicarClasificacion = async (resultadosOverride = null) => {
    if (!isAdmin) return;
    setPublicando(true);
    try {
      await recargarPorras();
      const porras = await listarTodasLasPorras();

      // Si nos pasan un override (porque acabamos de hacer setResultadosReales y el
      // estado todavía no se ha propagado por React), lo usamos. Si no, leemos del estado.
      // Esto evita un bug donde tras "Publicar TODOS" o "Copiar mi porra" el estado de
      // React aún no reflejaba los cambios y el cálculo de puntos usaba partidosPublicados={}
      // → solo los premios sobrevivían al filtro.
      const baseReales = resultadosOverride || resultadosReales;

      // Calcular títulos finales (campeón, sub, 3.º) automáticamente desde KO real,
      // pero SOLO si los partidos correspondientes están publicados.
      const partidosPub = baseReales?.partidosPublicados;
      // Compatibilidad: si no existe el campo, modo legacy (todos publicados)
      const modoLegacy = partidosPub === undefined || partidosPub === null;
      const finalPub = modoLegacy || !!(partidosPub && partidosPub['FINAL']);
      const tpPub = modoLegacy || !!(partidosPub && partidosPub['TP']);
      const datosTit = {
        resultados: baseReales?.resultados || {},
        resultadosKO: baseReales?.resultadosKO || {},
        desempates: baseReales?.desempates || {},
        desempateTerceros: baseReales?.desempateTerceros || {},
      };
      const titulosCalculados = {
        campeon: finalPub ? (calcularCampeonDePorra(datosTit, CONSTANTES) || '') : '',
        subcampeon: finalPub ? (calcularSubDePorra(datosTit, CONSTANTES) || '') : '',
        tercer: tpPub ? (calcularTercerDePorra(datosTit, CONSTANTES) || '') : '',
      };
      // Si los títulos han cambiado, guardarlos en Firestore antes de calcular puntos
      const titActuales = baseReales?.titulos || {};
      if (
        titulosCalculados.campeon !== (titActuales.campeon || '') ||
        titulosCalculados.subcampeon !== (titActuales.subcampeon || '') ||
        titulosCalculados.tercer !== (titActuales.tercer || '')
      ) {
        const nuevosResReales = {
          ...baseReales,
          titulos: titulosCalculados,
        };
        await guardarResultadosReales(nuevosResReales);
        setResultadosReales(nuevosResReales);
        // Usar los nuevos para el cálculo
        var resRealesParaCalculo = nuevosResReales;
      } else {
        var resRealesParaCalculo = baseReales;
      }

      const filas = porras.map(p => {
        const calc = calcularPuntos(p, resRealesParaCalculo, CONSTANTES);
        const d = calc.desglose;
        return {
          uid: p.uid,
          nombre: p.nombre || '(sin nombre)',
          puntosTotales: calc.total,
          porFase: {
            grupos: d.ptsGrupos,
            gruposPos: d.ptsGruposPos,
            // Desglose por ronda: clasif (equipos clasificados) + pts (marcadores)
            diecisei: { clasif: d.ptsClasif1_16, pts: d.pts1_16 },
            octavos: { clasif: d.ptsClasifOct, pts: d.ptsOct },
            cuartos: { clasif: d.ptsClasifQF, pts: d.ptsQF },
            semis: { clasif: d.ptsClasifSF, pts: d.ptsSF },
            tercerPuesto: { clasif: d.ptsClasif34, pts: d.pts34 },
            final: { clasif: d.ptsClasifFinal, pts: d.ptsFinal },
            // Cuadro final (títulos): campeón + subcampeón + 3º
            titulos: d.ptsCampeon + d.ptsSub + d.pts3,
            // Premios individuales
            premios: d.ptsBalon + d.ptsBota + d.ptsGuante,
          },
        };
      });
      filas.sort((a, b) => b.puntosTotales - a.puntosTotales);
      await publicarClasificacion(filas);

      // Publicar también porras SANITIZADAS (sin email) en /porrasPublicas
      // para que la vista pública (sin login) pueda ver las predicciones.
      // En paralelo con Promise.all para que sea rápido incluso con 50+ porras.
      await Promise.all(porras.map(p => {
        const sanitizada = {
          nombre: p.nombre || '(sin nombre)',
          resultados: p.resultados || {},
          resultadosKO: p.resultadosKO || {},
          premios: p.premios || {},
          desempates: p.desempates || {},
          desempateTerceros: p.desempateTerceros || {},
          completed: !!p.completed,
        };
        return publicarPorraPublica(p.uid, sanitizada).catch(e => {
          console.error('Error publicando porra pública', p.uid, e);
        });
      }));
    } catch (e) {
      alert('Error publicando: ' + e.message);
      console.error(e);
    }
    setPublicando(false);
  };

  // Borrar porra (admin): doble confirmación + recalcular automático
  const handleBorrarPorra = async (porra) => {
    if (!isAdmin) return;
    const nombre = porra.nombre || '(sin nombre)';
    // Aviso especial si admin intenta borrarse a sí mismo
    if (porra.uid === user?.uid) {
      if (!window.confirm(`⚠️ ESTÁS A PUNTO DE BORRAR TU PROPIA PORRA\n\nSigues siendo admin tras borrarla, pero perderás todas tus predicciones.\n\n¿Continuar?`)) return;
    }
    if (!window.confirm(`¿Borrar porra de ${nombre}?\n\nEmail: ${porra.email || '—'}\n\nEsto eliminará TODAS sus predicciones. No se puede deshacer.`)) return;
    const respuesta = window.prompt(`Para confirmar, escribe exactamente: BORRAR`);
    if (respuesta !== 'BORRAR') {
      alert('Cancelado: el texto no coincide.');
      return;
    }
    try {
      // Borrar ambas copias en paralelo
      await Promise.all([
        borrarPorra(porra.uid),
        borrarPorraPublica(porra.uid),
      ]);
      await recargarPorras();
      // Recalcular automáticamente para que desaparezca de la clasificación cacheada
      await handlePublicarClasificacion();
      // Si fui yo mismo, vaciar mi estado local
      if (porra.uid === user?.uid) {
        const init = {};
        PARTIDOS.forEach(p => { init[p.id] = { golesLocal: '', golesVisitante: '' }; });
        setResultados(init);
        const initKO = {};
        ALL_KO_IDS.forEach(id => { initKO[id] = { golesLocal: '', golesVisitante: '', clasifica: '' }; });
        setResultadosKO(initKO);
        setPremios({ mejorJugador: '', mejorPortero: '', maximoGoleador: '' });
        setDesempates({});
        setDesempateTerceros({});
        setNombre(user.displayName || '');
        setCompleted(false);
      }
      alert(`Porra de ${nombre} borrada y clasificación actualizada.`);
    } catch (e) {
      alert('Error al borrar: ' + e.message);
    }
  };

  // Confirmar envío (participante)
  // ============================================================
  // SIMULACIÓN: generación y limpieza de datos dummy
  // ============================================================
  const handleGenerarDummies = async () => {
    if (!isAdmin) return;
    if (!window.confirm(
      '¿Generar 20 porras dummy + Mundial entero simulado?\n\n' +
      'Esto:\n' +
      '• Creará 20 porras con emails @demo.test\n' +
      '• Llenará todos los resultados reales del Mundial\n' +
      '• Recalculará la clasificación\n\n' +
      'Podrás limpiarlo después con el botón "Limpiar dummies".'
    )) return;

    setSimulando(true);
    try {
      // === 1) Generar 20 porras con datos variados ===
      const nombres = [
        'Juan García', 'María López', 'Pedro Ramírez', 'Ana Martínez', 'Luis Rodríguez',
        'Carmen Pérez', 'Diego Fernández', 'Laura Gómez', 'Carlos Ruiz', 'Elena Díaz',
        'Javier Moreno', 'Sara Jiménez', 'Manuel Álvarez', 'Lucía Romero', 'Antonio Castro',
        'Patricia Vega', 'Roberto Herrera', 'Cristina Ortiz', 'Fernando Reyes', 'Isabel Núñez'
      ];

      const jugadoresBalonOro = ['Mbappé', 'Bellingham', 'Vinicius', 'Lamine Yamal', 'Haaland', 'Pedri', 'Rodrygo', 'Foden'];
      const goleadores = ['Mbappé', 'Haaland', 'Kane', 'Vinicius', 'Lewandowski', 'Lamine Yamal', 'Álvarez', 'Lukaku'];
      const porteros = ['Courtois', 'Bono', 'Maignan', 'Donnarumma', 'Ter Stegen', 'Onana', 'Lloris', 'Alisson'];

      const equiposGanadores = ['España', 'Brasil', 'Francia', 'Argentina', 'Alemania', 'Inglaterra', 'Portugal', 'Países Bajos'];

      const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

      // Generar marcador aleatorio realista (sesgado a goles bajos)
      const marcador = () => {
        const r = Math.random();
        if (r < 0.3) return aleatorio(0, 1);
        if (r < 0.7) return aleatorio(1, 2);
        if (r < 0.95) return aleatorio(2, 3);
        return aleatorio(3, 5);
      };

      const fakeUid = (idx) => `demo_${String(idx).padStart(3, '0')}_${Math.random().toString(36).substring(2, 8)}`;

      console.log('Generando 20 porras...');
      // Construir los 20 objetos primero, luego escribir en paralelo
      const porrasParaGuardar = [];
      for (let i = 0; i < 20; i++) {
        const uid = fakeUid(i);
        const resultados = {};
        PARTIDOS.forEach(p => {
          resultados[p.id] = { golesLocal: String(marcador()), golesVisitante: String(marcador()) };
        });
        const resultadosKO = {};
        ALL_KO_IDS.forEach(id => {
          const gl = marcador();
          let gv = marcador();
          if (gl === gv && Math.random() < 0.7) gv = gl + (Math.random() < 0.5 ? -1 : 1);
          if (gv < 0) gv = 0;
          resultadosKO[id] = {
            golesLocal: String(gl),
            golesVisitante: String(gv),
            clasifica: gl === gv ? (Math.random() < 0.5 ? 'a' : 'b') : ''
          };
        });
        const premios = {
          mejorJugador: pick(jugadoresBalonOro),
          maximoGoleador: pick(goleadores),
          mejorPortero: pick(porteros),
        };
        let porraData = {
          nombre: nombres[i],
          email: `${nombres[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ /g, '.')}@demo.test`,
          resultados,
          resultadosKO,
          premios,
          desempates: {},
          desempateTerceros: {},
          updatedAt: Date.now() - aleatorio(0, 7 * 24 * 60 * 60 * 1000),
        };
        if (i < 14) {
          porraData.completed = true;
          porraData.completedAt = porraData.updatedAt;
        } else if (i < 18) {
          porraData.completed = false;
        } else {
          const ids = Object.keys(porraData.resultados);
          for (let k = 0; k < 5 + aleatorio(0, 10); k++) {
            const idRandom = ids[Math.floor(Math.random() * ids.length)];
            porraData.resultados[idRandom] = { golesLocal: '', golesVisitante: '' };
          }
          if (i === 19) {
            porraData.premios = { mejorJugador: '', maximoGoleador: '', mejorPortero: '' };
          }
          porraData.completed = false;
        }
        porrasParaGuardar.push({ uid, data: porraData });
      }
      // Guardar todas en paralelo
      await Promise.all(porrasParaGuardar.map(({ uid, data }) =>
        guardarPorra(uid, data).catch(e => console.error('Error guardando dummy', uid, e))
      ));
      console.log('20 porras creadas.');

      // === 2) Generar resultados reales del Mundial entero ===
      console.log('Generando resultados reales...');
      const realResultados = {};
      PARTIDOS.forEach(p => {
        realResultados[p.id] = { golesLocal: String(marcador()), golesVisitante: String(marcador()) };
      });
      const realKO = {};
      ALL_KO_IDS.forEach(id => {
        const gl = marcador();
        let gv = marcador();
        if (gl === gv && Math.random() < 0.7) gv = gl + (Math.random() < 0.5 ? -1 : 1);
        if (gv < 0) gv = 0;
        realKO[id] = {
          golesLocal: String(gl),
          golesVisitante: String(gv),
          clasifica: gl === gv ? (Math.random() < 0.5 ? 'a' : 'b') : ''
        };
      });
      const realTitulos = {
        campeon: pick(equiposGanadores),
        subcampeon: pick(equiposGanadores),
        tercer: pick(equiposGanadores),
      };
      const realPremios = {
        mejorJugador: pick(jugadoresBalonOro),
        maximoGoleador: pick(goleadores),
        mejorPortero: pick(porteros),
      };

      // Construir partidosPublicados con TODOS los partidos (la simulación se considera
      // un Mundial completo y ya publicado, para que la clasificación refleje todos los puntos).
      // Sin esto, si en una sesión anterior se hizo "Despublicar TODOS", el documento
      // mantendría partidosPublicados={} y nada contaría salvo los premios.
      const nowTs = Date.now();
      const realPub = {};
      PARTIDOS.forEach(p => { realPub[p.id] = nowTs; });
      ALL_KO_IDS.forEach(id => {
        const r = realKO[id];
        if (!r) return;
        const empate = parseInt(r.golesLocal) === parseInt(r.golesVisitante);
        if (empate && !r.clasifica) return; // empates KO sin clasificado: no publicables
        realPub[id] = nowTs;
      });

      await guardarResultadosReales({
        resultados: realResultados,
        resultadosKO: realKO,
        titulos: realTitulos,
        premios: realPremios,
        desempates: {},
        desempateTerceros: {},
        partidosPublicados: realPub,
      });
      console.log('Resultados reales guardados.');

      // === 3) Recalcular y publicar clasificación ===
      console.log('Recalculando clasificación...');
      await recargarPorras();
      const porrasActualizadas = await listarTodasLasPorras();
      const filas = porrasActualizadas.map(p => {
        const calc = calcularPuntos(p, {
          resultados: realResultados,
          resultadosKO: realKO,
          titulos: realTitulos,
          premios: realPremios,
          partidosPublicados: realPub,
        }, CONSTANTES);
        const d = calc.desglose;
        return {
          uid: p.uid,
          nombre: p.nombre || '(sin nombre)',
          puntosTotales: calc.total,
          porFase: {
            grupos: d.ptsGrupos,
            gruposPos: d.ptsGruposPos,
            diecisei: { clasif: d.ptsClasif1_16, pts: d.pts1_16 },
            octavos: { clasif: d.ptsClasifOct, pts: d.ptsOct },
            cuartos: { clasif: d.ptsClasifQF, pts: d.ptsQF },
            semis: { clasif: d.ptsClasifSF, pts: d.ptsSF },
            tercerPuesto: { clasif: d.ptsClasif34, pts: d.pts34 },
            final: { clasif: d.ptsClasifFinal, pts: d.ptsFinal },
            titulos: d.ptsCampeon + d.ptsSub + d.pts3,
            premios: d.ptsBalon + d.ptsBota + d.ptsGuante,
          },
        };
      });
      filas.sort((a, b) => b.puntosTotales - a.puntosTotales);
      await publicarClasificacion(filas);

      // Publicar porras sanitizadas (sin email) en /porrasPublicas
      await Promise.all(porrasActualizadas.map(p => {
        const sanitizada = {
          nombre: p.nombre || '(sin nombre)',
          resultados: p.resultados || {},
          resultadosKO: p.resultadosKO || {},
          premios: p.premios || {},
          desempates: p.desempates || {},
          desempateTerceros: p.desempateTerceros || {},
          completed: !!p.completed,
        };
        return publicarPorraPublica(p.uid, sanitizada).catch(e => {
          console.error('Error publicando porra pública dummy', p.uid, e);
        });
      }));

      alert(
        `✅ Simulación completa\n\n` +
        `• 20 porras dummy creadas (14 enviadas, 4 sin confirmar, 2 incompletas)\n` +
        `• Mundial entero simulado\n` +
        `• 🏆 Campeón: ${realTitulos.campeon}\n` +
        `• Clasificación publicada\n\n` +
        `Refresca el navegador si no ves los cambios.`
      );
    } catch (e) {
      console.error(e);
      alert('Error durante la simulación: ' + e.message);
    }
    setSimulando(false);
  };

  // Copiar la porra del admin (la suya propia) a los resultados reales.
  // Útil para simular un Mundial entero rápidamente.
  // Requiere que la porra del admin esté completa.
  const handleCopiarPorraAdminAReales = async () => {
    if (!isAdmin) return;
    // Buscar la porra del admin
    const miPorra = todasLasPorras.find(p => p.uid === user?.uid);
    if (!miPorra) {
      alert('No se encuentra tu porra. Crea tu porra primero.');
      return;
    }
    // Verificar que esté completa
    if (!porraCompleta(miPorra, CONSTANTES)) {
      alert(
        '❌ Tu porra no está completa.\n\n' +
        'Para poder copiarla como resultados reales, tienes que tener rellenos:\n' +
        '• Todos los partidos de grupos\n' +
        '• Todos los partidos KO con clasificado en empates\n' +
        '• Los 3 premios individuales\n' +
        '• El nombre del participante'
      );
      return;
    }
    if (!window.confirm(
      `¿Copiar TU porra como resultados reales?\n\n` +
      `Esto sobrescribirá los resultados reales actuales con tus predicciones:\n` +
      `• 72 partidos de grupos\n` +
      `• 32 partidos KO (16 R32 + 8 octavos + 4 cuartos + 2 semis + 3.º + Final)\n` +
      `• 3 premios individuales\n` +
      `• Títulos finales (campeón, sub, 3.º)\n\n` +
      `Se recalculará la clasificación automáticamente.`
    )) return;
    setPublicando(true);
    try {
      const nuevosReales = {
        resultados: { ...(miPorra.resultados || {}) },
        resultadosKO: { ...(miPorra.resultadosKO || {}) },
        desempates: { ...(miPorra.desempates || {}) },
        desempateTerceros: { ...(miPorra.desempateTerceros || {}) },
        premios: { ...(miPorra.premios || {}) },
        titulos: {}, // se calcularán en handlePublicarClasificacion
        partidosPublicados: {}, // copiar marcadores ≠ publicarlos; ninguno publicado al inicio
      };
      await guardarResultadosReales(nuevosReales);
      setResultadosReales(nuevosReales);
      // Recalcular y publicar (esto también auto-calcula títulos)
      await handlePublicarClasificacion(nuevosReales);
      alert('✅ Tu porra se ha copiado como resultados reales.\n\nLos marcadores se han copiado pero NINGÚN partido está publicado todavía. Pulsa 📢 Publicar en cada partido que quieras confirmar.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setPublicando(false);
  };

  // Despublicar TODO: borrar resultados reales, vaciar clasificación, desmarcar días cerrados.
  // No toca las porras de los participantes.
  // Publicar todos los partidos con marcador completo (en KO, empates necesitan clasifica)
  const handlePublicarTodos = async () => {
    if (!isAdmin) return;
    const rRes = resultadosReales?.resultados || {};
    const rKO = resultadosReales?.resultadosKO || {};
    const ids = [];
    PARTIDOS.forEach(p => {
      const r = rRes[p.id];
      if (r && r.golesLocal !== '' && r.golesVisitante !== '') ids.push(p.id);
    });
    ALL_KO_IDS.forEach(id => {
      const r = rKO[id];
      if (!r) return;
      if (r.golesLocal === '' || r.golesVisitante === '') return;
      const empate = parseInt(r.golesLocal) === parseInt(r.golesVisitante);
      if (empate && !r.clasifica) return; // empate KO sin clasificado: no publicable
      ids.push(id);
    });
    if (ids.length === 0) {
      alert('No hay ningún partido con marcador completo para publicar.');
      return;
    }
    if (!window.confirm(
      `📢 ¿Publicar TODOS los partidos con marcador?\n\n` +
      `Se van a marcar como publicados ${ids.length} partidos. ` +
      `Esto hará que todos sus puntos se cuenten en la clasificación.`
    )) return;
    setPublicando(true);
    try {
      const now = Date.now();
      const nuevoPub = { ...(resultadosReales?.partidosPublicados || {}) };
      ids.forEach(id => { nuevoPub[id] = now; });
      const next = { ...resultadosReales, partidosPublicados: nuevoPub };
      await guardarResultadosReales(next);
      setResultadosReales(next);
      await handlePublicarClasificacion(next);
      alert(`✅ ${ids.length} partidos publicados.`);
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setPublicando(false);
  };

  // Despublicar TODOS los partidos (vacía partidosPublicados pero mantiene los marcadores)
  const handleDespublicarTodos = async () => {
    if (!isAdmin) return;
    const actuales = Object.keys(resultadosReales?.partidosPublicados || {});
    if (actuales.length === 0) {
      alert('No hay partidos publicados ahora mismo.');
      return;
    }
    if (!window.confirm(
      `↩ ¿Despublicar TODOS los partidos?\n\n` +
      `Se van a despublicar ${actuales.length} partidos. ` +
      `Los marcadores se conservan, pero dejan de contar en la clasificación hasta que vuelvas a publicarlos.`
    )) return;
    setPublicando(true);
    try {
      const next = { ...resultadosReales, partidosPublicados: {} };
      await guardarResultadosReales(next);
      setResultadosReales(next);
      await handlePublicarClasificacion(next);
      alert('Todos los partidos despublicados. Los marcadores se han mantenido.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setPublicando(false);
  };

  // BORRAR TODO: marcadores, premios, títulos, publicaciones. Acción destructiva.
  const handleBorrarTodo = async () => {
    if (!isAdmin) return;
    if (!window.confirm(
      '⚠️ ¿BORRAR TODOS los resultados reales?\n\n' +
      'Esto:\n' +
      '• Borra todos los marcadores reales (grupos + KO)\n' +
      '• Borra títulos y premios reales\n' +
      '• Quita todas las publicaciones de partido\n' +
      '• Vacía la clasificación pública\n' +
      '• Desmarca todos los días cerrados\n\n' +
      'Las porras de los participantes NO se tocan.\n\n' +
      'Esto NO se puede deshacer fácilmente. ¿Continuar?'
    )) return;
    setPublicando(true);
    try {
      // Borrar resultados reales
      const vacio = {
        resultados: {},
        resultadosKO: {},
        titulos: {},
        premios: {},
        desempates: {},
        desempateTerceros: {},
        partidosPublicados: {},
      };
      await guardarResultadosReales(vacio);
      setResultadosReales(vacio);
      // Vaciar clasificación
      await publicarClasificacion([]);
      // Desmarcar todos los días cerrados
      const dc = await cargarDiasCerrados();
      for (const dia of Object.keys(dc || {})) {
        await desmarcarDiaCerrado(dia);
      }
      setDiasCerrados({});
      alert('Todo borrado. La clasificación está vacía y no hay resultados.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setPublicando(false);
  };

  // Importar porras desde un Excel (lee la hoja _BACKUP).
  // Merge inteligente: las porras con UID coincidente se sobrescriben,
  // las nuevas se crean, el resto se conserva. Solo importa porras
  // (NO resultados reales, NO partidos publicados, NO desempates globales).
  const handleImportExcel = async () => {
    if (!isAdmin) return;

    // Abrir selector de archivo (input invisible disparado por click)
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      let backupRows;
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        // Buscar hoja _BACKUP (case-insensitive por si acaso)
        const sheetName = wb.SheetNames.find(n => n.toLowerCase() === '_backup');
        if (!sheetName) {
          alert('❌ El Excel no contiene una hoja "_BACKUP".\n\nAsegúrate de usar un Excel generado por esta misma app desde Admin → Descargar Excel.');
          return;
        }
        backupRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
      } catch (err) {
        alert('❌ Error leyendo el archivo: ' + err.message);
        return;
      }

      // Filtrar solo entradas tipo "porra"
      const candidatas = backupRows.filter(r => (r.Tipo || '').toLowerCase() === 'porra');
      if (candidatas.length === 0) {
        alert('❌ La hoja _BACKUP no contiene ninguna porra válida.');
        return;
      }

      // Parsear y validar cada porra del Excel
      const parsed = [];
      const errores = [];
      candidatas.forEach((row, idx) => {
        const uid = (row.UID || '').toString().trim();
        const datosStr = row['Datos (JSON)'] || row['Datos'] || '';
        if (!uid) { errores.push(`Fila ${idx + 2}: sin UID`); return; }
        if (!datosStr) { errores.push(`Fila ${idx + 2}: sin datos JSON (UID ${uid})`); return; }
        try {
          const datos = JSON.parse(datosStr);
          parsed.push({
            uid,
            email: (row.Email || datos.email || '').toString().trim(),
            nombre: (row.Nombre || datos.nombre || '').toString().trim(),
            resultados: datos.resultados || {},
            resultadosKO: datos.resultadosKO || {},
            premios: datos.premios || {},
            desempates: datos.desempates || {},
            desempateTerceros: datos.desempateTerceros || {},
          });
        } catch (err) {
          errores.push(`Fila ${idx + 2}: JSON inválido (UID ${uid}) - ${err.message}`);
        }
      });

      if (parsed.length === 0) {
        alert(
          '❌ No se pudo parsear ninguna porra.\n\n' +
          'Errores encontrados:\n' + errores.slice(0, 5).join('\n')
        );
        return;
      }

      // Cargar las porras actuales para saber cuántas se sobrescriben vs crean
      let porrasActuales;
      try {
        porrasActuales = await listarTodasLasPorras();
      } catch (err) {
        alert('❌ Error cargando porras actuales: ' + err.message);
        return;
      }
      const uidsActuales = new Set(porrasActuales.map(p => p.uid));
      const sobrescriben = parsed.filter(p => uidsActuales.has(p.uid));
      const nuevas = parsed.filter(p => !uidsActuales.has(p.uid));

      // Mostrar preview y pedir confirmación
      const erroresMsg = errores.length > 0
        ? `\n\n⚠️ ${errores.length} fila(s) con error se saltarán:\n${errores.slice(0, 3).join('\n')}${errores.length > 3 ? '\n…' : ''}`
        : '';
      if (!window.confirm(
        `📥 ¿Importar ${parsed.length} porra(s)?\n\n` +
        `• ${nuevas.length} se crearán (UID nuevo)\n` +
        `• ${sobrescriben.length} sobrescribirán porras existentes con el mismo UID\n` +
        `• ${porrasActuales.length - sobrescriben.length} porras existentes NO se tocarán` +
        erroresMsg + `\n\nEsto NO toca resultados reales, premios, ni publicaciones. ¿Continuar?`
      )) return;

      // Importar a Firestore en paralelo
      setSimulando(true);
      let ok = 0, fail = 0;
      const fallos = [];
      await Promise.all(parsed.map(async p => {
        try {
          await guardarPorra(p.uid, {
            nombre: p.nombre,
            email: p.email,
            resultados: p.resultados,
            resultadosKO: p.resultadosKO,
            premios: p.premios,
            desempates: p.desempates,
            desempateTerceros: p.desempateTerceros,
          });
          ok++;
        } catch (err) {
          fail++;
          fallos.push(`${p.uid} (${p.nombre || p.email || '?'}): ${err.message}`);
        }
      }));

      // Recargar porras y mostrar informe
      await recargarPorras();
      setSimulando(false);

      alert(
        `✅ Importación terminada.\n\n` +
        `• ${ok} porra(s) importadas correctamente\n` +
        (fail > 0 ? `• ${fail} fallaron:\n${fallos.slice(0, 5).join('\n')}\n` : '') +
        (errores.length > 0 ? `• ${errores.length} fila(s) saltada(s) por formato inválido` : '')
      );
    };
    input.click();
  };

  const handleLimpiarDummies = async () => {
    if (!isAdmin) return;
    if (!window.confirm(
      '¿Borrar TODAS las porras dummy (emails @demo.test)?\n\n' +
      'También se borrarán los resultados reales simulados y la clasificación.\n' +
      'Tu porra real NO se tocará.'
    )) return;

    setSimulando(true);
    try {
      const porras = await listarTodasLasPorras();
      const dummies = porras.filter(p => p.email && p.email.endsWith('@demo.test'));
      console.log(`Borrando ${dummies.length} porras dummy...`);
      // En paralelo: borrar todas las porras y sus copias públicas simultáneamente
      await Promise.all(dummies.map(p =>
        Promise.all([
          borrarPorra(p.uid).catch(e => console.error('Error borrando porra', p.uid, e)),
          borrarPorraPublica(p.uid).catch(e => console.error('Error borrando porra pública', p.uid, e)),
        ])
      ));
      // Limpiar resultados reales
      await guardarResultadosReales({
        resultados: {},
        resultadosKO: {},
        titulos: {},
        premios: {},
      });
      // Limpiar clasificación
      await publicarClasificacion([]);
      await recargarPorras();
      alert(`✅ Limpieza completa. ${dummies.length} porras dummy borradas.`);
    } catch (e) {
      console.error(e);
      alert('Error durante la limpieza: ' + e.message);
    }
    setSimulando(false);
  };

  const handleConfirmarEnvio = async () => {
    if (!user) return;
    try {
      await confirmarEnvio(user.uid);
      setCompleted(true);
      setShowConfirmModal(false);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };


  const clasificaciones = useMemo(() => {
    const c = {};
    Object.keys(GRUPOS).forEach(letra => {
      c[letra] = calcularClasificacionGrupo(letra, resultados, desempates);
    });
    return c;
  }, [resultados, desempates]);

  const tercerosCalc = useMemo(
    () => calcularMejoresTerceros(clasificaciones, desempateTerceros),
    [clasificaciones, desempateTerceros]
  );

  // ----- CONTADORES Y SEMÁFOROS POR PESTAÑA -----
  const totalGrupos = PARTIDOS.length;
  const completosGrupos = Object.values(resultados).filter(r => r.golesLocal !== '' && r.golesVisitante !== '').length;
  const pendientesGrupos = totalGrupos - completosGrupos;
  const empatesPendientesGrupos = Object.values(clasificaciones).reduce((acc, info) =>
    acc + (info.empates || []).filter(e => !e.resolved).length, 0);
  const statusGrupos = pendientesGrupos === 0 && empatesPendientesGrupos === 0
    ? 'ok' : (pendientesGrupos === totalGrupos ? 'empty' : 'warn');
  const pendientesTotalGrupos = pendientesGrupos + empatesPendientesGrupos;

  const empatesPendientesTerceros = (tercerosCalc.empates || []).filter(e => !e.resolved && e.criticoFrontera).length;
  const statusTerceros = pendientesGrupos > 0 ? 'empty'
    : (empatesPendientesTerceros === 0 ? 'ok' : 'warn');

  // KO: calcular cuántos partidos KO falta rellenar y empates KO sin clasificado decidido
  const empatesPendientesKO = ALL_KO_IDS.filter(id => {
    const r = resultadosKO[id];
    if (!r) return false;
    if (r.golesLocal === '' || r.golesVisitante === '') return false;
    return parseInt(r.golesLocal) === parseInt(r.golesVisitante) && !r.clasifica;
  }).length;
  // Cuántos partidos KO han llegado a tener equipos asignados y aún no tienen marcador
  // (esto se evalúa recorriendo eliminatorias)
  const cruzesPendientesKO = (() => {
    if (pendientesGrupos > 0 || empatesPendientesGrupos > 0) return null; // no se puede saber aún
    const terceros = tercerosCalc.tabla;
    const top8c = terceros.slice(0, 8).map(t => ({ equipo: t.equipo, grupo: t.grupo }));
    const anexoCMap = (top8c.length === 8) ? asignarTercerosAnexoC(top8c) : {};
    const cruces = {};
    R32_PAIRS.forEach(p => {
      cruces[p.id] = {
        a: resolverEquipo({ ...p.a, _r32id: p.id }, clasificaciones, terceros, anexoCMap),
        b: resolverEquipo({ ...p.b, _r32id: p.id }, clasificaciones, terceros, anexoCMap),
      };
    });
    const sigRonda = (pairs) => pairs.forEach(p => {
      cruces[p.id] = {
        a: getGanador(p.from[0], resultadosKO, cruces),
        b: getGanador(p.from[1], resultadosKO, cruces),
      };
    });
    sigRonda(R16_PAIRS);
    sigRonda(QF_PAIRS);
    sigRonda(SF_PAIRS);
    cruces[FINAL_PAIR.id] = {
      a: getGanador(SF_PAIRS[0].id, resultadosKO, cruces),
      b: getGanador(SF_PAIRS[1].id, resultadosKO, cruces),
    };
    const getPerd = (mid) => {
      const c = cruces[mid];
      const g = getGanador(mid, resultadosKO, cruces);
      if (!g || !c.a || !c.b) return null;
      return g === c.a ? c.b : c.a;
    };
    cruces[THIRD_PLACE.id] = { a: getPerd(SF_PAIRS[0].id), b: getPerd(SF_PAIRS[1].id) };

    let pend = 0;
    ALL_KO_IDS.forEach(id => {
      const c = cruces[id];
      const r = resultadosKO[id];
      if (c && c.a && c.b && (r.golesLocal === '' || r.golesVisitante === '')) pend++;
    });
    return pend;
  })();
  const statusKO = (() => {
    if (pendientesGrupos > 0 || empatesPendientesGrupos > 0 || empatesPendientesTerceros > 0) return 'empty';
    if (cruzesPendientesKO === null) return 'empty';
    if (cruzesPendientesKO === 0 && empatesPendientesKO === 0) return 'ok';
    return 'warn';
  })();
  const pendientesTotalKO = (cruzesPendientesKO || 0) + empatesPendientesKO;

  const camposPremios = ['mejorJugador', 'mejorPortero', 'maximoGoleador'];
  const pendientesPremios = camposPremios.filter(k => !premios[k] || premios[k].trim() === '').length;
  const statusPremios = pendientesPremios === 0 ? 'ok' : (pendientesPremios === 3 ? 'empty' : 'warn');

  // Pestaña Info: nombre + estado de confirmación.
  // Si la porra está completa pero sin confirmar, mostramos un badge gris.
  const nombrePendiente = !nombre || !nombre.trim();
  const porraEstaCompleta = porraCompleta({ nombre, resultados, resultadosKO, premios }, CONSTANTES);
  const pendienteConfirmar = porraEstaCompleta && !completed && !editandoUid;
  let statusInstrucciones, pendientesInstrucciones;
  if (nombrePendiente) {
    statusInstrucciones = 'empty';
    pendientesInstrucciones = 1;
  } else if (pendienteConfirmar) {
    statusInstrucciones = 'warn'; // aviso amarillo: hay algo pendiente
    pendientesInstrucciones = 1;
  } else {
    statusInstrucciones = 'ok';
    pendientesInstrucciones = 0;
  }

  const tabStatus = {
    instrucciones: { status: statusInstrucciones, pending: pendientesInstrucciones },
    partidos: { status: statusGrupos, pending: pendientesTotalGrupos },
    terceros: { status: statusTerceros, pending: empatesPendientesTerceros },
    eliminatorias: { status: statusKO, pending: pendientesTotalKO },
    premios: { status: statusPremios, pending: pendientesPremios },
  };

  // Contador de KO completados (con marcador, y para empates con clasifica marcado)
  const completosKO = ALL_KO_IDS.reduce((acc, id) => {
    const r = resultadosKO[id];
    if (!r) return acc;
    const tieneMarc = r.golesLocal !== '' && r.golesVisitante !== '';
    if (!tieneMarc) return acc;
    const empate = parseInt(r.golesLocal) === parseInt(r.golesVisitante);
    if (empate && !r.clasifica) return acc;
    return acc + 1;
  }, 0);

  const completos = completosGrupos;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

        :root {
          --bg: #0a0e1a;
          --bg-grad: radial-gradient(ellipse at top, #1a2444 0%, #0a0e1a 50%, #050810 100%);
          --surface: #131826;
          --surface-2: #1a2238;
          --surface-3: #232c45;
          --border: #2a3553;
          --text: #f1f5ff;
          --text-dim: #8b9ac4;
          --text-faint: #5a6890;
          --accent: #00d9a3;
          --accent-2: #ff3d6b;
          --gold: #ffb838;
          --qual: #00d9a3;
          --third: #ffb838;
          --out: #ff3d6b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          /* Bloquea el pull-to-refresh accidental en Chrome Android / iOS Safari */
          overscroll-behavior-y: contain;
        }
        body, .app-root {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: var(--bg); color: var(--text);
          min-height: 100vh; line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          /* Mejora respuesta táctil eliminando delay de 300ms en algunos móviles */
          -webkit-tap-highlight-color: transparent;
        }
        /* En móvil, los selects también deben ser >= 16px para evitar zoom iOS */
        @media (max-width: 768px) {
          select, input[type="text"], input[type="number"], input[type="email"], textarea {
            font-size: 16px !important;
          }
        }
        /* Todos los botones e inputs: evitar doble-tap zoom y mantener tamaño táctil */
        button, .tab, .sub-tab, input, select {
          touch-action: manipulation;
        }
        .app-root {
          background: var(--bg-grad);
          background-attachment: fixed;
          min-height: 100vh;
          padding-bottom: 60px;
        }
        .app-root::before {
          content: ''; position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(0, 217, 163, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 163, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none; z-index: 0;
        }
        .app-shell {
          max-width: 880px; margin: 0 auto; padding: 0 16px;
          position: relative; z-index: 1;
        }

        .landing {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          /* dvh = dynamic viewport height, se ajusta cuando la barra de URL aparece/desaparece en iOS */
          height: 100dvh;
          overflow: hidden;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }
        .landing-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 25%;
          z-index: 1;
        }
        .landing-gradient {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            linear-gradient(180deg,
              rgba(10,14,26,0.4) 0%,
              rgba(10,14,26,0.15) 35%,
              rgba(10,14,26,0.6) 70%,
              rgba(10,14,26,0.97) 100%
            );
        }
        .landing-content {
          position: relative;
          z-index: 3;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 32px 24px calc(24px + env(safe-area-inset-bottom));
          max-width: 880px;
          width: 100%;
          margin: 0 auto;
        }
        .landing-top {
          text-align: center;
        }
        .landing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          background: rgba(255, 184, 56, 0.15);
          border: 1px solid rgba(255, 184, 56, 0.45);
          border-radius: 999px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 3px;
          color: var(--gold);
          margin-bottom: 28px;
          backdrop-filter: blur(8px);
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
        }
        .landing-eyebrow svg { color: var(--gold); }
        .landing-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 64px;
          letter-spacing: 5px;
          line-height: 0.95;
          background: linear-gradient(135deg, #fff6dc 0%, #ffe899 30%, #ffb838 65%, #d99410 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 18px;
          font-weight: 400;
          filter: drop-shadow(0 6px 30px rgba(255, 184, 56, 0.5));
        }
        .landing-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--text);
          letter-spacing: 3px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.9);
          margin-bottom: 8px;
        }
        .landing-dates {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: var(--text-dim);
          letter-spacing: 0.6px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.9);
        }
        .landing-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        /* Móvil: ajustar para que los botones queden bien visibles */
        @media (max-width: 600px) {
          .landing-content {
            padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
            justify-content: space-around;
          }
          .landing-eyebrow {
            margin-bottom: 16px;
            font-size: 9px;
            padding: 5px 10px;
          }
          .landing-title {
            font-size: 48px;
            letter-spacing: 4px;
            margin-bottom: 12px;
          }
          .landing-sub {
            font-size: 11px;
            letter-spacing: 2px;
          }
          .landing-dates {
            font-size: 12px;
          }
        }

        /* Pantallas bajas (móvil en horizontal o iPhones pequeños) */
        @media (max-height: 700px) {
          .landing-content {
            padding-top: 16px;
          }
          .landing-eyebrow {
            margin-bottom: 10px;
          }
          .landing-title {
            font-size: 40px;
            margin-bottom: 8px;
          }
        }
        .landing-cta {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 16px 32px;
          background: linear-gradient(135deg, var(--gold) 0%, #e89500 100%);
          color: #2a1b00;
          border: none;
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.4px;
          cursor: pointer;
          box-shadow:
            0 8px 28px rgba(255, 184, 56, 0.4),
            0 0 0 1px rgba(255, 232, 153, 0.5) inset;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          position: relative;
          overflow: hidden;
        }
        .landing-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg,
            transparent 40%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 60%
          );
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        .landing-cta:hover {
          transform: translateY(-2px);
          box-shadow:
            0 12px 38px rgba(255, 184, 56, 0.55),
            0 0 0 1px rgba(255, 232, 153, 0.6) inset;
        }
        .landing-cta:hover::before { transform: translateX(100%); }
        .landing-cta:active { transform: translateY(0); }
        .landing-cta-arrow {
          font-size: 20px;
          font-weight: 700;
          line-height: 1;
        }
        .landing-hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }
        @media (max-width: 480px) {
          .landing-content { padding: 28px 20px; }
          .landing-title { font-size: 46px; letter-spacing: 3px; }
          .landing-eyebrow { font-size: 9px; padding: 6px 12px; margin-bottom: 22px; }
          .landing-sub { font-size: 11px; letter-spacing: 2px; }
          .landing-dates { font-size: 12px; }
          .landing-cta { padding: 14px 26px; font-size: 14px; }
        }
        @media (min-width: 760px) {
          .landing-title { font-size: 88px; letter-spacing: 7px; }
        }

        .sticky-wrap {
          position: sticky;
          top: 0;
          z-index: 20;
          background: linear-gradient(to bottom, #0a0e1a 92%, rgba(10, 14, 26, 0.85) 100%);
          backdrop-filter: blur(10px);
          margin: 0 -16px;
          padding: 0 16px;
        }
        .header { padding: 18px 0 12px; }
        .header-top {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px;
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-mark {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, var(--accent) 0%, #00b585 100%);
          border-radius: 11px; display: flex; align-items: center; justify-content: center;
          color: #042816; box-shadow: 0 4px 18px rgba(0, 217, 163, 0.22);
        }
        .brand-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 21px; letter-spacing: 2.5px; line-height: 1;
        }
        .brand-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: var(--text-faint);
          letter-spacing: 1.5px; text-transform: uppercase; margin-top: 3px;
        }
        .reset-btn {
          background: var(--surface); border: 1px solid var(--border);
          color: var(--text-dim); padding: 9px 11px; border-radius: 9px;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: all 0.2s;
        }
        .reset-btn:hover { color: var(--accent-2); border-color: var(--accent-2); }

        .tabs {
          display: flex; gap: 3px;
          background: var(--surface); padding: 3px;
          border-radius: 11px; border: 1px solid var(--border);
          overflow-x: auto;
        }
        .tab {
          flex: 1; background: transparent; border: none;
          color: var(--text-dim);
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
          padding: 9px 8px; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 5px; transition: all 0.2s; white-space: nowrap; min-width: fit-content;
        }
        .tab:hover { color: var(--text); }
        .tab-active {
          background: linear-gradient(135deg, var(--accent) 0%, #00b585 100%);
          color: #042816; box-shadow: 0 2px 8px rgba(0, 217, 163, 0.3);
        }
        .tab-active:hover { color: #042816; }

        .content {
          padding: 16px 0 24px;
          display: flex; flex-direction: column; gap: 20px;
        }

        .random-bar {
          display: flex; justify-content: center;
        }
        .random-btn {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(99, 102, 241, 0.3);
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .random-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45);
          background: linear-gradient(135deg, #7376f5, #5d54ec);
        }
        .random-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
        }
        .random-btn svg:last-child { color: #ffe899; }

        .info-card {
          background: linear-gradient(135deg, rgba(0, 217, 163, 0.08), rgba(0, 217, 163, 0.02));
          border: 1px solid rgba(0, 217, 163, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex; align-items: flex-start; gap: 10px;
          color: var(--text-dim);
          font-size: 13px; line-height: 1.5;
        }
        .info-card svg { color: var(--accent); flex-shrink: 0; margin-top: 2px; }

        .group-section {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; overflow: hidden;
        }
        .group-section-final {
          border: 2px solid var(--gold);
          box-shadow: 0 4px 30px rgba(255, 184, 56, 0.15);
        }
        .group-header {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: linear-gradient(135deg, var(--surface-2), var(--surface));
          border-bottom: 1px solid var(--border);
        }
        .group-letter {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, var(--accent) 0%, #00b585 100%);
          color: #042816;
          font-family: 'Bebas Neue', sans-serif; font-size: 22px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 217, 163, 0.2);
        }
        .group-letter-special {
          background: linear-gradient(135deg, var(--gold), #f59e0b);
          color: #2a1b00;
          box-shadow: 0 2px 10px rgba(255, 184, 56, 0.25);
        }
        .ko-round-letter {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          font-family: 'Bebas Neue', sans-serif; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.25);
        }
        .ko-round-bronze {
          background: linear-gradient(135deg, #cd7f32, #a96420);
          box-shadow: 0 2px 10px rgba(205, 127, 50, 0.3);
        }
        .ko-round-gold {
          background: linear-gradient(135deg, var(--gold), #e89500);
          color: #2a1b00;
          box-shadow: 0 2px 14px rgba(255, 184, 56, 0.4);
        }
        .group-info { flex: 1; min-width: 0; }
        .group-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px; letter-spacing: 1.5px;
        }
        .group-teams {
          font-size: 11px; color: var(--text-faint);
          font-family: 'JetBrains Mono', monospace;
          margin-top: 3px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .matches { padding: 4px 0; }
        .match, .ko-match {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .match:last-child, .ko-match:last-child { border-bottom: none; }
        .match:hover { background: rgba(255, 255, 255, 0.02); }
        .match-done { background: rgba(0, 217, 163, 0.04); }
        .ko-match-disabled { opacity: 0.55; }
        .ko-match-done { background: rgba(99, 102, 241, 0.05); }

        .match-meta, .ko-label {
          display: flex; align-items: center; gap: 5px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: var(--text-faint);
          text-transform: uppercase; letter-spacing: 0.8px;
          margin-bottom: 8px; flex-wrap: wrap;
        }
        .ko-label {
          justify-content: space-between;
        }
        .ko-meta {
          color: var(--text-dim);
          text-transform: none;
          letter-spacing: 0.3px;
          font-size: 10px;
          text-align: right;
        }
        .match-meta svg { color: var(--text-faint); }
        .match-meta-dot { color: var(--border); margin: 0 2px; }

        .match-body, .ko-body {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 8px; align-items: center;
        }
        .match-team, .ko-team {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 500; min-width: 0;
        }
        .ko-team { font-weight: 600; }
        .match-team-left, .ko-team-left { justify-content: flex-end; text-align: right; }
        .match-team-right, .ko-team-right { justify-content: flex-start; text-align: left; }
        .match-flag, .ko-flag { font-size: 20px; line-height: 1; flex-shrink: 0; }
        .match-name, .ko-name {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ko-tbd {
          font-style: italic; color: var(--text-faint);
          font-size: 12px; font-weight: 500;
        }
        .match-score, .ko-score {
          display: flex; align-items: center; gap: 6px;
        }
        .match-score input, .ko-score input {
          width: 38px; height: 38px;
          background: var(--surface-2); border: 1px solid var(--border);
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px; font-weight: 700;
          text-align: center; border-radius: 8px;
          transition: all 0.15s;
          -moz-appearance: textfield;
          touch-action: manipulation;
        }
        .match-score input::-webkit-outer-spin-button,
        .match-score input::-webkit-inner-spin-button,
        .ko-score input::-webkit-outer-spin-button,
        .ko-score input::-webkit-inner-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        .match-score input:focus, .ko-score input:focus {
          outline: none; border-color: var(--accent);
          background: var(--surface-3);
          box-shadow: 0 0 0 3px rgba(0, 217, 163, 0.15);
        }
        .ko-score input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        .ko-score input:disabled { opacity: 0.3; cursor: not-allowed; }
        .match-dash { color: var(--text-faint); font-weight: 700; font-size: 14px; }

        .ko-penalties {
          margin-top: 12px;
          padding: 10px 12px;
          background: rgba(255, 61, 107, 0.08);
          border: 1px dashed rgba(255, 61, 107, 0.35);
          border-radius: 8px;
          display: flex; align-items: center;
          flex-wrap: wrap; gap: 8px;
        }
        .ko-pen-label {
          font-size: 11px;
          color: var(--accent-2);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }
        .pen-btn {
          background: var(--surface-2); border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 600;
          padding: 10px 14px; border-radius: 7px;
          min-height: 40px;
          cursor: pointer; transition: all 0.15s;
        }
        .pen-btn:hover {
          color: var(--text); border-color: var(--accent);
        }
        .pen-btn-active {
          background: linear-gradient(135deg, var(--accent), #00b585);
          color: #042816;
          border-color: var(--accent);
          box-shadow: 0 2px 10px rgba(0, 217, 163, 0.3);
        }

        .table-wrap { overflow-x: auto; }
        .table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .table thead th {
          background: var(--surface-2);
          color: var(--text-faint);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px;
          padding: 10px 6px; text-align: center;
          border-bottom: 1px solid var(--border);
        }
        .th-pos { width: 40px; }
        .th-team { text-align: left !important; padding-left: 14px !important; }
        .th-pts { color: var(--accent) !important; }
        .table tbody td {
          padding: 10px 6px; text-align: center;
          border-bottom: 1px solid var(--border);
          font-family: 'JetBrains Mono', monospace;
          font-weight: 500; color: var(--text-dim);
        }
        .table tbody tr:last-child td { border-bottom: none; }
        .td-pos { padding-left: 12px !important; }
        .pos-pill {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 6px;
          font-family: 'Bebas Neue', sans-serif; font-size: 13px;
        }
        .pos-1, .pos-2 { background: rgba(0, 217, 163, 0.18); color: var(--qual); }
        .pos-3 { background: rgba(255, 184, 56, 0.15); color: var(--third); }
        .pos-4 { background: rgba(255, 61, 107, 0.12); color: var(--out); }
        .pos-qual { background: rgba(0, 217, 163, 0.18); color: var(--qual); }
        .pos-out { background: rgba(255, 61, 107, 0.12); color: var(--out); }
        .td-team {
          text-align: left !important; padding-left: 14px !important;
          font-family: 'DM Sans', sans-serif !important;
          font-weight: 600; color: var(--text) !important;
          vertical-align: middle;
        }
        .td-team > * {
          vertical-align: middle;
        }
        .td-team > span:not(.me-tag) {
          margin-left: 8px;
        }
        .td-flag { font-size: 18px; }
        .td-group {
          font-family: 'Bebas Neue', sans-serif !important;
          font-size: 14px; color: var(--text) !important;
        }
        .td-pts { color: var(--accent) !important; font-weight: 700 !important; }
        .dg-plus { color: var(--accent) !important; }
        .dg-minus { color: var(--accent-2) !important; }
        .row-qual { background: rgba(0, 217, 163, 0.04); }
        .row-third { background: rgba(255, 184, 56, 0.03); }
        .empty-state {
          padding: 40px 20px; text-align: center;
          color: var(--text-faint); font-size: 13px; line-height: 1.6;
        }

        .champion-box {
          background: linear-gradient(135deg, rgba(255, 184, 56, 0.15), rgba(255, 184, 56, 0.05));
          border: 2px solid var(--gold);
          border-radius: 16px;
          padding: 24px 20px;
          text-align: center;
          box-shadow: 0 8px 40px rgba(255, 184, 56, 0.15);
        }
        .champion-trophy {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, var(--gold), #e89500);
          color: #2a1b00;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px;
          box-shadow: 0 4px 20px rgba(255, 184, 56, 0.4);
        }
        .champion-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: var(--gold);
          letter-spacing: 2px; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .champion-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px; letter-spacing: 2px;
          margin-bottom: 16px;
        }
        .champion-podium {
          display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;
        }
        .podium-item {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 600;
        }
        .podium-silver {
          background: rgba(200, 200, 200, 0.1);
          border: 1px solid rgba(200, 200, 200, 0.3);
          color: #d0d0d0;
        }
        .podium-bronze {
          background: rgba(205, 127, 50, 0.1);
          border: 1px solid rgba(205, 127, 50, 0.3);
          color: #cd9b6e;
        }
        .podium-pos {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
        }

        .awards {
          display: grid; grid-template-columns: 1fr; gap: 16px;
        }
        .award-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          position: relative; overflow: hidden;
        }
        .award-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--gold), transparent 70%);
        }
        .award-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, var(--gold), #f59e0b);
          color: #2a1b00; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .award-label {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px; letter-spacing: 1.5px;
          margin-bottom: 2px;
        }
        .award-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: var(--text-faint);
          letter-spacing: 1px; text-transform: uppercase;
          margin-bottom: 12px;
        }
        .award-input {
          width: 100%;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 16px; font-weight: 500;
          padding: 12px 14px; border-radius: 10px;
          transition: all 0.15s;
        }
        .award-input:focus {
          outline: none; border-color: var(--gold);
          background: var(--surface-3);
          box-shadow: 0 0 0 3px rgba(255, 184, 56, 0.15);
        }
        .award-input::placeholder { color: var(--text-faint); }
        .save-hint {
          display: flex; align-items: center; gap: 8px;
          justify-content: center;
          color: var(--text-faint); font-size: 12px;
          padding: 12px;
        }
        .save-hint svg { color: var(--accent); }

        .group-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }
        .group-matches, .group-standings {
          padding: 4px 0;
        }
        .group-standings {
          border-top: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.015);
        }
        .split-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-faint);
          padding: 10px 16px 6px;
          font-weight: 700;
        }
        .mini-table-wrap {
          padding: 0 8px 12px;
          overflow-x: auto;
        }
        .mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .mini-table thead th {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          color: var(--text-faint);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          padding: 6px 3px;
          text-align: center;
          border-bottom: 1px solid var(--border);
        }
        .mini-table tbody td {
          padding: 7px 3px;
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 500;
          color: var(--text-dim);
          border-bottom: 1px solid var(--border);
        }
        .mini-table tbody tr:last-child td { border-bottom: none; }
        .mt-pos { width: 26px; padding-left: 4px !important; }
        .mt-team {
          text-align: left !important;
          font-family: 'DM Sans', sans-serif !important;
          color: var(--text) !important;
          font-weight: 600;
          padding: 7px 4px 7px 4px !important;
          vertical-align: middle;
          white-space: nowrap;
          max-width: 0;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mt-team > * {
          vertical-align: middle;
        }
        .mt-team .flag-img {
          margin-right: 5px;
        }
        .mt-flag { font-size: 14px; }
        .mt-name {
          font-size: 11px;
        }
        .mt-pts { color: var(--accent) !important; font-weight: 700 !important; }

        @media (min-width: 760px) {
          .group-split {
            grid-template-columns: 1.4fr 1fr;
          }
          .group-standings {
            border-top: none;
            border-left: 1px solid var(--border);
            background: transparent;
          }
        }

        .tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          margin-left: 4px;
        }
        .tab-badge-ok {
          background: var(--accent);
          color: #042816;
        }
        .tab-badge-warn {
          background: var(--accent-2);
          color: #fff;
          animation: badgePulse 1.6s ease-in-out infinite;
        }
        .tab-badge-empty {
          background: var(--text-faint);
          color: #0a0e1a;
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 61, 107, 0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 4px rgba(255, 61, 107, 0); }
        }
        .tab-active .tab-badge-ok { background: #042816; color: var(--accent); }
        .tab-active .tab-badge-warn { background: #fff; color: var(--accent-2); }
        .tab-active .tab-badge-empty { background: rgba(4,40,22,0.4); color: #042816; }

        .tiebreaker-box {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tie-item {
          background: var(--surface-2);
          border: 1px dashed var(--accent-2);
          border-radius: 10px;
          padding: 12px;
        }
        .tie-item-resolved {
          border: 1px solid var(--accent);
          background: linear-gradient(135deg, rgba(0,217,163,0.08), rgba(0,217,163,0.02));
        }
        .tie-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .tie-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--accent-2);
          box-shadow: 0 0 8px rgba(255, 61, 107, 0.6);
          animation: badgePulse 1.6s ease-in-out infinite;
        }
        .tie-item-resolved .tie-dot {
          background: var(--accent);
          box-shadow: 0 0 8px rgba(0,217,163,0.6);
          animation: none;
        }
        .tie-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          letter-spacing: 1.2px;
          color: var(--text);
        }
        .tie-subtitle {
          font-size: 11px;
          color: var(--text-faint);
          margin-bottom: 10px;
        }
        .tie-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 10px;
        }
        .tie-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 7px 10px;
        }
        .tie-pos {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          color: var(--gold);
          min-width: 24px;
        }
        .tie-flag { font-size: 18px; }
        .tie-name {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }
        .tie-arrows {
          display: flex;
          gap: 4px;
        }
        .tie-arrow {
          background: var(--surface-3);
          border: 1px solid var(--border);
          color: var(--text-dim);
          width: 26px;
          height: 26px;
          border-radius: 6px;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .tie-arrow:hover:not(:disabled) {
          color: var(--accent);
          border-color: var(--accent);
        }
        .tie-arrow:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .tie-confirm {
          width: 100%;
          background: linear-gradient(135deg, var(--accent), #00b585);
          color: #042816;
          border: none;
          padding: 9px 12px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tie-confirm:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0,217,163,0.3);
        }
        .tie-item-resolved .tie-confirm {
          background: var(--surface-3);
          color: var(--text-dim);
        }

        .pending-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid;
        }
        .pending-card svg { flex-shrink: 0; }
        .pending-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .pending-text strong {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 1px;
          font-weight: 400;
          color: var(--text);
        }
        .pending-text span {
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.4;
        }
        .pending-card-ok {
          background: linear-gradient(135deg, rgba(0, 217, 163, 0.1), rgba(0, 217, 163, 0.02));
          border-color: rgba(0, 217, 163, 0.35);
        }
        .pending-card-ok svg { color: var(--accent); }
        .pending-card-warn {
          background: linear-gradient(135deg, rgba(255, 61, 107, 0.1), rgba(255, 61, 107, 0.02));
          border-color: rgba(255, 61, 107, 0.35);
        }
        .pending-card-warn svg { color: var(--accent-2); }
        .pending-card-empty {
          background: var(--surface-2);
          border-color: var(--border);
        }
        .pending-card-empty svg { color: var(--text-faint); }
        .pending-card-empty .pending-text strong { color: var(--text-dim); }

        /* Tarjeta de progreso de partidos (Grupos y KO) */
        .progress-card {
          background: linear-gradient(135deg, rgba(255, 184, 56, 0.10), rgba(255, 184, 56, 0.02));
          border: 1px solid rgba(255, 184, 56, 0.35);
          border-radius: 12px;
          padding: 12px 16px 14px;
          position: sticky;
          top: 0;
          z-index: 5;
          backdrop-filter: blur(6px);
          margin-bottom: 4px;
        }
        .progress-card.progress-card-done {
          background: linear-gradient(135deg, rgba(0, 217, 163, 0.10), rgba(0, 217, 163, 0.02));
          border-color: rgba(0, 217, 163, 0.35);
        }
        .progress-card-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .progress-card-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .progress-card-text strong {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 1px;
          font-weight: 400;
          color: var(--text);
        }
        .progress-card-text span {
          font-size: 12px;
          color: var(--text-dim);
        }
        .progress-bar-track {
          margin-top: 8px;
          height: 5px;
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--gold), #ffd87a);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .progress-card-done .progress-bar-fill {
          background: linear-gradient(90deg, var(--accent), #4ee2bc);
        }

        .nombre-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: linear-gradient(135deg, rgba(255, 184, 56, 0.12), rgba(255, 184, 56, 0.03));
          border: 1px dashed rgba(255, 184, 56, 0.5);
          border-radius: 16px;
          padding: 18px;
          transition: all 0.2s;
        }
        .nombre-card-ok {
          border: 1px solid var(--accent);
          background: linear-gradient(135deg, rgba(0, 217, 163, 0.1), rgba(0, 217, 163, 0.02));
        }
        .nombre-icon {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: linear-gradient(135deg, var(--gold), #e89500);
          color: #2a1b00;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(255, 184, 56, 0.3);
        }
        .nombre-card-ok .nombre-icon {
          background: linear-gradient(135deg, var(--accent), #00b585);
          color: #042816;
          box-shadow: 0 2px 12px rgba(0, 217, 163, 0.3);
        }
        .nombre-body {
          flex: 1;
          min-width: 0;
        }
        .nombre-label {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1.5px;
          color: var(--text);
          margin-bottom: 2px;
        }
        .nombre-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-faint);
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .nombre-input {
          width: 100%;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 600;
          padding: 11px 14px;
          border-radius: 10px;
          transition: all 0.15s;
        }
        .nombre-input:focus {
          outline: none;
          border-color: var(--gold);
          background: var(--surface-3);
          box-shadow: 0 0 0 3px rgba(255, 184, 56, 0.15);
        }
        .nombre-card-ok .nombre-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(0, 217, 163, 0.15);
        }
        .nombre-input::placeholder { color: var(--text-faint); }

        .instr-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
        }
        .instr-section.instr-note {
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.02));
          border-color: rgba(99, 102, 241, 0.3);
          color: var(--text-dim);
          font-size: 13px;
          line-height: 1.5;
        }
        .instr-section.instr-note svg { color: #6366f1; flex-shrink: 0; margin-top: 2px; }
        /* Nota dentro de la sección de puntuación */
        .puntos-note {
          margin-top: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: linear-gradient(135deg, rgba(255, 184, 56, 0.10), rgba(255, 184, 56, 0.02));
          border: 1px solid rgba(255, 184, 56, 0.35);
          border-radius: 10px;
          color: var(--text-dim);
          font-size: 12.5px;
          line-height: 1.5;
        }
        .puntos-note svg { color: var(--gold); flex-shrink: 0; margin-top: 2px; }
        .puntos-note strong { color: var(--text); font-weight: 700; }
        .instr-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        .instr-header svg { color: var(--accent); }
        .instr-header h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 2px;
          color: var(--text);
          font-weight: 400;
        }
        .instr-list {
          padding-left: 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: var(--text-dim);
          font-size: 14px;
          line-height: 1.55;
        }
        .instr-list li strong { color: var(--text); font-weight: 600; }
        .instr-list li em { color: var(--accent-2); font-style: normal; font-weight: 500; }
        .instr-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          font-size: 13px;
        }
        .instr-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 7px;
          border-radius: 11px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
        }
        .instr-badge-ok { background: var(--accent); color: #042816; }
        .instr-badge-warn { background: var(--accent-2); color: #fff; }
        .instr-badge-empty { background: var(--text-faint); color: #0a0e1a; }

        .puntos-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .puntos-bloque {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .puntos-bloque-header {
          padding: 10px 14px;
          background: var(--surface-3);
          border-left: 4px solid var(--accent);
        }
        .puntos-bloque-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 1.5px;
          color: var(--text);
        }
        .puntos-table {
          width: 100%;
          border-collapse: collapse;
        }
        .puntos-table td {
          padding: 9px 14px;
          font-size: 13px;
          border-bottom: 1px solid var(--border);
        }
        .puntos-table tr:last-child td { border-bottom: none; }
        .puntos-regla {
          color: var(--text-dim);
        }
        .puntos-valor {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          text-align: right;
          width: 60px;
          white-space: nowrap;
        }

        @media (min-width: 760px) {
          .puntos-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .loading-screen {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: var(--bg-grad);
          color: var(--text-dim);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .loading-screen svg {
          color: var(--accent);
          animation: spin 1.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-cta {
          background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%) !important;
          color: #1a1a1a !important;
          box-shadow: 0 8px 28px rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.3) inset !important;
        }
        .login-cta:hover {
          box-shadow: 0 12px 38px rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.4) inset !important;
        }
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 61, 107, 0.15);
          border: 1px solid rgba(255, 61, 107, 0.4);
          color: #ffb0c2;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          max-width: 320px;
          text-align: center;
          backdrop-filter: blur(4px);
        }
        .login-error svg { color: var(--accent-2); flex-shrink: 0; }

        .saving-dot {
          color: var(--accent);
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          animation: pulse-opacity 1.4s ease-in-out infinite;
        }
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        .header-actions {
          display: flex;
          gap: 6px;
        }
        .reset-btn-logout:hover {
          color: var(--gold) !important;
          border-color: var(--gold) !important;
        }

        .tab-admin {
          position: relative;
        }
        .tab-admin::before {
          content: '';
          position: absolute;
          top: 4px; right: 6px;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--gold);
          box-shadow: 0 0 6px var(--gold);
        }
        .tab-admin.tab-active::before { display: none; }

        /* Botones de publicar partido (modo admin) */
        .match-publish-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px 10px;
          border-top: 1px dashed var(--border);
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .match-publish-btn {
          background: var(--gold);
          color: #1a1a1a;
          border: none;
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.02em;
        }
        .match-publish-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .match-publish-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .match-publish-btn-undo {
          background: transparent;
          color: var(--text-dim);
          border: 1px solid var(--border);
          font-weight: 500;
          font-size: 11px;
        }
        .match-publish-btn-undo:hover {
          color: var(--text);
          border-color: var(--text-dim);
        }
        .match-published-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(16, 185, 129, 0.18);
          color: var(--accent);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .match.match-published, .ko-match.match-published {
          box-shadow: inset 3px 0 0 var(--accent);
        }

        /* Separador vertical fino entre grupos de pestañas */
        .tab-separator {
          display: inline-block;
          width: 1px;
          align-self: stretch;
          background: var(--border);
          margin: 6px 4px;
          flex-shrink: 0;
        }
        /* Pestañas del grupo "general" (Clasif., Jornadas, Cuadro Final) un poco más tenues */
        .tab-grupo-general:not(.tab-active) {
          color: var(--text-dim);
        }
        .tab-grupo-general:not(.tab-active) svg {
          opacity: 0.75;
        }
        /* Pestaña admin: dorado de texto e icono cuando NO está activa */
        .tab-grupo-admin:not(.tab-active) {
          color: var(--gold);
        }
        .tab-grupo-admin:not(.tab-active) svg {
          color: var(--gold);
        }

        .admin-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .admin-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 9px 14px;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .admin-btn:hover:not(:disabled) {
          color: var(--accent);
          border-color: var(--accent);
        }
        .admin-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .admin-table tr.admin-row {
          cursor: pointer;
          transition: background 0.12s;
        }
        .admin-table tr.admin-row:hover {
          background: rgba(0, 217, 163, 0.05);
        }
        .admin-delete {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--accent-2);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .admin-delete:hover {
          background: var(--accent-2);
          color: #fff;
          border-color: var(--accent-2);
        }

        .pred-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-dim);
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 3px 8px;
          letter-spacing: 0.4px;
        }
        .pred-pill .pred-ok {
          color: var(--accent);
        }
        .admin-btn-danger {
          color: var(--accent-2) !important;
        }
        .admin-btn-danger:hover {
          background: rgba(255,61,107,0.1) !important;
          border-color: var(--accent-2) !important;
        }
        .admin-btn-warn {
          background: rgba(255,184,56,0.12) !important;
          border-color: var(--gold) !important;
          color: var(--gold) !important;
        }
        .admin-btn-warn:hover {
          background: rgba(255,184,56,0.2) !important;
        }
        .admin-btn-warn:disabled {
          opacity: 0.5;
        }

        .clasif-row-clickable {
          cursor: pointer;
          transition: background 0.15s;
        }
        .clasif-row-clickable:hover {
          background: var(--surface-2) !important;
        }
        .expand-arrow {
          margin-left: 8px;
          color: var(--text-faint);
          font-size: 10px;
        }
        .clasif-detail-row td {
          padding: 0 !important;
          background: var(--surface-2);
        }
        .clasif-detail {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          padding: 12px 16px;
        }
        .clasif-detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          font-size: 12px;
          color: var(--text-dim);
          border-bottom: 1px solid var(--border);
        }
        .clasif-detail-item strong {
          color: var(--accent);
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }
        .clasif-detail-total {
          background: var(--surface-3);
          font-weight: 700;
          color: var(--text);
          border-top: 1px solid var(--accent);
          grid-column: 1 / -1;
        }
        .clasif-detail-total strong {
          font-size: 14px;
        }

        .cf-table th, .cf-table td {
          font-size: 11px;
          white-space: nowrap;
        }
        .cf-th-sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }
        .cf-th-sortable:hover {
          background: var(--surface-3);
        }
        .cf-th-active {
          color: var(--accent);
        }
        .cf-sort-arrow {
          font-size: 9px;
          margin-left: 2px;
        }
        .cf-eliminado {
          text-decoration: line-through;
          color: var(--text-faint);
          opacity: 0.6;
        }
        .cf-table .td-pos {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          color: var(--accent);
          text-align: center;
          width: 36px;
        }
        .cf-table .row-me {
          background: rgba(255,184,56,0.08);
        }
        .cf-table .row-me td {
          color: var(--gold);
        }
        .cf-table .row-me .td-pos {
          color: var(--gold);
        }
        .cf-real {
          padding: 12px 16px;
          display: grid;
          gap: 6px;
        }
        .cf-real-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--surface-2);
          border-radius: 8px;
          font-size: 13px;
        }
        .cf-real-row strong {
          color: var(--accent);
          font-weight: 700;
        }

        .confirm-reminder {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 14px;
          align-items: center;
          background: linear-gradient(135deg, rgba(255,184,56,0.15), rgba(255,184,56,0.04));
          border: 1px solid var(--gold);
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .confirm-reminder > svg { color: var(--gold); }
        .confirm-reminder-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .confirm-reminder-text strong {
          font-size: 13px;
          color: var(--text);
          font-weight: 700;
        }
        .confirm-reminder-text span {
          font-size: 11px;
          color: var(--text-dim);
        }
        .confirm-reminder-btn {
          background: var(--gold);
          color: #1a1100;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 12px;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
        }
        .confirm-reminder-ok {
          background: linear-gradient(135deg, rgba(0,217,163,0.12), rgba(0,217,163,0.02));
          border-color: var(--accent);
          grid-template-columns: auto 1fr;
        }
        .confirm-reminder-ok > svg { color: var(--accent); }
        .confirm-reminder-warn {
          background: linear-gradient(135deg, rgba(255,184,56,0.10), rgba(255,184,56,0.02));
          border-color: rgba(255,184,56,0.5);
          grid-template-columns: auto 1fr;
        }
        .confirm-reminder-warn > svg { color: var(--gold); }

        .admin-banner {
          background: linear-gradient(135deg, var(--gold), #d99410);
          color: #1a1100;
          padding: 6px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .admin-banner-results {
          position: relative;
          margin: 8px 0 14px;
          padding: 10px 14px;
          letter-spacing: 0.5px;
          font-size: 11px;
          line-height: 1.4;
          font-weight: 500;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.08));
          color: var(--text);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 8px;
          text-align: left;
          justify-content: flex-start;
        }
        .admin-banner-results strong {
          color: var(--gold);
        }

        /* Bloques de la pestaña Recalcular */
        .recalc-block {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 14px;
        }
        .recalc-block-danger {
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.04);
        }
        .recalc-block-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 10px;
        }
        .recalc-block-body {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .recalc-block-note {
          margin-top: 10px;
          font-size: 11px;
          line-height: 1.5;
          color: var(--text-faint);
        }
        .recalc-block-note strong {
          color: var(--text-dim);
        }
        .admin-banner-back {
          background: rgba(26, 17, 0, 0.4);
          border: none;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          margin-left: 6px;
        }
        .admin-banner-back:hover { background: rgba(26, 17, 0, 0.6); }

        .public-banner {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          padding: 6px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .closed-banner {
          background: linear-gradient(135deg, var(--accent-2), #d92b54);
          color: #fff;
          padding: 6px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .back-to-login {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          padding: 7px 12px;
          border-radius: 8px;
          cursor: pointer;
        }
        .back-to-login:hover { color: var(--accent); border-color: var(--accent); }

        .landing-cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.08);
          color: var(--text);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 20px;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.2s;
        }
        .landing-cta-secondary:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.35);
        }

        .sub-tabs {
          display: flex;
          gap: 3px;
          background: var(--surface);
          padding: 3px;
          border-radius: 10px;
          border: 1px solid var(--border);
          overflow-x: auto;
        }
        .sub-tab {
          flex: 1;
          min-width: fit-content;
          background: transparent;
          border: none;
          color: var(--text-dim);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 7px 10px;
          border-radius: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .sub-tab:hover { color: var(--text); }
        .sub-tab-active {
          background: var(--surface-3);
          color: var(--accent);
        }

        .me-tag {
          margin-left: 8px;
          background: var(--accent);
          color: #042816;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 1px;
        }
        .pts-gain {
          color: var(--accent);
          font-weight: 700;
        }

        .status-tag {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .status-ok { background: rgba(0,217,163,0.18); color: var(--accent); }
        .status-warn { background: rgba(255,184,56,0.18); color: var(--gold); }
        .status-pending { background: rgba(255,61,107,0.15); color: var(--accent-2); }

        .admin-btn-mini {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 8px 12px;
          min-height: 36px;
          min-width: 36px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .admin-btn-mini:hover {
          color: var(--accent);
          border-color: var(--accent);
        }
        .admin-btn-primary {
          background: linear-gradient(135deg, var(--accent), #00b585);
          color: #042816;
          border: none;
          font-weight: 700;
        }
        .admin-btn-primary:disabled {
          background: var(--surface-3);
          color: var(--text-faint);
        }
        .spin { animation: spin 1s linear infinite; }
        .dia-selector, .jornada-field select, .titulo-field input {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          padding: 8px 12px;
          border-radius: 8px;
          outline: none;
          min-width: 200px;
        }
        .dia-selector:focus, .jornada-field select:focus, .titulo-field input:focus {
          border-color: var(--accent);
        }
        .titulo-field {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 12px;
          align-items: center;
        }
        .titulo-field span {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dim);
        }

        .jornadas-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: end;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .jornada-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .jornada-field label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--text-faint);
          font-weight: 700;
        }
        .jornada-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-dim);
          cursor: pointer;
        }
        .jornada-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
        }
        .jornada-card-head {
          padding: 14px 16px;
          background: linear-gradient(135deg, var(--surface-2), var(--surface));
          border-bottom: 1px solid var(--border);
        }
        .jornada-meta {
          display: flex;
          justify-content: space-between;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-faint);
          letter-spacing: 0.6px;
          margin-bottom: 10px;
        }
        .jornada-tipo {
          color: var(--accent);
        }
        .jornada-marcador {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: center;
        }
        .jornada-team {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
        }
        .jornada-team:first-child {
          justify-content: flex-end;
        }
        .jornada-result {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          color: var(--accent);
        }
        .jornada-pending {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text-faint);
        }
        .jornada-veiled {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface-2);
          font-size: 12px;
          color: var(--text-faint);
        }
        .jornada-predicciones {
          padding: 8px 0;
        }
        .jornada-pred-head {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          padding: 8px 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-faint);
          border-bottom: 1px solid var(--border);
          font-weight: 700;
        }
        .jornada-pred-head span:nth-child(2) { min-width: 60px; text-align: center; }
        .jornada-pred-head span:nth-child(3) { min-width: 40px; text-align: right; }
        .jornada-pred-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          padding: 8px 16px;
          font-size: 12px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }
        .jornada-pred-row:last-child { border-bottom: none; }
        .jornada-pred-row span:nth-child(2) { min-width: 60px; text-align: center; }
        .jornada-pred-row span:nth-child(3) { min-width: 40px; text-align: right; }

        .confirm-card {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 14px;
          align-items: center;
          background: linear-gradient(135deg, rgba(0,217,163,0.12), rgba(0,217,163,0.02));
          border: 1px solid var(--accent);
          padding: 16px;
          border-radius: 14px;
        }
        .confirm-card > svg { color: var(--accent); }
        .confirm-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1px;
          color: var(--text);
        }
        .confirm-sub {
          font-size: 12px;
          color: var(--text-dim);
        }
        .confirm-btn {
          background: linear-gradient(135deg, var(--accent), #00b585);
          color: #042816;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .confirm-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,217,163,0.35);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .modal-content {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .modal-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, var(--accent), #00b585);
          color: #042816;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 2px;
          margin-bottom: 8px;
          color: var(--text);
        }
        .modal-text {
          font-size: 14px;
          color: var(--text-dim);
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .modal-btn {
          padding: 10px 18px;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
        }
        .modal-btn-secondary {
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-dim);
        }
        .modal-btn-primary {
          background: linear-gradient(135deg, var(--accent), #00b585);
          color: #042816;
        }

        .ko-pen-hint {
          color: var(--text-faint);
          font-weight: 400;
          letter-spacing: 0.5px;
          margin-left: 4px;
        }
        .ko-pen-note {
          margin-top: 8px;
          padding: 6px 10px;
          background: rgba(0,217,163,0.08);
          border: 1px solid rgba(0,217,163,0.25);
          border-radius: 6px;
          font-size: 11px;
          color: var(--accent);
          text-align: center;
        }

        @media (min-width: 600px) {
          .awards { grid-template-columns: repeat(3, 1fr); }
          .match-score input, .ko-score input { width: 44px; height: 44px; font-size: 16px; }
          .match-team, .ko-team { font-size: 14px; }
          .match-flag, .ko-flag { font-size: 22px; }
        }

        @media (max-width: 480px) {
          .tab span { display: none; }
          .tab { padding: 9px; }
          .brand-title { font-size: 18px; letter-spacing: 1.5px; }
          .group-header { padding: 12px 14px; }
          .group-letter, .ko-round-letter { width: 36px; height: 36px; font-size: 16px; }
          .group-title { font-size: 16px; }
          .match, .ko-match { padding: 10px 12px; }
          .match-team, .ko-team { font-size: 12px; }
          .match-score input, .ko-score input { width: 44px; height: 44px; font-size: 16px; }
          .table { font-size: 11px; }
          .table thead th, .table tbody td { padding: 8px 4px; }
          .td-team { padding-left: 8px !important; }
          .td-flag { font-size: 15px; }
          .champion-name { font-size: 26px; }
          .random-btn { font-size: 12px; padding: 11px 16px; }
        }
      `}</style>

      <div className="app-root">
        {(!authChecked || procesandoRedirect) ? (
          <div className="loading-screen">
            <Trophy size={32} />
            <div>Cargando…</div>
          </div>
        ) : mode === 'login' ? (
          <LoginScreen onLogin={handleLogin} onPublicView={handlePublicView} error={loginError} />
        ) : mode === 'public' ? (
          <div className="app-shell">
            <div className="sticky-wrap">
              <Header
                tab={tab}
                setTab={setTab}
                publicMode={true}
              />
            </div>
            <div style={{ padding: '8px 0' }}>
              <button className="back-to-login" onClick={() => setMode('login')}>
                ← Volver al inicio
              </button>
            </div>
            {tab === 'clasificacion' && (
              <VistaClasificacion clasificacion={clasificacion} currentUid={null} />
            )}
            {tab === 'jornadas' && (
              <VistaJornadas
                resultadosReales={resultadosReales}
                todasLasPorras={todasLasPorras}
                filtroParticipante={filtroJornada}
                setFiltroParticipante={setFiltroJornada}
                cerradas={cerradas}
              />
            )}
            {tab === 'cuadrofinal' && (
              <CuadroFinalView
                todasLasPorras={todasLasPorras}
                resultadosReales={resultadosReales}
                clasificacion={clasificacion}
                currentUid={null}
                filtroParticipante={filtroCuadroFinal}
                setFiltroParticipante={setFiltroCuadroFinal}
                contexto="publico"
                cerradas={cerradas}
              />
            )}
          </div>
) : !entered && !cerradas ? (
          <LandingPage onEnter={() => setEntered(true)} nombre={nombre} />
        ) : (
          <div className="app-shell">
            <div className="sticky-wrap">
              <Header
                tab={tab}
                setTab={setTab}
                onReset={handleReset}
                tabStatus={tabStatus}
                nombre={nombre}
                isAdmin={isAdmin}
                onLogout={handleLogout}
                saving={saving}
                userEmail={user.email}
                editandoUid={editandoUid}
                onSalirEdicion={handleSalirEdicion}
                porraCerrada={cerradas}
              />
            </div>
            {tab === 'partidos' && (
              <VistaPartidos
                resultados={resultados}
                clasificaciones={clasificaciones}
                onChange={readOnly ? () => {} : onChangeResultado}
                onResolveDesempate={readOnly ? () => {} : onResolveDesempate}
              />
            )}
            {tab === 'terceros' && (
              <VistaTerceros
                clasificaciones={clasificaciones}
                desempateTerceros={desempateTerceros}
                onResolveTerceros={readOnly ? () => {} : onResolveTerceros}
                status={tabStatus.terceros.status}
                pending={tabStatus.terceros.pending}
              />
            )}
            {tab === 'eliminatorias' && (
              <VistaEliminatorias
                clasificaciones={clasificaciones}
                desempateTerceros={desempateTerceros}
                resultadosKO={resultadosKO}
                onChangeKO={readOnly ? () => {} : onChangeKO}
                status={tabStatus.eliminatorias.status}
                pending={tabStatus.eliminatorias.pending}
              />
            )}
            {tab === 'premios' && (
              <VistaPremios
                premios={premios}
                onChange={readOnly ? () => {} : onChangePremio}
                completaPendiente={porraCompleta({ nombre, resultados, resultadosKO, premios }, CONSTANTES) && !completed && !editandoUid}
                completed={completed}
                onGoToInfo={() => setTab('instrucciones')}
              />
            )}
            {tab === 'instrucciones' && (
              <VistaInstrucciones
                nombre={nombre}
                onChangeNombre={readOnly ? () => {} : (v => { dirtyRef.current = true; setNombre(v); })}
                cerradas={cerradas}
                completed={completed}
                onConfirmarEnvio={() => setShowConfirmModal(true)}
                puedeConfirmar={porraCompleta({
                  nombre, resultados, resultadosKO, premios
                }, CONSTANTES) && !completed && !editandoUid}
              />
            )}
            {tab === 'clasificacion' && (
              <VistaClasificacion clasificacion={clasificacion} currentUid={user.uid} />
            )}
            {tab === 'jornadas' && (
              <VistaJornadas
                resultadosReales={resultadosReales}
                todasLasPorras={todasLasPorras}
                filtroParticipante={filtroJornada}
                setFiltroParticipante={setFiltroJornada}
                cerradas={cerradas}
              />
            )}
            {tab === 'cuadrofinal' && (
              <CuadroFinalView
                todasLasPorras={todasLasPorras}
                resultadosReales={resultadosReales}
                clasificacion={clasificacion}
                currentUid={user?.uid}
                filtroParticipante={filtroCuadroFinal}
                setFiltroParticipante={setFiltroCuadroFinal}
                contexto="publico"
                cerradas={cerradas || isAdmin}
              />
            )}
            {tab === 'admin' && isAdmin && (
              <VistaAdmin
                todasLasPorras={todasLasPorras}
                resultadosReales={resultadosReales}
                setResultadosRealesLocal={setResultadosReales}
                diasCerrados={diasCerrados}
                setDiasCerradosLocal={setDiasCerrados}
                onPublicarClasificacion={handlePublicarClasificacion}
                publicando={publicando}
                onEditarPorraDe={handleEditarPorra}
                onBorrarPorraDe={handleBorrarPorra}
                onGenerarDummies={handleGenerarDummies}
                onLimpiarDummies={handleLimpiarDummies}
                onRellenarMiPorraAlAzar={handleRellenarMiPorraAlAzar}
                onImportarExcel={handleImportExcel}
                onPublicarTodos={handlePublicarTodos}
                onDespublicarTodos={handleDespublicarTodos}
                onBorrarTodo={handleBorrarTodo}
                onCopiarPorraAdminAReales={handleCopiarPorraAdminAReales}
                clasificacion={clasificacion}
                currentUid={user?.uid}
                simulando={simulando}
              />
            )}
          </div>
        )}
        {showConfirmModal && (
          <ConfirmModal
            onClose={() => setShowConfirmModal(false)}
            onConfirm={handleConfirmarEnvio}
            nombre={nombre}
          />
        )}
      </div>
    </>
  );
}

// ============================================================
// MODAL DE CONFIRMACIÓN DE ENVÍO
// ============================================================
const ConfirmModal = ({ onClose, onConfirm, nombre }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-icon">
        <Send size={32} />
      </div>
      <h2 className="modal-title">¿Confirmar envío?</h2>
      <p className="modal-text">
        <strong>{nombre || 'Tu porra'}</strong> está completa. Al confirmar, se marcará como enviada.
        Aún podrás editarla hasta 1h antes del arranque del Mundial ({fechaCierreLegible()}).
      </p>
      <div className="modal-actions">
        <button className="modal-btn modal-btn-secondary" onClick={onClose}>
          Aún no
        </button>
        <button className="modal-btn modal-btn-primary" onClick={onConfirm}>
          <CheckCircle2 size={16} /> Confirmar envío
        </button>
      </div>
    </div>
  </div>
);
