/**
 * SHUB LOTO — app.js
 * Entry point: state, router, data loading, global utilities
 * Version: 2.0.0
 */

import { initDashboard, renderDashboard }       from './dashboard.js';
import { initResultados, renderHistorico }       from './resultados.js';
import { initEstatisticas, renderEstatisticas }  from './estatisticas.js';
import { initGerador }                           from './gerador.js';
import { initIA }                                from './ia.js';

/* ═══════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════ */
export const URLS = {
  results:  'https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/lotofacil.json',
  analytic: 'https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/lotofacil.analytic.json',
};

export const CACHE_KEY      = 'shubloto_data_v2';
export const CACHE_KEY_ANA  = 'shubloto_analytic_v2';
export const CACHE_TTL      = 4 * 60 * 60 * 1000; // 4 hours

export const CUSTOS = {
  15: 3.50,   16: 56.00,   17: 476.00,
  18: 2856.00, 19: 13566.00, 20: 54264.00,
};

/* ═══════════════════════════════════════
   GLOBAL STATE
   ═══════════════════════════════════════ */
export const State = {
  allResults:    {},   // { "1": [n,...], "2": [n,...] }
  analyticData:  {},
  freqMap:       {},   // { 1: count, ... 25: count }
  sortedNums:    [],   // [{n, c}] sorted desc by c
  concursosList: [],   // [3200, 3199, ...] sorted desc
  ultimoConcurso: 0,
  loaded: false,
};

/* ═══════════════════════════════════════
   UTILITIES (exported)
   ═══════════════════════════════════════ */
export function pad(n) {
  return String(n).padStart(2, '0');
}

export function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatCurrency(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

let _toastTimer = null;
export function toast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

export function setLoading(msg = 'Carregando…') {
  const overlay = document.getElementById('loading-overlay');
  const msgEl   = document.getElementById('loading-msg');
  if (overlay) overlay.classList.remove('hidden');
  if (msgEl)   msgEl.textContent = msg;
}

export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function buildBall(n, extraClass = '') {
  return `<div class="ball ${extraClass}" data-n="${n}">${pad(n)}</div>`;
}

export function buildDezenas(nums, matchSet = null) {
  return nums.map(n => {
    const cls = matchSet && matchSet.has(n) ? 'match' : '';
    return `<div class="dz ${cls}">${pad(n)}</div>`;
  }).join('');
}

export function loadingDots() {
  return `<div class="loading-dots" style="margin:20px 0">
    <span></span><span></span><span></span>
  </div>`;
}

/* ═══════════════════════════════════════
   CACHE HELPERS
   ═══════════════════════════════════════ */
function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

function loadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_KEY_ANA);
}

/* ═══════════════════════════════════════
   DATA LOADING
   ═══════════════════════════════════════ */
export async function loadData(force = false) {
  setLoading('Buscando resultados…');

  try {
    // Try cache first
    let results  = force ? null : loadCache(CACHE_KEY);
    let analytic = force ? null : loadCache(CACHE_KEY_ANA);

    if (!results || !analytic) {
      setLoading('Baixando histórico completo…');
      const [rRes, rAna] = await Promise.all([
        fetch(URLS.results),
        fetch(URLS.analytic),
      ]);

      if (!rRes.ok || !rAna.ok) throw new Error('Falha ao buscar dados');

      results  = await rRes.json();
      analytic = await rAna.json();

      saveCache(CACHE_KEY, results);
      saveCache(CACHE_KEY_ANA, analytic);
    }

    setLoading('Processando dados…');
    processData(results, analytic);
    State.loaded = true;

    updateCacheInfo();
    hideLoading();
    onDataReady();

  } catch (err) {
    console.error('loadData error:', err);
    hideLoading();
    showDataError(err.message);
  }
}

function processData(results, analytic) {
  State.allResults   = results;
  State.analyticData = analytic;

  // Build sorted concurso list
  State.concursosList = Object.keys(results)
    .map(Number)
    .sort((a, b) => b - a);

  State.ultimoConcurso = State.concursosList[0];

  // Build freqMap
  const freq = {};
  for (let i = 1; i <= 25; i++) freq[i] = 0;

  for (const nums of Object.values(results)) {
    for (const n of nums) freq[parseInt(n)]++;
  }
  State.freqMap = freq;

  // sortedNums: [{n, c}] desc by count
  State.sortedNums = Object.entries(freq)
    .map(([k, v]) => ({ n: parseInt(k), c: v }))
    .sort((a, b) => b.c - a.c);
}

function onDataReady() {
  // Update header badge
  const badge = document.getElementById('badge-concurso');
  if (badge) badge.textContent = `Concurso ${State.ultimoConcurso}`;

  // Config page counts
  const cfgTotal  = document.getElementById('cfg-total');
  const cfgUltimo = document.getElementById('cfg-ultimo');
  if (cfgTotal)  cfgTotal.textContent  = State.concursosList.length.toLocaleString('pt-BR');
  if (cfgUltimo) cfgUltimo.textContent = State.ultimoConcurso;

  // Render all modules
  renderDashboard();
  renderHistorico();
  renderEstatisticas();
}

function updateCacheInfo() {
  const el = document.getElementById('cache-info');
  if (!el) return;
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) { el.textContent = 'Sem cache salvo.'; return; }
  try {
    const { ts } = JSON.parse(raw);
    const mins = Math.round((Date.now() - ts) / 60000);
    el.textContent = `Cache atualizado há ${mins < 1 ? 'menos de 1' : mins} minuto${mins !== 1 ? 's' : ''}.
Total em cache: ${State.concursosList.length} concursos.`;
  } catch { el.textContent = 'Cache disponível.'; }
}

function showDataError(msg) {
  const main = document.getElementById('tab-dashboard');
  if (!main) return;
  main.querySelector('#card-ultimo-resultado').innerHTML = `
    <div style="text-align:center;padding:20px;color:var(--text-secondary)">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:600;margin-bottom:8px">Falha ao carregar dados</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${esc(msg)}</div>
      <button class="btn btn-primary" onclick="window.location.reload()">Tentar novamente</button>
    </div>`;
}

/* ═══════════════════════════════════════
   ROUTER — Tab Navigation
   ═══════════════════════════════════════ */
function initRouter() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      navigateTo(tabId);
    });
  });

  // Stats inner tabs
  document.querySelectorAll('.stats-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const stabId = btn.dataset.stab;
      document.querySelectorAll('.stats-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.stab').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const stab = document.getElementById('stab-' + stabId);
      if (stab) stab.classList.add('active');
    });
  });
}

export function navigateTo(tabId) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const section = document.getElementById('tab-' + tabId);
  const btn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);

  if (section) section.classList.add('active');
  if (btn) btn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════
   CONFIG PAGE EVENTS
   ═══════════════════════════════════════ */
function initConfig() {
  document.getElementById('btn-limpar-cache')?.addEventListener('click', () => {
    clearCache();
    toast('Cache limpo! 🗑');
    updateCacheInfo();
  });

  document.getElementById('btn-recarregar')?.addEventListener('click', async () => {
    toast('Recarregando dados…');
    await loadData(true);
    toast('Dados atualizados! ✅');
  });
}

/* ═══════════════════════════════════════
   SERVICE WORKER
   ═══════════════════════════════════════ */
function initSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW error:', err));
  }
}

/* ═══════════════════════════════════════
   BOOT
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  initSW();
  initRouter();
  initConfig();

  // Init module listeners (before data loads)
  initDashboard();
  initResultados();
  initEstatisticas();
  initGerador();
  initIA();

  // Load data
  await loadData();
});
