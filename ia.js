/**
 * SHUB LOTO — ia.js
 * Assistente IA com Claude (Anthropic) — contexto com dados reais
 */

import { State, pad, toast, esc, loadingDots } from './app.js';

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
export function initIA() {
  // Salvar chave
  document.getElementById('btn-salvar-chave')
    ?.addEventListener('click', salvarChave);

  // Chips de sugestão
  document.querySelectorAll('#chips-ia .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#chips-ia .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const ta = document.getElementById('prompt-ia');
      if (ta) ta.value = chip.dataset.prompt;
    });
  });

  // Botão perguntar
  document.getElementById('btn-perguntar')
    ?.addEventListener('click', perguntarIA);

  // Enter no textarea (Ctrl+Enter)
  document.getElementById('prompt-ia')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        perguntarIA();
      }
    });

  // Init key display
  initChave();
}

/* ═══════════════════════════════════════
   CHAVE API
   ═══════════════════════════════════════ */
function salvarChave() {
  const input = document.getElementById('key-input');
  const key   = input?.value.trim() || '';

  if (!key.startsWith('sk-ant-')) {
    setKeyStatus('❌ Chave inválida. Deve começar com sk-ant-', 'error');
    return;
  }

  localStorage.setItem('anthropic_key', key);
  setKeyStatus('✅ Chave salva! IA pronta para uso.', 'success');
  if (input) input.value = '••••••••••••' + key.slice(-6);
  toast('Chave salva! 🔑');
}

function initChave() {
  const saved = localStorage.getItem('anthropic_key');
  if (!saved) return;
  const input = document.getElementById('key-input');
  if (input) input.value = '••••••••••••' + saved.slice(-6);
  setKeyStatus('✅ Chave configurada — IA pronta!', 'success');
}

function setKeyStatus(msg, type) {
  const el = document.getElementById('key-status');
  if (!el) return;
  const color = type === 'success'
    ? 'var(--brand-primary-light)'
    : type === 'error'
      ? 'var(--color-hot-light)'
      : 'var(--text-muted)';
  el.innerHTML = `<span style="color:${color}">${msg}</span>`;
}

/* ═══════════════════════════════════════
   PERGUNTAR À IA
   ═══════════════════════════════════════ */
async function perguntarIA() {
  const prompt = document.getElementById('prompt-ia')?.value.trim();
  if (!prompt) { toast('Digite uma pergunta'); return; }

  const apiKey = localStorage.getItem('anthropic_key');
  if (!apiKey) {
    toast('Configure sua chave da API primeiro 🔑');
    document.getElementById('card-apikey')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const el = document.getElementById('ia-resposta');
  if (!el) return;

  el.innerHTML = `<div class="ai-box">
    <div class="ai-header">🤖 Analisando dados de ${State.concursosList.length} concursos…</div>
    ${loadingDots()}
  </div>`;

  const systemPrompt = buildSystemPrompt();

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await resp.json();

    if (data.error) {
      el.innerHTML = errorBox(data.error.message || 'Erro desconhecido');
      return;
    }

    const text = data.content?.map(c => c.text || '').join('') || 'Sem resposta.';
    el.innerHTML = `<div class="ai-box">
      <div class="ai-header">
        🤖 Análise baseada em ${State.concursosList.length.toLocaleString('pt-BR')} concursos reais
      </div>
      <div class="ai-resp">${esc(text)}</div>
    </div>`;

  } catch (err) {
    el.innerHTML = errorBox('Erro de conexão. Verifique a internet e sua chave da API.');
  }
}

/* ═══════════════════════════════════════
   BUILD SYSTEM PROMPT com dados reais
   ═══════════════════════════════════════ */
function buildSystemPrompt() {
  const total   = State.concursosList.length;
  const ultimo  = State.ultimoConcurso;
  const sorted  = State.sortedNums;

  const top10   = sorted.slice(0, 10).map(d => `${pad(d.n)}(${d.c}x)`).join(', ');
  const bot10   = [...sorted].reverse().slice(0, 10).map(d => `${pad(d.n)}(${d.c}x)`).join(', ');

  // Últimos 5 resultados
  const ult5 = State.concursosList.slice(0, 5).map(c => {
    const nums = [...State.allResults[c]].map(Number).sort((a, b) => a - b);
    return `  Concurso ${c}: [${nums.map(pad).join(', ')}]`;
  }).join('\n');

  // Média de soma
  const somas = Object.values(State.allResults)
    .map(nums => nums.reduce((a, b) => a + parseInt(b), 0));
  const somaMedia = Math.round(somas.reduce((a, b) => a + b, 0) / somas.length);

  // Distribuição pares
  const pareDist = {};
  for (const nums of Object.values(State.allResults)) {
    const p = nums.filter(n => parseInt(n) % 2 === 0).length;
    pareDist[p] = (pareDist[p] || 0) + 1;
  }
  const maisComumPares = Object.entries(pareDist)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Atraso atual top 5
  const ultimaAp = {};
  for (let i = 1; i <= 25; i++) ultimaAp[i] = 0;
  for (const [c, nums] of Object.entries(State.allResults)) {
    for (const n of nums) {
      const num = parseInt(n);
      if (parseInt(c) > ultimaAp[num]) ultimaAp[num] = parseInt(c);
    }
  }
  const atrasados = Object.entries(ultimaAp)
    .map(([n, u]) => ({ n: parseInt(n), atraso: ultimo - u }))
    .sort((a, b) => b.atraso - a.atraso)
    .slice(0, 5)
    .map(d => `${pad(d.n)}(${d.atraso} concursos sem sair)`)
    .join(', ');

  return `Você é um especialista em análise estatística da Lotofácil, loteria oficial da CAIXA Econômica Federal do Brasil.

═══ DADOS REAIS ATUALIZADOS ═══
Total de concursos analisados: ${total.toLocaleString('pt-BR')}
Último concurso: ${ultimo}

TOP 10 NÚMEROS MAIS FREQUENTES: ${top10}
TOP 10 NÚMEROS MENOS FREQUENTES: ${bot10}

ÚLTIMOS 5 RESULTADOS:
${ult5}

ESTATÍSTICAS GERAIS:
- Soma média dos 15 números: ${somaMedia}
- Faixa de soma ideal: 179 a 220
- Distribuição de pares mais comum: ${maisComumPares} pares por sorteio
- Números mais atrasados: ${atrasados}

REGRAS DA LOTOFÁCIL:
- São sorteados 15 números de 1 a 25
- O apostador pode marcar de 15 a 20 números
- Premiação: 11, 12, 13, 14 ou 15 acertos
- Sorteios: segunda a sábado
- Custo mínimo (15 números): R$ 3,50

═══ INSTRUÇÕES ═══
- Responda sempre em português do Brasil
- Seja prático e direto
- Ao sugerir apostas, liste os números explicitamente em ordem crescente, ex: [01, 03, 07...]
- Sempre mencione soma, pares/ímpares e custo ao sugerir apostas
- Lembre que loteria é aleatória e nenhuma estratégia garante ganhos
- Use os dados reais acima para embasar suas respostas`;
}

function errorBox(msg) {
  return `<div class="ai-box">
    <div class="ai-header">⚠️ Erro</div>
    <div class="ai-resp" style="color:var(--color-hot-light)">${esc(msg)}</div>
  </div>`;
}
