# 🍀 SHUB LOTO — v2.0.0

Análise inteligente da Lotofácil com IA (Claude), dados reais e PWA completo.

---

## 📁 Estrutura do Projeto

```
shubloto/
├── index.html              # Shell HTML principal
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (cache + offline)
│
├── css/
│   └── styles.css          # Design system completo (tokens, componentes, responsivo)
│
├── js/
│   ├── app.js              # Entry point: state, router, data loading, utilitários
│   ├── dashboard.js        # Tela inicial: último resultado, stats, surpresinha
│   ├── resultados.js       # Busca, histórico paginado, navegação prev/next
│   ├── estatisticas.js     # Frequência, padrões, pares/ímpares, atraso
│   ├── gerador.js          # Volante interativo, análise, score, tabelas
│   └── ia.js               # Assistente IA com Claude (Anthropic)
│
├── data/                   # (reservado para cache local futuro / Supabase sync)
│
└── assets/                 # Ícones PWA (icon-192.png, icon-512.png)
    ├── icon-192.png
    └── icon-512.png
```

---

## 🚀 Como usar

### 1. Subir no GitHub Pages
```bash
git clone https://github.com/douglas288-crypto/shubloto.git
cd shubloto
# Substitua os arquivos pelos da v2
git add .
git commit -m "feat: arquitetura v2 - modular, PWA completo"
git push
```

### 2. Ativar GitHub Pages
- Settings → Pages → Branch: main → Save
- URL: `https://douglas288-crypto.github.io/shubloto/`

### 3. Configurar IA
- Acesse [console.anthropic.com](https://console.anthropic.com)
- Crie uma API Key
- No app, aba IA → cole a chave → Salvar

---

## 📊 Fonte de Dados

| Dado | Fonte | Atualização |
|------|-------|-------------|
| Resultados (3200+) | `guilhermeasn/loteria.json` | Diária (GitHub Actions) |
| Dados analíticos | `guilhermeasn/loteria.json` | Diária |
| IA | Claude Sonnet (Anthropic) | Real-time |

---

## 🗄️ Integração Supabase (Futura)

Para habilitar persistência de apostas e histórico pessoal:

### 1. Criar projeto em supabase.com

### 2. Criar tabelas
```sql
-- Apostas salvas pelo usuário
CREATE TABLE apostas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  numeros integer[] NOT NULL,
  concurso_alvo integer,
  soma integer,
  pares integer,
  score integer,
  created_at timestamptz DEFAULT now()
);

-- Resultados checados
CREATE TABLE checagens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  aposta_id uuid REFERENCES apostas,
  concurso integer NOT NULL,
  acertos integer,
  premio boolean DEFAULT false,
  checked_at timestamptz DEFAULT now()
);
```

### 3. Adicionar SDK no app.js
```js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabase = createClient(
  'https://SEU_PROJETO.supabase.co',
  'SUA_ANON_KEY'
);
```

### 4. Salvar aposta
```js
await supabase.from('apostas').insert({
  numeros: [1, 3, 5, 7, ...],
  concurso_alvo: 3201,
  soma: 195,
  pares: 7,
  score: 85
});
```

---

## 🧩 Componentes Reutilizáveis

| Função | Módulo | Uso |
|--------|--------|-----|
| `buildBall(n, cls)` | app.js | Renderiza bolinha numerada |
| `buildDezenas(nums, matchSet)` | app.js | Linha de dezenas com highlight |
| `toast(msg)` | app.js | Notificação temporária |
| `shuffle(arr)` | app.js | Embaralha array |
| `formatCurrency(val)` | app.js | Formata valor em BRL |
| `navigateTo(tabId)` | app.js | Navega entre telas |
| `gerarSurpresinha()` | dashboard.js | Gera 15 números balanceados |

---

## 📱 PWA — Funcionalidades

- ✅ Instalável (Add to Home Screen)
- ✅ Funciona offline (assets em cache)
- ✅ Tema escuro nativo
- ✅ Ícones e splash screen
- ✅ Shortcuts na tela inicial
- ✅ Cache inteligente (4h TTL para dados)

---

## 🔮 Roadmap

- [ ] Integração Supabase (apostas salvas, histórico pessoal)
- [ ] Notificações push (novo resultado disponível)
- [ ] Modo bolão (dividir apostas entre participantes)
- [ ] Histórico de apostas vs resultados (taxa de acerto pessoal)
- [ ] Gráficos de tendência temporal
- [ ] Modo "Matrix" (comparar múltiplos sorteios lado a lado)
- [ ] Export PDF de apostas
