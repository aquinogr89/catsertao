# CAT Sertão — Portal Interno (CBMPE)

Portal interno do CAT Sertão (Centro de Atividades Técnicas do Sertão —
Corpo de Bombeiros Militar de Pernambuco): atendimento (assistente virtual),
documentos técnicos, Termo de Compromisso, SATECs/postos de atendimento,
cadastro de Reserva Técnica de Incêndio (RTI, no site irmão
[rti-catsertao](https://github.com/aquinogr89/rti-catsertao)), gestão de
usuários e LOG de auditoria.

Publicado em: https://aquinogr89.github.io/catsertao/

## Estrutura

```
index.html                login + Atendimento, Documentos, Termo, SATECs
conta.html                  Minha Conta (troca de senha) — abre em nova aba
usuarios.html               gestão de usuários — abre em nova aba
log.html                    LOG de auditoria — abre em nova aba
hermes.html                 painel de bastidores do agente Hermes (skills, cron jobs, wiki de normas) — abre em nova aba, só Admin Master
common.js                   sessão, chamadas à API, helpers — compartilhado por todas as páginas
style.css                    estilos compartilhados por todas as páginas
chat.html                   iframe isolado do widget de chat (n8n)
apps-script/Code.gs         backend LEGADO do Termo de Compromisso (ver nota abaixo)
CAT-SERTAO-SEM-FUNDO.png    logo usado no cabeçalho/rodapé
```

`conta.html`, `usuarios.html`, `log.html` e `hermes.html` são páginas próprias
(não seções da mesma página) para poderem abrir em **nova aba** a partir do
menu — cada uma revalida a sessão e o perfil no servidor de forma independente
(via `CatAuth.requireSession`, em `common.js`); se a sessão for inválida ou o
perfil não tiver permissão, a página mostra uma mensagem de acesso negado
em vez do conteúdo. `hermes.html` segue exatamente o mesmo modelo de
`log.html` (`CatAuth.requireSession(['admin_master'])`), então só aparece na
navegação e só carrega o conteúdo para quem está logado como `admin_master`
(hoje, `geraldo.reis`).

> **Sobre `hermes.html`:** é o painel de bastidores gerado e mantido pelo
> agente Hermes (skills carregadas, cron jobs, wiki de normas do CBMPE,
> scripts) — conteúdo de interesse só do Admin Master, por isso o gate
> extra. Como o GitHub Pages serve arquivos estáticos sem controle de acesso
> no servidor, o gate de sessão só esconde o conteúdo na tela — **nenhuma
> senha ou segredo pode ser escrito no HTML desta página**, mesmo estando
> atrás do login (ver "Observações de segurança" abaixo).

> **Nota sobre `apps-script/Code.gs` deste repositório:** esse arquivo é o
> backend **antigo**, autônomo, que só servia a "tabela de controle" do
> Termo de Compromisso com senha própria. Ele foi **substituído** pelo
> backend unificado (`Auth.gs` + `Code.gs`) que vive no repositório
> [rti-catsertao](https://github.com/aquinogr89/rti-catsertao/tree/main/apps-script),
> que agora cuida de login, perfis, RTI, Termo de Compromisso e LOG — tudo
> em um só lugar. O front-end deste site (`index.html`) não chama mais essa
> implantação antiga. Se quiser, você pode desativar aquela implantação
> separada no Apps Script depois de migrar (passo manual, opcional).

## Login obrigatório e perfis

Todo o conteúdo do site (inclusive SATECs e o assistente virtual) fica atrás
de um login obrigatório. Não há usuário/senha fixos no código — cada login
é validado no Apps Script (servidor), que também decide o que cada perfil
pode ver:

| Perfil         | Vê/faz |
|----------------|--------|
| `admin_master` | Tudo: Atendimento, Documentos, Termo de Compromisso, SATECs, Mapa de RTI (com cadastro), Triagem de Riscos, Usuários (cria/desativa qualquer perfil, inclusive outros admins), LOG de auditoria, painel **Hermes Agent** (`hermes.html`). |
| `admin`        | Atendimento, Documentos, Termo de Compromisso, SATECs, Mapa de RTI (com cadastro), Triagem de Riscos, Usuários (só cria/desativa `user1`/`user2`). Sem LOG. |
| `user1`        | Atendimento, Documentos, SATECs, Mapa de RTI (com cadastro), Triagem de Riscos. Sem Termo, sem Usuários, sem LOG. |
| `user2`        | Atendimento, Documentos, SATECs, Mapa de RTI (só visualização, sem cadastrar), Triagem de Riscos. Sem Termo, sem Usuários, sem LOG. |

Qualquer perfil pode trocar a própria senha em **Minha Conta**.

Os links **"Mapa de RTI"** e **"Triagem de Riscos"** do menu são visíveis
para **todos** os perfis logados e abrem em **nova aba**: o mapa de RTI
([rti-catsertao](https://aquinogr89.github.io/rti-catsertao/)) é público
para consulta, mas só cadastra ponto quem tem perfil autorizado — o site
rti-catsertao revalida isso no próprio Apps Script a cada cadastro. Como
os dois sites e as páginas utilitárias (`conta.html`, `usuarios.html`,
`log.html`) ficam sob o mesmo domínio `aquinogr89.github.io`, o token de
sessão (`sessionStorage`) é herdado automaticamente pela aba nova, mesmo
sem passar por um novo login.

## Configurar o backend (Apps Script único, compartilhado com o rti-catsertao)

O backend fica no repositório **rti-catsertao**
(`apps-script/Code.gs` + `apps-script/Auth.gs`), não neste. Siga o
passo a passo completo lá:
https://github.com/aquinogr89/rti-catsertao/blob/main/README.md

Depois de implantar, copie a URL `/exec` gerada e cole em **dois lugares**:

1. Neste repositório, em [`common.js`](common.js), na constante
   `APPS_SCRIPT_URL` (usada por `index.html`, `conta.html`, `usuarios.html`
   e `log.html` — um único lugar para as quatro páginas).
2. No repositório `rti-catsertao`, em `app.js`, na constante `SHEETS_API_URL`.

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
- `hermes.html` é conteúdo estático (texto fixo no HTML, diferente das
  tabelas de Termo/LOG/Usuários que só chegam via API depois do login) —
  por isso ele nunca deve conter senha, token ou segredo em texto puro:
  quem tiver a URL pode ler o HTML bruto (Ctrl+U / `curl`) mesmo sem passar
  pelo gate de sessão em JavaScript.
