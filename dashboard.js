/**
 * SHUB LOTO — dashboard.js
 * Home screen: último resultado, estatísticas rápidas, surpresinha
 */

import { State, pad, buildBall, shuffle, toast, navigateTo } from './app.js';

/* ═══════════════════════════════════════
   INIT — bind events
   ═══════════════════════════════════════ */
export function initDashboard() {
  document.getElementById('btn-surpresinha')
    ?.addEventListener('click', gerarSurpresinha);

  document.getElementById('btn-surp-novo')
    ?.addEventListener('click', gerarSurpresinha);

  document.getElementById('btn-ir-ia')
    ?.addEventListener('click', () => navigateTo('ia'));
}

/* ═══════════════════════════════════════
   RENDER
   ═══════════════════════════════════════ */
export function renderDashboard() {
  renderUltimoResultado();
  renderStatCards();
}

/* ── Último Resultado ── */
function renderUltimoResultado() {
  const el = document.getElementById('card-ultimo-resultado');
  const numEl = document.getElementById('dash-ultimo-num');
  if (!el) return;

  const c = State.ultimoConcurso;
  const raw = State.allResults[c];
  if (!raw) return;

  const nums = [...raw].map(Number).sort((a, b) => a - b);
  const soma = nums.reduce((a, b) => a + b, 0);
  const pares = nums.filter(n => n % 2 === 0).length;

  if (numEl) numEl.textContent = `#${c}`;

  el.innerHTML = `
    <div class="balls-row" style="margin-bottom:14px">
      ${nums.map(n => buildBall(n)).join('')}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <span class="tag tag-green">Soma: ${soma}</span>
      <span class="tag tag-blue">${pares} pares</span>
      <span class="tag tag-green">${15 - pares} ímpares</span>
    </div>
  `;
}

/* ── Stat Cards ── */
function renderStatCards() {
  if (!State.sortedNums.length) return;

  const total = State.concursosList.length;
  const hot   = State.sortedNums[0];
  const cold  = State.sortedNums[State.sortedNums.length - 1];

  // Média de soma
  const somas = Object.values(State.allResults)
    .map(nums => nums.reduce((a, b) => a + parseInt(b), 0));
  const mediasSoma = Math.round(somas.reduce((a, b) => a + b, 0) / somas.length);

  document.getElementById('s-total').textContent   = total.toLocaleString('pt-BR');
  document.getElementById('s-hot').textContent     = pad(hot.n);
  document.getElementById('s-cold').textContent    = pad(cold.n);
  document.getElementById('s-media-soma').textContent = mediasSoma;
}

/* ═══════════════════════════════════════
   SURPRESINHA INTELIGENTE
   ═══════════════════════════════════════ */
export function gerarSurpresinha() {
  if (!State.loaded) { toast('Aguarde os dados carregarem…'); return; }

  const hot   = State.sortedNums.slice(0, 12).map(d => d.n);
  const mid   = State.sortedNums.slice(12, 20).map(d => d.n);
  const cold  = State.sortedNums.slice(-5).map(d => d.n);

  let nums = null;
  let tentativas = 0;

  while (tentativas++ < 300) {
    const h = shuffle(hot).slice(0, 8);
    const m = shuffle(mid).slice(0, 5);
    const c = shuffle(cold).slice(0, 2);
    const candidate = [...h, ...m, ...c].sort((a, b) => a - b);

    const soma  = candidate.reduce((a, b) => a + b, 0);
    const pares = candidate.filter(n => n % 2 === 0).length;

    if (soma >= 179 && soma <= 220 && pares >= 6 && pares <= 9) {
      nums = candidate;
      break;
    }
  }

  if (!nums) { toast('Tente novamente'); return; }

  const soma  = nums.reduce((a, b) => a + b, 0);
  const pares = nums.filter(n => n % 2 === 0).length;

  const box   = document.getElementById('surpresinha-box');
  const balls = document.getElementById('surp-balls');
  const meta  = document.getElementById('surp-meta');

  if (balls) balls.innerHTML = nums.map(n => buildBall(n)).join('');
  if (meta)  meta.textContent = `Soma: ${soma} · Pares: ${pares} · Ímpares: ${15 - pares}`;
  if (box)   box.classList.remove('hidden');

  toast('Surpresinha gerada! 🍀');
}
