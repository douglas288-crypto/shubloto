/**
 * SHUB LOTO — estatisticas.js
 * Frequência, padrões, pares/ímpares, atraso (números atrasados)
 */

import { State, pad } from './app.js';

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
export function initEstatisticas() {
  // Inner tab switching is handled by app.js router
}

/* ═══════════════════════════════════════
   RENDER ALL
   ═══════════════════════════════════════ */
export function renderEstatisticas() {
  renderFrequencia();
  renderPadroes();
  renderParesImpares();
  renderAtraso();
}

/* ═══════════════════════════════════════
   FREQUÊNCIA
   ═══════════════════════════════════════ */
function renderFrequencia() {
  const sorted = State.sortedNums;
  if (!sorted.length) return;
  const max = sorted[0].c;

  // Hot bars (top 10)
  const hotEl = document.getElementById('hot-bars');
  if (hotEl) {
    hotEl.innerHTML = sorted.slice(0, 10).map(d => barRow(d, max, 'hot')).join('');
  }

  // Cold bars (bottom 10)
  const coldEl = document.getElementById('cold-bars');
  if (coldEl) {
    coldEl.innerHTML = [...sorted].reverse().slice(0, 10).map(d => barRow(d, max, 'cold')).join('');
  }

  // Freq grid (all 25)
  const gridEl = document.getElementById('freq-grid');
  if (gridEl) {
    const hotSet  = new Set(sorted.slice(0, 8).map(d => d.n));
    const coldSet = new Set(sorted.slice(-8).map(d => d.n));
    const byNum   = [...sorted].sort((a, b) => a.n - b.n);

    gridEl.innerHTML = byNum.map(d => {
      const pct = Math.round((d.c / max) * 100);
      const col = hotSet.has(d.n)
        ? 'var(--color-hot-light)'
        : coldSet.has(d.n)
          ? 'var(--color-cold-light)'
          : 'var(--brand-primary-light)';

      return `<div class="freq-cell">
        <div class="freq-num" style="color:${col}">${pad(d.n)}</div>
        <div class="freq-bar progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${col}"></div>
        </div>
        <div class="freq-count">${d.c}x</div>
      </div>`;
    }).join('');
  }
}

