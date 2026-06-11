/**
 * SHUB LOTO — gerador.js
 * Volante interativo, análise de apostas, score, tabelas
 */

import { State, pad, buildDezenas, shuffle, toast, CUSTOS, formatCurrency } from './app.js';

let selected = new Set();

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
export function initGerador() {
  document.getElementById('btn-limpar')
    ?.addEventListener('click', limparVolante);

  document.getElementById('btn-analisar')
    ?.addEventListener('click', analisarAposta);

  document.getElementById('btn-surpresinha-vol')
    ?.addEventListener('click', autoPreencherVolante);

  renderCustoTable();
}

/* ═══════════════════════════════════════
   RENDER VOLANTE
   ═══════════════════════════════════════ */
export function renderVolante() {
  const vol = document.getElementById('volante');
  if (!vol) return;

  const hotSet  = new Set(State.sortedNums.slice(0, 8).map(d => d.n));
  const coldSet = new Set(State.sortedNums.slice(-8).map(d => d.n));

  vol.innerHTML = '';
  for (let i = 1; i <= 25; i++) {
    const cls = hotSet.has(i) ? 'hot' : coldSet.has(i) ? 'cold' : '';
    const btn = document.createElement('div');
    btn.className = `ball ${cls}`;
    btn.textContent = pad(i);
    btn.dataset.n = i;
    btn.addEventListener('click', () => toggleBall(i, btn));
    vol.appendChild(btn);
  }
}

function toggleBall(n, el) {
  if (selected.has(n)) {
    selected.delete(n);
    el.classList.remove('selected');
  } else {
    if (selected.size >= 20) { toast('Máximo de 20 números'); return; }
    selected.add(n);
    el.classList.add('selected');
  }
  updateApostaInfo();
}

function updateApostaInfo() {
  const cnt = selected.size;
  const cntEl   = document.getElementById('sel-num');
  const custoEl = document.getElementById('sel-custo');
  const badge   = document.getElementById('gen-count');

  if (cntEl)   cntEl.textContent   = cnt;
  if (custoEl) custoEl.textContent = cnt >= 15 ? formatCurrency(CUSTOS[cnt] || 0) : '—';
  if (badge)   badge.textContent   = `${cnt}/15`;
}

function limparVolante() {
  selected.clear();
  document.querySelectorAll('#volante .ball.selected')
    .forEach(b => b.classList.remove('selected'));
  updateApostaInfo();
  document.getElementById('analise-box')?.classList.add('hidden');
}

/* ═══════════════════════════════════════
   AUTO-PREENCHER (surpresinha no volante)
   ═══════════════════════════════════════ */
function autoPreencherVolante() {
  if (!State.loaded) { toast('Aguarde os dados carregarem…'); return; }

  const hot  = State.sortedNums.slice(0, 12).map(d => d.n);
  const mid  = State.sortedNums.slice(12, 20).map(d => d.n);
  const cold = State.sortedNums.slice(-5).map(d => d.n);

  let nums = null;
  let t = 0;
  while (t++ < 300) {
    const candidate = [
      ...shuffle(hot).slice(0, 8),
      ...shuffle(mid).slice(0, 5),
      ...shuffle(cold).slice(0, 2),
    ];
    const soma  = candidate.reduce((a, b) => a + b, 0);
    const pares = candidate.filter(n => n % 2 === 0).length;
    if (soma >= 179 && soma <= 220 && pares >= 6 && pares <= 9) {
      nums = candidate;
      break;
    }
  }
  if (!nums) { toast('Tente novamente'); return; }

  // Clear and set
  limparVolante();
  for (const n of nums) {
    selected.add(n);
    const el = document.querySelector(`#volante .ball[data-n="${n}"]`);
    if (el) el.classList.add('selected');
  }
  updateApostaInfo();
  toast('Volante preenchido automaticamente! 🍀');
}

/* ═══════════════════════════════════════
   ANALISAR APOSTA
   ═══════════════════════════════════════ */
