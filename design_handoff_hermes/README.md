# Handoff: Reorganização do painel Hermes — CAT Sertão

## Overview
Redesign do painel interno `hermes.html` (aquinogr89/catsertao), um "Painel de Conhecimento" do agente Hermes para o CAT Sertão / CBMPE. O painel atual expõe informação demais de uma vez, sem hierarquia, com caminhos de arquivo/scripts/IDs à mostra. Este handoff reorganiza tudo numa casca navegável (sidebar + faixa de status + uma seção por vez) recolhendo os detalhes técnicos — **sem remover conteúdo**.

## About the Design Files
Os arquivos HTML deste bundle são **referências de design** — protótipos mostrando aparência e comportamento pretendidos, **não** código de produção para copiar. A tarefa é **recriar esses designs dentro do ambiente já existente** do repositório `catsertao`: HTML/CSS/JS estático servido pelo GitHub Pages, **sem build e sem framework**. O trabalho é refatorar `hermes.html` in-place mantendo o gate de sessão, o chatbot e todo o conteúdo atual.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e interações são finais. Recriar pixel-a-pixel usando os padrões do próprio repo (vanilla JS/CSS).

## Screens / Views

### 1. Painel — Desktop (`Hermes Painel (desktop).html`)
- **Propósito:** navegar entre as seções do painel vendo uma de cada vez.
- **Layout:** coluna vertical — top bar; faixa de status; abaixo um flex de duas colunas: sidebar fixa (210px) + área de conteúdo com scroll.
- **Componentes:**
  - **Top bar** — fundo `#0b1020`, borda inferior `#FFC000` 2px, padding 12px 22px. Brasão (quadrado 38px, `#141a30`, texto dourado), título "Hermes Agent" (Barlow SemiCondensed 19px/700 branco) + "CAT SERTÃO · CBMPE" (10px, `#8891b5`, letter-spacing 1.2px). Busca central: input pill branco, raio 24px. Direita: "Admin Master" + avatar circular 32px.
  - **Faixa de status** — fundo `#111730`, padding 9px 22px. Chips pill (fundo `#0b1020`, borda `#2c3760`, raio 20px, texto `#cdd3e8` 12px): status com bolinha `#3ecf8e`, próxima execução, "57 normas". Link "← Voltar ao portal" (`#8891b5`) à direita.
  - **Sidebar** — fundo branco, borda direita `#e3e1da`. Label "SEÇÕES" (11px, `#a0a0a8`). Itens: botão flex ícone+rótulo+badge, raio 9px, Barlow 15px. Ativo: fundo `#002060`, texto branco, badge translúcido. Inativo: texto `#41454f`, badge fundo `#f0eef4`. Item "⚙ Avançado" separado por borda tracejada `#e3e1da`.
  - **Conteúdo** — eyebrow (Barlow 13px/600 `#C00000`, letter-spacing 1.5px), h1 (Barlow 32px/700 `#0b1020`), parágrafo (`#6b6f7d` 14.5px). Cards brancos borda `#e3e1da` raio 12px.
    - *Skills:* card com barra de cor à esquerda 6px (dourado `#FFC000` / vermelho `#C00000` / azul `#002060` / cinza `#c9c9d2`), nome em mono 15px/600, descrição 13px `#6b6f7d`, tag de categoria pill, botão "detalhes ▼". Painel de detalhes: borda superior tracejada, caminhos em mono com fundo `#f4f3ef`, bloco de regras com borda-esquerda `#C00000` sobre `#fdf6f6`.
    - *Apresentações:* lista de linhas nome(mono)+tamanho+botão "⬇ baixar" (borda `#d4d8e6`, texto `#002060`).
    - *Cron Jobs:* cards com bolinha `#3ecf8e`, nome, descrição, schedule em mono pill + próxima execução.
    - *Consultas rápidas:* acordeões (cabeçalho 14.5px/600), corpo com citações em bloco borda `#002060`.
    - *Wiki:* grid de cards de contagem (número grande colorido + tipo + exemplos) + resumo de classificação de risco (I verde, II âmbar, III vermelho).
    - *Sites & Serviços:* linhas-link com ícone + nome + detalhe + "→".
    - *Avançado:* tabela de scripts (arquivo mono + descrição + localização) sobre cabeçalho `#0b1020`; aviso de segurança em `#fdf6f6`.