function barRow(d, max, type) {
  const pct = Math.round((d.c / max) * 100);
  return `<div class="bar-row">
    <div class="bar-num">${pad(d.n)}</div>
    <div class="bar-bg">
      <div class="bar-fill ${type}" style="width:${pct}%">${d.c}x</div>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════
   PADRÕES
   ═══════════════════════════════════════ */
function renderPadroes() {
  const el = document.getElementById('padroes-content');
  if (!el) return;

  const concursos = Object.values(State.allResults);
  const total = concursos.length;

  // Somas
  const somas = concursos.map(nums => nums.reduce((a, b) => a + parseInt(b), 0));
  const somaMedia = Math.round(somas.reduce((a, b) => a + b, 0) / total);
  const somaMin   = Math.min(...somas);
  const somaMax   = Math.max(...somas);

  // Distribuição de somas (faixas)
  const faixas = { '<170': 0, '170-178': 0, '179-220': 0, '221-230': 0, '>230': 0 };
  for (const s of somas) {
    if (s < 170)       faixas['<170']++;
    else if (s < 179)  faixas['170-178']++;
    else if (s <= 220) faixas['179-220']++;
    else if (s <= 230) faixas['221-230']++;
    else               faixas['>230']++;
  }
  const faixaIdealPct = Math.round((faixas['179-220'] / total) * 100);

  // Sequências consecutivas
  const seqCounts = {};
  for (const nums of concursos) {
    const sorted = [...nums].map(Number).sort((a, b) => a - b);
    let maxSeq = 1, cur = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) { cur++; maxSeq = Math.max(maxSeq, cur); }
      else cur = 1;
    }
    seqCounts[maxSeq] = (seqCounts[maxSeq] || 0) + 1;
  }
  const topSeq = Object.entries(seqCounts).sort((a, b) => b[1] - a[1])[0];

  // Primos
  const primos = [2,3,5,7,11,13,17,19,23];
  const primosCounts = {};
  for (const nums of concursos) {
    const p = nums.filter(n => primos.includes(parseInt(n))).length;
    primosCounts[p] = (primosCounts[p] || 0) + 1;
  }
  const topPrimo = Object.entries(primosCounts).sort((a, b) => b[1] - a[1])[0];

  el.innerHTML = `
    <div class="card">
      <div class="pattern-card">
        <div class="pattern-title">🔢 Distribuição de Somas</div>
        <div class="pattern-desc">
          Média histórica: <span class="tag tag-gold">${somaMedia}</span>
          Mínimo: <strong>${somaMin}</strong> · Máximo: <strong>${somaMax}</strong><br><br>
          <strong style="color:var(--brand-primary-light)">${faixaIdealPct}%</strong> dos concursos
          tiveram soma entre 179 e 220 (faixa ideal).<br>
          Aposte sempre com soma nessa faixa.
        </div>
        <div style="margin-top:10px">
          ${Object.entries(faixas).map(([k, v]) => {
            const pct = Math.round((v / total) * 100);
            const isIdeal = k === '179-220';
            return `<div class="bar-row" style="margin-bottom:6px">
              <div style="width:68px;font-size:11px;color:var(--text-muted)">${k}</div>
              <div class="bar-bg">
                <div class="bar-fill ${isIdeal ? 'mid' : 'cold'}" style="width:${pct}%">${pct}%</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="pattern-card">
        <div class="pattern-title">🔗 Sequências Consecutivas</div>
        <div class="pattern-desc">
          Sequência mais comum nos sorteios: <span class="tag tag-green">${topSeq[0]} números seguidos</span>
          (ocorre em ${Math.round((topSeq[1] / total) * 100)}% dos concursos).<br><br>
          Incluir 2–4 números consecutivos é comum e saudável em uma aposta.
        </div>
      </div>

      <div class="pattern-card">
        <div class="pattern-title">🔵 Números Primos</div>
        <div class="pattern-desc">
          Primos disponíveis: 02, 03, 05, 07, 11, 13, 17, 19, 23.<br>
          O sorteio mais comum inclui <span class="tag tag-blue">${topPrimo[0]} números primos</span>
          (${Math.round((parseInt(topPrimo[1]) / total) * 100)}% dos concursos).<br><br>
          Inclua 4–6 primos em sua aposta.
        </div>
      </div>

      <div class="pattern-card">
        <div class="pattern-title">📐 Receita da Aposta Ideal</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          <span class="tag tag-green">Soma 179–220</span>
          <span class="tag tag-blue">7–8 pares</span>
          <span class="tag tag-green">7–8 ímpares</span>
          <span class="tag tag-gold">5 colunas cobertas</span>
          <span class="tag tag-blue">4–6 primos</span>
          <span class="tag tag-green">2–4 consecutivos</span>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════
   PARES / ÍMPARES
   ═══════════════════════════════════════ */
function renderParesImpares() {
  const el = document.getElementById('pares-content');
  if (!el) return;

  const concursos = Object.values(State.allResults);
  const total = concursos.length;

  const dist = {};
  for (const nums of concursos) {
    const p = nums.filter(n => parseInt(n) % 2 === 0).length;
    dist[p] = (dist[p] || 0) + 1;
  }

  const sorted = Object.entries(dist)
    .map(([k, v]) => ({ pares: parseInt(k), impares: 15 - parseInt(k), count: v }))
    .sort((a, b) => b.count - a.count);

  const maxCount = sorted[0].count;

  el.innerHTML = `
    <div class="card">
      <h3 class="card-title">⚖️ Distribuição Pares × Ímpares</h3>
      <p class="card-desc">Baseado em ${total.toLocaleString('pt-BR')} concursos analisados.</p>
      ${sorted.map(d => {
        const pct = Math.round((d.count / total) * 100);
        const barPct = Math.round((d.count / maxCount) * 100);
        const isIdeal = d.pares >= 6 && d.pares <= 9;
        return `<div class="bar-row">
          <div style="width:80px;font-size:12px;color:${isIdeal ? 'var(--brand-primary-light)' : 'var(--text-muted)'}">
            ${d.pares}P / ${d.impares}I
          </div>
          <div class="bar-bg">
            <div class="bar-fill ${isIdeal ? 'mid' : 'cold'}" style="width:${barPct}%">
              ${d.count}x (${pct}%)
            </div>
          </div>
        </div>`;
      }).join('')}
      <div class="warn-box" style="margin-top:14px">
        💡 Distribuições com 6–9 pares representam
        <strong>${Math.round(sorted.filter(d => d.pares >= 6 && d.pares <= 9)
          .reduce((a, d) => a + d.count, 0) / total * 100)}%</strong> dos sorteios.
        Mantenha sua aposta nessa faixa.
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════
   ATRASO (números atrasados)
   ═══════════════════════════════════════ */
function renderAtraso() {
  const el = document.getElementById('atraso-content');
  if (!el) return;

  // Para cada número, encontrar o último concurso em que saiu
  const ultimaAparicao = {};
  for (let i = 1; i <= 25; i++) ultimaAparicao[i] = 0;

  for (const [concurso, nums] of Object.entries(State.allResults)) {
    for (const n of nums) {
      const num = parseInt(n);
      if (parseInt(concurso) > (ultimaAparicao[num] || 0)) {
        ultimaAparicao[num] = parseInt(concurso);
      }
    }
  }

  const ultimo = State.ultimoConcurso;
  const atrasos = Object.entries(ultimaAparicao)
    .map(([n, ult]) => ({
      n: parseInt(n),
      atraso: ultimo - ult,
      ultimo: ult
    }))
    .sort((a, b) => b.atraso - a.atraso);

  const maxAtraso = atrasos[0].atraso;

  el.innerHTML = `
    <div class="card">
      <h3 class="card-title">⏳ Números mais atrasados</h3>
      <p class="card-desc">
        Concursos desde a última aparição de cada número.
        Referência: concurso ${ultimo}.
      </p>
      ${atrasos.map(d => {
        const pct = Math.round((d.atraso / maxAtraso) * 100);
        const cor = d.atraso > 10
          ? 'var(--color-hot-light)'
          : d.atraso > 5
            ? 'var(--accent-gold-light)'
            : 'var(--brand-primary-light)';
        const label = d.atraso > 10 ? 'Muito atrasado' : d.atraso > 5 ? 'Atrasado' : 'Recente';

        return `<div class="atraso-row">
          <div class="atraso-ball" style="background:${cor}">${pad(d.n)}</div>
          <div class="atraso-info">
            <div class="atraso-name">Número ${pad(d.n)}</div>
            <div class="atraso-sub">Último sorteio: concurso ${d.ultimo}</div>
          </div>
          <span class="atraso-badge" style="background:${cor}22;color:${cor}">
            ${d.atraso} concurso${d.atraso !== 1 ? 's' : ''}
          </span>
        </div>`;
      }).join('')}
    </div>
  `;
}