function analisarAposta() {
  if (selected.size < 15) { toast('Selecione pelo menos 15 números'); return; }

  const nums  = [...selected].sort((a, b) => a - b);
  const soma  = nums.reduce((a, b) => a + b, 0);
  const pares = nums.filter(n => n % 2 === 0).length;
  const imp   = nums.length - pares;

  const hotSet  = new Set(State.sortedNums.slice(0, 8).map(d => d.n));
  const coldSet = new Set(State.sortedNums.slice(-8).map(d => d.n));
  const nHot    = nums.filter(n => hotSet.has(n)).length;
  const nCold   = nums.filter(n => coldSet.has(n)).length;

  // Colunas cobertas (1-5, 6-10, 11-15, 16-20, 21-25)
  const cols = new Set(nums.map(n => Math.ceil(n / 5)));

  // Primos
  const primos = [2, 3, 5, 7, 11, 13, 17, 19, 23];
  const nPrimo = nums.filter(n => primos.includes(n)).length;

  // Score
  const somaOk  = soma >= 179 && soma <= 220;
  const parOk   = pares >= 6 && pares <= 9;
  const colOk   = cols.size >= 4;
  const primoOk = nPrimo >= 4 && nPrimo <= 7;

  let score = 0;
  if (somaOk)  score += 30;
  if (parOk)   score += 25;
  if (colOk)   score += 20;
  if (primoOk) score += 15;
  score += Math.min(nCold * 2, 10);
  score = Math.min(score, 100);

  const cor = score > 70
    ? 'var(--brand-primary-light)'
    : score > 40
      ? 'var(--accent-gold-light)'
      : 'var(--color-hot-light)';

  const box = document.getElementById('analise-box');
  const content = document.getElementById('analise-content');

  content.innerHTML = `
    <div class="dezenas" style="margin-bottom:16px">
      ${buildDezenas(nums)}
    </div>

    <div style="display:flex;flex-direction:column;gap:0">
      ${row('Soma total', soma,
        somaOk
          ? `<span style="color:var(--brand-primary-light)">${soma} ✅ ideal</span>`
          : `<span style="color:var(--color-hot-light)">${soma} ⚠️ fora do ideal (179–220)</span>`
      )}
      ${row('Pares / Ímpares', '',
        `<span style="color:${parOk ? 'var(--brand-primary-light)' : 'var(--accent-gold-light)'}">
          ${pares} pares / ${imp} ímpares ${parOk ? '✅' : '⚠️'}
        </span>`
      )}
      ${row('Colunas cobertas', '',
        `<span style="color:${colOk ? 'var(--brand-primary-light)' : 'var(--accent-gold-light)'}">
          ${cols.size}/5 ${colOk ? '✅' : '⚠️ cubra mais colunas'}
        </span>`
      )}
      ${row('Números primos', '',
        `<span style="color:${primoOk ? 'var(--brand-primary-light)' : 'var(--text-secondary)'}">
          ${nPrimo} primos ${primoOk ? '✅' : '(ideal: 4–7)'}
        </span>`
      )}
      ${row('Números quentes', '', `<span style="color:var(--color-hot-light)">${nHot} 🔥</span>`)}
      ${row('Números frios',   '', `<span style="color:var(--color-cold-light)">${nCold} ❄️</span>`)}
      ${row('Custo da aposta', '', `<span style="color:var(--accent-gold-light)">${formatCurrency(CUSTOS[nums.length] || 0)}</span>`)}
    </div>

    <div class="score-box">
      <div class="score-label">Score estatístico</div>
      <div class="score-value" style="color:${cor}">${score}<small style="font-size:22px">/100</small></div>
      <div class="progress-bar" style="margin-top:10px">
        <div class="progress-fill" style="width:${score}%;background:${cor}"></div>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:10px">
        ${score > 70
          ? '🎉 Aposta bem balanceada!'
          : score > 40
            ? '⚠️ Aposta razoável. Ajuste os pontos sinalizados.'
            : '❌ Considere rebalancear os números.'}
      </div>
    </div>
  `;

  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth' });
}

function row(label, val, htmlVal) {
  return `<div class="info-row">
    <span style="color:var(--text-secondary)">${label}</span>
    ${htmlVal || `<span>${val}</span>`}
  </div>`;
}

/* ═══════════════════════════════════════
   CUSTO TABLE
   ═══════════════════════════════════════ */
function renderCustoTable() {
  const el = document.getElementById('custo-table');
  if (!el) return;

  const featured = 16; // destaque no melhor custo-benefício
  el.innerHTML = Object.entries(CUSTOS).map(([n, v]) => `
    <div class="custo-row ${parseInt(n) === featured ? 'featured' : ''}">
      <span>${n} números ${parseInt(n) === featured ? '⭐' : ''}</span>
      <span>${formatCurrency(v)}</span>
      <span style="font-size:11px;color:var(--text-muted)">
        ${parseInt(n) === featured ? 'Melhor custo-benefício' : ''}
      </span>
    </div>`
  ).join('');
}