### 2. Painel — Mobile (`Hermes Painel (mobile).html`)
- **Propósito:** mesmo painel em tela estreita (~390px).
- **Layout:** header compacto — chips de status em scroll horizontal — conteúdo em coluna única — **barra de abas fixa no rodapé**.
- **Componentes:**
  - Header: brasão 34px, título 17px, avatar; busca pill abaixo.
  - Status: chips em `overflow-x:auto` (scrollbar oculta).
  - Cards: coluna única; nas Skills o card inteiro é o toggle de detalhes.
  - **Bottom nav:** 5 abas (Skills 🧩 · Slides 📊 · Jobs ⏱ · Normas 💬 · Mais ⋯). Ativa em `#002060`, inativa `#9a9aa4`. "Mais" agrupa Wiki, Sites e Avançado. Alvos ≥ 44px.

## Interactions & Behavior
- **Troca de seção:** clicar na sidebar/aba mostra só a seção correspondente (as demais ocultas). Preservar em `location.hash`.
- **Detalhes / acordeões:** toggle expandir/recolher; ícone ▼/▲; `aria-expanded`.
- **Recolhido por padrão:** todos os detalhes técnicos e acordeões iniciam fechados.
- **Responsivo:** abaixo de ~720px, sidebar → bottom tabs; header e status compactam.
- **Preservar:** gate de sessão (perfil `admin_master`), chatbot flutuante, links externos existentes.

## State Management
- `activeSection` (string): seção visível. Sincronizar com `location.hash`.
- `openPanels` (conjunto/objeto de booleanos): quais cards/acordeões estão expandidos.
- Sem data fetching novo — conteúdo é estático (o que já existe hoje na página).

## Design Tokens
- **Cores:** `#0b1020` (top bar/fundo escuro), `#111730` (status), `#141a30` (cards escuros), `#2c3760` (bordas escuras), `#002060` (azul ativo/links), `#C00000` (vermelho/eyebrow), `#FFC000` (dourado acento), `#f4f3ef` (fundo conteúdo), `#fff` (cards), `#e3e1da` (borda clara), `#1a1d29` (texto), `#6b6f7d` (texto secundário), `#8891b5` / `#cdd3e8` (texto sobre escuro), `#3ecf8e` (status ok).
- **Raios:** cards 12px · pills/badges 20–24px · botões pequenos 8px.
- **Tipografia:** Barlow Semi Condensed (títulos/nav) 13–32px; Inter (corpo) 11.5–14.5px; monoespaçada (arquivos/comandos).
- **Espaçamento:** padding de card 14–18px; gap entre cards 10–12px; conteúdo 26–34px (desktop) / 16–20px (mobile).
- **Borda de destaque:** top bar borda inferior `#FFC000` 2px.

## Assets
- Brasão CAT Sertão: `CAT-SERTAO-SEM-FUNDO.png` (já no repo). Nas referências foi usado um placeholder "CS" — trocar pelo brasão real.
- Fontes: Google Fonts (Barlow Semi Condensed, Inter).
- Ícones: emoji (como no site atual). Manter ou trocar por um set SVG se o repo já tiver um.

## Files
- `Hermes Painel (desktop).html` — referência desktop hi-fi (interativa).
- `Hermes Painel (mobile).html` — referência mobile hi-fi (interativa).
- `PROMPT_CLAUDE_CODE.md` — prompt pronto para colar no Claude Code.
- Alvo no repo: `hermes.html` (refatorar in-place).
