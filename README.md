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
index.html                página única (login, app, todas as seções)
chat.html                  iframe isolado do widget de chat (n8n)
apps-script/Code.gs        backend LEGADO do Termo de Compromisso (ver nota abaixo)
CAT-SERTAO-SEM-FUNDO.png   logo usado no cabeçalho/rodapé
```

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
| `admin_master` | Tudo: Atendimento, Documentos, Termo de Compromisso, SATECs, Cadastrar RTI, Usuários (cria/desativa qualquer perfil, inclusive outros admins), LOG de auditoria. |
| `admin`        | Atendimento, Documentos, Termo de Compromisso, SATECs, Cadastrar RTI, Usuários (só cria/desativa `user1`/`user2`). Sem LOG. |
| `user1`        | Atendimento, Documentos, SATECs, Cadastrar RTI. Sem Termo, sem Usuários, sem LOG. |
| `user2`        | Atendimento, Documentos, SATECs. Navegação básica — sem RTI, sem Termo, sem Usuários, sem LOG. |

Qualquer perfil pode trocar a própria senha em **Minha Conta**.

O botão **"Cadastrar RTI"** do menu leva ao site
[rti-catsertao](https://aquinogr89.github.io/rti-catsertao/), publicado sob o
mesmo domínio `aquinogr89.github.io` — por isso o token de sessão
(`sessionStorage`) é compartilhado entre os dois sites automaticamente,
desde que a navegação aconteça na mesma aba (é assim que o link já está
configurado; não abra em nova aba).

## Configurar o backend (Apps Script único, compartilhado com o rti-catsertao)

O backend fica no repositório **rti-catsertao**
(`apps-script/Code.gs` + `apps-script/Auth.gs`), não neste. Siga o
passo a passo completo lá:
https://github.com/aquinogr89/rti-catsertao/blob/main/README.md

Depois de implantar, copie a URL `/exec` gerada e cole em **dois lugares**:

1. Neste repositório, em [`index.html`](index.html), na constante
   `APPS_SCRIPT_URL` (dentro da tag `<script>`, próximo ao topo).
2. No repositório `rti-catsertao`, em `app.js`, na constante `SHEETS_API_URL`.

As duas constantes devem apontar para a **mesma URL** — é o mesmo backend.

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
