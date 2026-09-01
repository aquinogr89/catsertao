# CAT Sertão — Portal Interno (CBMPE)

Portal interno do CAT Sertão (Centro de Atividades Técnicas do Sertão —
Corpo de Bombeiros Militar de Pernambuco): atendimento (assistente virtual),
documentos técnicos, Termo de Compromisso, SATECs/postos de atendimento,
Mapa de OCI — Ocupações de Combate a Incêndio (reserva técnica de incêndio/RTI,
AVCB, caldeira etc., no site irmão
[oci-catsertao](https://github.com/aquinogr89/oci-catsertao)), gestão de
usuários e LOG de auditoria.

Além da parte interna, o site publica duas **ferramentas de triagem abertas
ao público**, sem login — ver a seção "Ferramentas de triagem públicas"
abaixo.

Publicado em: https://aquinogr89.github.io/catsertao/

## Estrutura

```
index.html                  login + Atendimento, Documentos, Termo, SATECs
conta.html                  Minha Conta (troca de senha) — abre em nova aba
usuarios.html               gestão de usuários — abre em nova aba
log.html                    LOG de auditoria — abre em nova aba
hermes.html                 página-ponte pro painel do agente Hermes (o painel virou Web App do Apps Script, ver nota abaixo) — abre em nova aba
eventos.html                Controle de Eventos (planilha + TAC/MPPE) — abre em nova aba, Admin Master e Admin

  ferramentas de triagem PÚBLICAS (sem login) — ver seção própria abaixo
sistemas-preventivos.html   Triagem de Sistemas Preventivos (COSCIP-PE)
sistemas-preventivos.js       lógica e regras da triagem do COSCIP
save.html                   Triagem SAVE — Sistema de Alimentação de Veículos Elétricos (NT 17)
save.js                       lógica e regras da triagem da NT 17

common.js                   sessão, chamadas à API, helpers — compartilhado por todas as páginas
style.css                   estilos compartilhados por todas as páginas
chat.html                   iframe isolado do widget de chat (n8n)
sw.js                       Service Worker (cache offline) — subir CACHE_NAME a cada publicação
manifest.webmanifest        manifesto PWA
fonts/                      Oswald e Public Sans em .woff2, servidas localmente
content/tac-mppe.json       texto do TAC/MPPE exibido em eventos.html, separado do HTML/JS
content/sistemas-preventivos.json   base do COSCIP: ocupações A–Q, matriz, tabelas e textos de ajuda
content/mapa-sistemas-preventivos.xlsx   planilha-fonte oferecida para download na triagem
content/save.json           base da NT 17: tipologias, quadros de RTI, figuras e textos de ajuda
content/nt17-fig1..5.jpg    Figuras 1 a 5 da NT 17, extraídas do PDF oficial do CBMPE
apps-script/Code.gs         backend LEGADO do Termo de Compromisso (ver nota abaixo)
CAT-SERTAO-SEM-FUNDO.png    logo usado no cabeçalho/rodapé
icon-512.png                ícone do PWA
```

> **Ao publicar qualquer alteração, suba o `CACHE_NAME` em `sw.js`.** O
> Service Worker é network-first para HTML/CSS/JS/JSON, mas o navegador só
> reinstala o worker quando o arquivo muda — sem subir a versão, quem já tem
> o site instalado pode ficar preso na versão antiga (já aconteceu com o CSS).

`conta.html`, `usuarios.html`, `log.html` e `eventos.html` são páginas
próprias (não seções da mesma página) para poderem abrir em **nova aba** a
partir do menu — cada uma revalida a sessão e o perfil no servidor de forma
independente (via `CatAuth.requireSession`, em `common.js`); se a sessão for
inválida ou o perfil não tiver permissão, a página mostra uma mensagem de
acesso negado em vez do conteúdo. `eventos.html` segue esse modelo com
`CatAuth.requireSession(['admin_master', 'admin'])`.

`hermes.html` é diferente das demais: não faz `CatAuth.requireSession`
nenhum, porque não é mais o painel em si — é só uma página-ponte, sem
conteúdo nenhum pra proteger. Ver a nota logo abaixo.

> **Pendência de backend em `eventos.html`:** a página chama a ação
> `registrarAcessoEventos` (via `CatAuth.api`) para registrar cada consulta
> no LOG, no mesmo padrão de `obterTermo` → `acesso_termo`. Essa ação **ainda
> não existe** no backend real (repositório
> [oci-catsertao](https://github.com/aquinogr89/oci-catsertao), fora deste
> repositório) — até ser adicionada lá (validar token, checar perfil,
> gravar uma linha de LOG com `acao: 'acesso_eventos'`), a chamada só recebe
> o "Ação inválida" padrão e é ignorada (`.catch()` vazio, não quebra a
> página). A opção `acesso_eventos` já foi adicionada ao filtro de ação em
> `log.html`, pronta para quando o backend passar a gravar esse registro.

> **Sobre `hermes.html`:** até a rodada 6 de auditoria, este arquivo *era* o
> painel de bastidores do agente Hermes (skills carregadas, cron jobs, wiki
> de normas do CBMPE, scripts). Por ser servido estaticamente pelo GitHub
> Pages, a verificação de perfil rodava no navegador — **depois** de o HTML
> (e-mail da conta, caminhos internos do servidor, IDs de cron job, IDs do
> Drive de dezenas de arquivos) já ter sido entregue a qualquer um com a URL,
> sessão nenhuma exigida (achado **K1**). O painel virou um **Web App do
> Apps Script**, num projeto separado do backend do site, implantado com
> acesso **"Somente eu"**: o Google autentica antes de o servidor responder,
> em vez de o front-end esconder o conteúdo depois de já tê-lo entregue.
> `hermes.html` agora é só uma página-ponte — mostra um botão "Abrir o
> painel" que leva pra lá, e continua existindo porque o link "Hermes Agent"
> do menu lateral aponta pra cá e o endereço pode estar salvo em favorito. O
> código-fonte do painel (`Codigo.gs` + `painel.html`) fica só no editor do
> Apps Script — **fora deste repositório, de propósito**.

> **Nota sobre `apps-script/Code.gs` deste repositório:** esse arquivo é o
> backend **antigo**, autônomo, que só servia a "tabela de controle" do
> Termo de Compromisso com senha própria. Ele foi **substituído** pelo
> backend unificado (`Auth.gs` + `Code.gs`) que vive no repositório
> [oci-catsertao](https://github.com/aquinogr89/oci-catsertao/tree/main/apps-script),
> que agora cuida de login, perfis, OCI, Termo de Compromisso e LOG — tudo
> em um só lugar. O front-end deste site (`index.html`) não chama mais essa
> implantação antiga. Se quiser, você pode desativar aquela implantação
> separada no Apps Script depois de migrar (passo manual, opcional).

## Ferramentas de triagem públicas

Duas páginas ficam **fora do gate de login**, acessíveis por qualquer
cidadão: são linkadas na própria tela de login (bloco "Acesso público, sem
necessidade de login") e também no menu lateral de quem está logado. Nenhuma
delas chama `CatAuth.requireSession` nem a API do Apps Script — são
estáticas, rodam inteiramente no navegador e não têm dado sensível a
proteger.

| Página | O que responde | Norma-fonte |
|--------|----------------|-------------|
| `sistemas-preventivos.html` | Quais sistemas preventivos a edificação precisa instalar, a partir da ocupação (Art. 7º, tipos A–Q) e dos parâmetros do imóvel | COSCIP-PE — Decreto 19.644/1997, texto atualizado (consolidado até o Decreto 59.579/2025) |
| `save.html` | O que instalar em garagens e locais com Sistema de Alimentação de Veículos Elétricos (SAVE) | NT 17 do CBMPE (atualização nº 01, em vigor desde 01/07/2026) |

Cada página tem um trio `*.html` + `*.js` + `content/*.json`: **toda regra,
texto de ajuda e citação normativa fica no JSON**, não no código. Para
corrigir um limiar, um texto ou um artigo citado, edite o JSON — o `.js` só
implementa a lógica de decisão.

Os campos que dependem de saber onde buscar o dado no projeto têm um botão
**"?"** que abre um balão com explicação em linguagem corrente, o artigo/item
aplicável e, quando existe, o **excerto literal da norma**. O trecho literal
sempre vem do campo `excerto`; quando a explicação combina mais de um
dispositivo e não é citação direta, usa-se `resumo`, para não apresentar
como texto oficial algo que não é.

> **Origem dos textos normativos.** Nenhum excerto foi redigitado de memória:
> todos foram conferidos artigo por artigo contra a fonte oficial usando o
> `Get-Norma.ps1` do repositório de apresentações do CBMPE, que baixa e faz
> cache do texto consolidado da ALEPE (COSCIP) e do PDF da NT 17 publicado em
> `bombeiros.pe.gov.br`. As Figuras 1 a 5 exibidas na triagem SAVE foram
> extraídas do próprio PDF oficial da NT 17 (Fontes: CBPMESP, 2025; CBMES,
> 2026).

> **As duas ferramentas são orientativas.** Cada resultado diz isso na tela e
> classifica os itens em *Exigido*, *Verificar* (depende de NT específica, do
> responsável técnico ou de dado adicional) e *Dispensado*. Onde a leitura da
> norma é interpretativa — por exemplo, o afastamento do item 5.1.6 da NT 17
> em estacionamento aberto para a via pública, que não tem rota de saída de
> emergência a preservar — o card diz expressamente que é interpretação e que
> prevalece a análise do CBMPE no caso concreto.

## Login obrigatório e perfis

Fora as duas triagens públicas acima, todo o conteúdo do site (inclusive
SATECs e o assistente virtual) fica atrás de um login obrigatório. Não há
usuário/senha fixos no código — cada login é validado no Apps Script
(servidor), que também decide o que cada perfil pode ver:

| Perfil         | Vê/faz |
|----------------|--------|
| `admin_master` | Tudo: Atendimento, Documentos, Termo de Compromisso, SATECs, Mapa de OCI (com cadastro), Triagem de Riscos, Usuários (cria/desativa qualquer perfil, inclusive outros admins), LOG de auditoria, link no menu pro painel **Hermes Agent** (`hermes.html` → Web App do Apps Script), **Controle de Eventos** (`eventos.html`). O acesso *de fato* ao painel Hermes não depende mais desse perfil — é controlado à parte, pela lista `EMAILS_AUTORIZADOS` no projeto do Apps Script (ver nota sobre `hermes.html` acima). |
| `admin`        | Atendimento, Documentos, Termo de Compromisso, SATECs, Mapa de OCI (com cadastro), Triagem de Riscos, Usuários (só cria/desativa `user1`/`user2`), **Controle de Eventos**. Sem LOG, sem Hermes Agent. |
| `user1`        | Atendimento, Documentos, SATECs, Mapa de OCI (com cadastro), Triagem de Riscos. Sem Termo, sem Usuários, sem LOG. |
| `user2`        | Atendimento, Documentos, SATECs, Mapa de OCI (só visualização, sem cadastrar), Triagem de Riscos. Sem Termo, sem Usuários, sem LOG. |

Qualquer perfil pode trocar a própria senha em **Minha Conta**.

No grupo "Ferramentas" do menu lateral, os links **"Mapa de OCI"**,
**"Triagem de Riscos"**, **"Sistemas Preventivos"** e **"Triagem SAVE (VE)"**
são visíveis para **todos** os perfis logados e abrem em **nova aba** (os
dois últimos são as páginas públicas descritas acima — aparecem no menu por
conveniência, não porque exijam sessão). O mapa de OCI
([oci-catsertao](https://aquinogr89.github.io/oci-catsertao/)) é público
para consulta, mas só cadastra ponto quem tem perfil autorizado — o site
oci-catsertao revalida isso no próprio Apps Script a cada cadastro. Como
os dois sites e as páginas utilitárias (`conta.html`, `usuarios.html`,
`log.html`) ficam sob o mesmo domínio `aquinogr89.github.io`, o token de
sessão (`sessionStorage`) é herdado automaticamente pela aba nova, mesmo
sem passar por um novo login.

## Configurar o backend (Apps Script único, compartilhado com o oci-catsertao)

O backend fica no repositório **oci-catsertao**
(`apps-script/Code.gs` + `apps-script/Auth.gs`), não neste. Siga o
passo a passo completo lá:
https://github.com/aquinogr89/oci-catsertao/blob/main/README.md

Depois de implantar, copie a URL `/exec` gerada e cole em **dois lugares**:

1. Neste repositório, em [`common.js`](common.js), na constante
   `APPS_SCRIPT_URL` (usada por `index.html`, `conta.html`, `usuarios.html`
   e `log.html` — um único lugar para as quatro páginas).
2. No repositório `oci-catsertao`, em `app.js`, na constante `SHEETS_API_URL`.

As duas constantes devem apontar para a **mesma URL** — é o mesmo backend.

Também em `common.js`, a constante `TRIAGEM_URL` aponta para
`https://aquinogr89.github.io/triagem-catsertao/` (repositório
[triagem-catsertao](https://github.com/aquinogr89/triagem-catsertao)) —
ajuste se a URL publicada for outra.

## Testar localmente

Com Node.js instalado:

```bash
npx serve .
```

Ou com Python:

```bash
python3 -m http.server 8080
```

Acesse a URL exibida no terminal. Sem `APPS_SCRIPT_URL` configurada, a tela
de login vai mostrar "Não foi possível conectar ao servidor agora" — isso é
esperado até o backend estar implantado.

## Publicar no GitHub Pages

Já está publicado (branch `main`, raiz). Qualquer `git push` para `main`
atualiza o site automaticamente em alguns segundos.

## Observações de segurança

- Este site é público no GitHub Pages — **nenhuma senha, hash ou token de
  longa duração pode aparecer no código-fonte**. O front-end só guarda o
  token de sessão (que expira em 8h) em `sessionStorage`, e cada ação
  sensível é revalidada no Apps Script.
- O Termo de Compromisso não é mais um arquivo estático nem tem senha
  própria — o conteúdo vem da API (`obterTermo`) só para `admin_master` e
  `admin`, e cada acesso é registrado no LOG.
- O `meta name="robots" content="noindex, nofollow"` já presente no
  `index.html` evita que buscadores indexem o site, mas isso **não é**
  controle de acesso — só o login é.
- `sistemas-preventivos.html` e `save.html` são **públicas de propósito** e,
  por isso, não podem ganhar nenhum dado interno. Elas não chamam a API do
  Apps Script, não leem sessão e só carregam JSON de conteúdo normativo
  (texto de norma pública) — se um dia precisarem de dado interno, o caminho
  é criar outra página atrás do gate, não afrouxar estas.
- `hermes.html` **deixou de ser** o painel (achado **K1** da rodada 6 de
  auditoria — ver nota na seção "Estrutura" acima). Hoje é só uma
  página-ponte, sem dado sensível nenhum, que leva a um Web App do Apps
  Script separado (implantação "Somente eu", autenticado pelo Google antes
  de o servidor responder). O conteúdo que antes ficava exposto em texto
  puro no HTML — e-mail da conta, caminhos internos, IDs de cron job, links
  do Drive — agora só existe no editor do Apps Script, fora deste
  repositório.
- `eventos.html` é o mesmo caso: o gate de sessão só controla o que aparece
  na tela, não o HTML bruto. Por isso a página não embute nenhum dado de
  evento além do que já está na própria planilha do Google Sheets embutida
  por `iframe` (cujo controle de acesso é do próprio Google, independente do
  login do site — ver pré-requisito de compartilhamento comentado em
  `eventos.html`) e do texto do TAC/MPPE (`content/tac-mppe.json`), que é
  conteúdo público, não sensível.
