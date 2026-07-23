# Prompt para o Claude Code — Reorganizar o painel Hermes (CAT Sertão)

> Cole o texto abaixo no Claude Code, rodando dentro do repositório `aquinogr89/catsertao`.
> Os arquivos `Hermes Painel (desktop).html` e `Hermes Painel (mobile).html` desta pasta são **referências de design** — recrie o comportamento/visual deles em `hermes.html`, não os copie tal e qual.

---

## Contexto

O arquivo `hermes.html` é um painel interno estático (GitHub Pages, sem build/framework — HTML + CSS + JS puro). Hoje ele mostra **toda** a informação de uma vez numa página longa: Skills, Cron Jobs, Wiki de Normas, Apresentações, Scripts, Repositórios, Sites, Configurações, Consultas Rápidas e Memória, tudo com o mesmo peso visual e com caminhos de arquivo/IDs/scripts expostos direto na tela.

Quero reorganizar mantendo **exatamente a mesma paleta** (é a do brasão do CAT Sertão) e **todo o conteúdo atual** — nada some, só muda de lugar e de hierarquia.

## Objetivo

Transformar a página longa em um **painel navegável com sidebar fixa + faixa de status no topo**, mostrando **uma seção por vez**, e recolhendo os detalhes técnicos por padrão. Referência exata em `Hermes Painel (desktop).html` (e `Hermes Painel (mobile).html` para telas estreitas).

## Estrutura alvo

1. **Top bar** (fundo `#0b1020`, borda inferior dourada `#FFC000` de 2px): brasão + "Hermes Agent" + subtítulo "CAT SERTÃO · CBMPE" + campo de busca central + avatar "Admin Master" à direita.
2. **Faixa de status** (fundo `#111730`) logo abaixo: chips com fundo `#0b1020` e borda `#2c3760` — "4 cron jobs · todos ok" (bolinha verde `#3ecf8e`), "próximo: …", "57 normas monitoradas" — e link "← Voltar ao portal".
3. **Sidebar fixa à esquerda** (~210px, fundo branco, borda `#e3e1da`): itens de navegação com ícone + rótulo + badge de contagem. Item ativo com fundo azul `#002060` e texto branco. Ordem: Skills · 5, Apresentações · 10, Cron Jobs · 4, Consultas rápidas, Wiki de Normas · 57, Sites & Serviços. Separado embaixo por linha tracejada: **⚙ Avançado** (agrupa Scripts, Configurações, Repositórios e todos os caminhos de arquivo).
4. **Área de conteúdo**: renderiza só a seção ativa. Cada seção tem um eyebrow em vermelho `#C00000` (ex.: "CONHECIMENTO"), título grande e o conteúdo em cards brancos com borda `#e3e1da` e raio 12px.

## Regras de hierarquia (o pedido central)

- **Detalhes técnicos recolhidos por padrão.** Caminhos (`/data/...`), nomes de script, hashes, IDs de job, regras internas — escondidos atrás de um botão "detalhes ▼" em cada card, ou movidos para a seção **Avançado**. A tela inicial mostra só nome + descrição de uma linha.
- **Skills** = cards com uma barra de cor à esquerda (dourado/vermelho/azul do brasão), nome (mono), descrição curta, tag de categoria; o resto entra no "detalhes".
- **Consultas rápidas / Wiki** = acordeões (fechados por padrão).
- **Memória** e o restante do conteúdo atual: manter, dentro da seção que fizer mais sentido (Memória pode ir em Avançado ou como seção própria no fim da sidebar).
- **Não remova nenhum texto, link ou dado** que já existe em `hermes.html` hoje — apenas reorganize e recolha.

## Comportamento

- Trocar de seção pela sidebar mostra/esconde as seções (SPA simples, sem recarregar). Pode usar `hidden` + um pouco de JS, ou âncoras `#skills`/`#cron` etc. atualizando o estado ativo. Preserve a seção ativa no `location.hash` para links diretos funcionarem.
- Acordeões e "detalhes" expandem/recolhem com JS puro (toggle de classe).
- Manter o **chatbot** e o **gate de sessão / verificação de perfil Admin Master** que já existem — só encaixá-los na nova casca.
- Busca no topo: se já houver lógica, mantê-la; se não, deixar o campo pronto (filtragem client-side simples por nome de skill/norma é um plus, não obrigatório).

## Responsivo (mobile)

Abaixo de ~720px, seguir `Hermes Painel (mobile).html`:
- Sidebar some; navegação vira **barra de abas fixa no rodapé** (Skills · Slides · Jobs · Normas · Mais). "Mais" agrupa Wiki, Sites e Avançado.
- Header compacto; chips de status em rolagem horizontal.
- Cards em coluna única; alvos de toque ≥ 44px.

## Paleta (não alterar — cores do brasão)

- Fundo escuro / top bar: `#0b1020` · faixa status: `#111730` · cards escuros: `#141a30` · bordas escuras: `#2c3760`
- Azul institucional (ativo, links): `#002060`
- Vermelho (eyebrows, alertas): `#C00000`
- Dourado (acento, borda do topo): `#FFC000`
- Fundo do conteúdo: `#f4f3ef` · cards: `#fff` · bordas claras: `#e3e1da` · texto: `#1a1d29` / secundário `#6b6f7d`
- Verde de status ok: `#3ecf8e`

## Tipografia

- Títulos e navegação: **Barlow Semi Condensed** (500/600/700).
- Corpo: **Inter** (400/500/600/700).
- Nomes de arquivo/script/comando: fonte monoespaçada.
- (Já carregadas via Google Fonts nos arquivos de referência.)

## Restrições

- **Sem framework nem build step** — continua HTML/CSS/JS puro servido pelo GitHub Pages.
- Um único arquivo `hermes.html` (CSS e JS inline ou em arquivos irmãos, como já estiver no repo).
- Acessível: navegação por teclado nos itens da sidebar/abas, `aria-expanded` nos acordeões, contraste mantido.
- Não introduzir dependências externas novas além das fontes já usadas.

## Entrega

Refatore `hermes.html` in-place. Ao final, descreva o que mudou e como testar (trocar de seção, expandir detalhes, ver no mobile).
