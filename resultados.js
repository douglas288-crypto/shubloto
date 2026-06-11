/**
 * SHUB LOTO — resultados.js
 * Busca de concursos, histórico paginado, navegação prev/next
 */

import { State, pad, buildDezenas, toast } from './app.js';

const PAGE_SIZE = 20;
let currentPage = 1;
let currentConcurso = null;

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
export function initResultados() {
  document.getElementById('btn-buscar')
    ?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('input-busca')?.value);
      if (val) mostrarDetalhe(val);
      else toast('Digite o número do concurso');
    });

  document.getElementById('input-busca')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-buscar')?.click();
    });

  document.getElementById('btn-ultimo')
    ?.addEventListener('click', () => mostrarDetalhe(State.ultimoConcurso));

  document.getElementById('btn-anterior')
    ?.addEventListener('click', () => {
      if (currentConcurso > 1) mostrarDetalhe(currentConcurso - 1);
    });

  document.getElementById('btn-proximo')
    ?.addEventListener('click', () => {
      if (currentConcurso < State.ultimoConcurso) mostrarDetalhe(currentConcurso + 1);
    });
}

/* ═══════════════════════════════════════
   RENDER HISTÓRICO (paginado)
   ═══════════════════════════════════════ */
export function renderHistorico(page = 1) {
  currentPage = page;
  const lista = document.getElementById('historico-lista');
  const pagEl = document.getElementById('pagination');
  const infoEl = document.getElementById('pag-info');
  if (!lista) return;

  const all    = State.concursosList;
  const total  = all.length;
  const pages  = Math.ceil(total / PAGE_SIZE);
  const start  = (page - 1) * PAGE_SIZE;
  const slice  = all.slice(start, start + PAGE_SIZE);

  if (infoEl) {
    infoEl.textContent = `${start + 1}–${Math.min(start + PAGE_SIZE, total)} de ${total.toLocaleString('pt-BR')}`;
  }

  lista.innerHTML = slice.map(c => {
    const nums = [...State.allResults[c]].map(Number).sort((a, b) => a - b);
    const soma = nums.reduce((a, b) => a + b, 0);
    return `
      <div class="result-item" data-concurso="${c}">
        <div class="result-meta">
          <span>Concurso <strong>${c}</strong></span>
          <span>Soma: ${soma}</span>
        </div>
        <div class="dezenas">${buildDezenas(nums)}</div>
      </div>`;
  }).join('');

  // Click on item → show detail
  lista.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      mostrarDetalhe(parseInt(item.dataset.concurso));
      document.getElementById('resultado-detalhe')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Pagination buttons
  if (pagEl) renderPagination(pagEl, page, pages);
}

function renderPagination(el, current, total) {
  if (total <= 1) { el.innerHTML = ''; return; }

  const maxVisible = 5;
  let start = Math.max(1, current - 2);
  let end   = Math.min(total, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  let html = '';
  if (start > 1) {
    html += pageBtn(1, current, '1');
    if (start > 2) html += `<span style="color:var(--text-muted);align-self:center">…</span>`;
  }
  for (let p = start; p <= end; p++) html += pageBtn(p, current, String(p));
  if (end < total) {
    if (end < total - 1) html += `<span style="color:var(--text-muted);align-self:center">…</span>`;
    html += pageBtn(total, current, String(total));
  }

  el.innerHTML = html;
  el.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => renderHistorico(parseInt(btn.dataset.page)));
  });
}

function pageBtn(p, current, label) {
  return `<button class="page-btn ${p === current ? 'active' : ''}" data-page="${p}">${label}</button>`;
}

/* ═══════════════════════════════════════
   MOSTRAR DETALHE
   ═══════════════════════════════════════ */
export function mostrarDetalhe(concurso) {
  const raw = State.allResults[concurso];
  if (!raw) { toast(`Concurso ${concurso} não encontrado`); return; }

  currentConcurso = concurso;
  const nums    = [...raw].map(Number).sort((a, b) => a - b);
  const rawOrig = [...raw].map(Number); // ordem do sorteio
  const soma    = nums.reduce((a, b) => a + b, 0);
  const pares   = nums.filter(n => n % 2 === 0).length;

  const hasPrev = !!State.allResults[concurso - 1];
  const hasNext = !!State.allResults[concurso + 1];

  const el = document.getElementById('resultado-detalhe');
  if (!el) return;

  el.innerHTML = `
    <div class="resultado-card">
      <div class="resultado-meta">
        <span>Concurso <strong style="color:var(--brand-primary-light)">${concurso}</strong></span>
        <div style="display:flex;gap:8px">
          ${hasPrev ? `<button class="btn btn-ghost btn-sm" id="det-prev">← ${concurso - 1}</button>` : ''}
          ${hasNext ? `<button class="btn btn-ghost btn-sm" id="det-next">${concurso + 1} →</button>` : ''}
        </div>
      </div>

      <div class="ordem-label">Ordem crescente:</div>
      <div class="dezenas" style="margin-bottom:14px">
        ${buildDezenas(nums)}
      </div>

      <div class="ordem-label">Ordem do sorteio:</div>
      <div class="dezenas" style="margin-bottom:14px">
        ${buildDezenas(rawOrig)}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <span class="tag tag-green">Soma: ${soma}</span>
        <span class="tag tag-blue">${pares} pares</span>
        <span class="tag tag-green">${15 - pares} ímpares</span>
        ${soma >= 179 && soma <= 220
          ? '<span class="tag tag-green">Soma ideal ✅</span>'
          : '<span class="tag tag-red">Soma fora do padrão</span>'}
      </div>
    </div>
  `;

  document.getElementById('det-prev')?.addEventListener('click', () => mostrarDetalhe(concurso - 1));
  document.getElementById('det-next')?.addEventListener('click', () => mostrarDetalhe(concurso + 1));

  // Sync input
  const input = document.getElementById('input-busca');
  if (input) input.value = concurso;
}
