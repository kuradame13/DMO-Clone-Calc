# Bot do Discord — DigiClone

Bot de slash command que calcula o clone perfeito direto no Discord, hospedado de graça em um **Cloudflare Worker** (sem precisar de PC ligado 24h).

## Arquivos

```
worker.js              # o bot em si (valida assinatura + responde /clone)
commands.json          # definição do comando /clone
register-commands.mjs  # registra o comando na API do Discord
wrangler.toml          # opcional, para deploy via CLI
```

## 1. Criar o app e o bot no Discord

1. Abra <https://discord.com/developers/applications> (de preferência no PC).
2. **New Application** → dê um nome (esse nome vira o nome global do bot) → crie.
3. Em **General Information**:
   - Suba o ícone `../assets/icon-1024.png` em **App Icon**.
   - Copie o **Application ID**.
   - Copie a **Public Key**.
4. Em **Bot** → **Add Bot** → **Reset Token** → copie o token e guarde. **Nunca compartilhe nem suba esse token no GitHub.**
5. Em **Installation** → **Guild Install**:
   - Scopes: `bot` e `applications.commands`
   - Permissions: Enviar Mensagens, Inserir Links, Anexar Arquivos
   - Copie o **Install Link**, abra, escolha o servidor e autorize (precisa de Gerenciar Servidor).
6. Opcional: clique com o botão direito no bot no servidor → **Alterar apelido** para o nick local.

## 2. Criar o Worker no Cloudflare

> O **app móvel** do Cloudflare não serve para editar/publicar Workers. Use o dashboard web no PC (ou no celular com “Versão para computador”).

1. Abra <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Worker**.
2. Dê um nome (ex.: `digiclone-bot`) e clique em **Deploy**.
3. Clique em **Edit code**, apague o exemplo e cole todo o conteúdo de `worker.js`.
4. Clique em **Deploy**.
5. Em **Settings → Variables and Secrets**, crie um **Secret**:
   - Nome: `DISCORD_PUBLIC_KEY`
   - Valor: a Public Key copiada no passo 1
6. Copie a URL do Worker: `https://digiclone-bot.SEU-SUBDOMINIO.workers.dev`.

## 3. Ligar o Discord ao Worker

1. No Developer Portal → **General Information** → **Interactions Endpoint URL**.
2. Cole a URL do Worker e salve.
3. O Discord envia um **PING** na hora; o Worker responde e a URL fica validada.

## 4. Registrar o comando `/clone`

No PC, com Node.js 18+:

```bash
DISCORD_APP_ID=seu_application_id \
DISCORD_BOT_TOKEN=seu_token \
DISCORD_GUILD_ID=id_do_servidor \
node bot/register-commands.mjs
```

- `DISCORD_GUILD_ID` é opcional, mas registra o comando só no seu servidor e ele aparece **na hora**. Para pegar o ID: ative o Modo Desenvolvedor no Discord, clique com o botão direito no servidor → **Copiar ID do Servidor**.
- Sem `DISCORD_GUILD_ID`, o comando é global e pode levar até 1 hora para aparecer.
- O token é usado **só aqui**; ele não precisa existir dentro do Worker.

## 5. Testar

No servidor, digite:

```
/clone status:Ataque nivel:15 base:1000
```

O bot responde com um embed laranja mostrando o bônus, o total e a conta. Para Bloqueio, o `base` é opcional.

## Alternativa: deploy via Wrangler

```bash
npm install -g wrangler
wrangler login
cd bot
wrangler secret put DISCORD_PUBLIC_KEY
wrangler deploy
```

O `wrangler.toml` já aponta para `worker.js`. Se mudar o nome no arquivo, o Worker na Cloudflare precisa ter o mesmo nome.

## Segurança

- **Token do bot** = senha. Se vazar, use **Reset Token** no Developer Portal.
- A **Public Key** pode ficar pública; ela só serve para validar as requisições.
- O Worker valida a assinatura Ed25519 em toda requisição; sem isso, qualquer um poderia chamar seu endpoint.
- Não coloque o token em variáveis do Worker nem no código.

## Limites do plano gratuito

O plano gratuito dos Workers dá **100.000 requisições por dia**, muito mais do que um bot pessoal usa. Não precisa de cartão de crédito.
