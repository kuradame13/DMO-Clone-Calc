import { readFile } from 'node:fs/promises';

const appId = process.env.DISCORD_APP_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!appId || !token) {
  console.error('Defina DISCORD_APP_ID e DISCORD_BOT_TOKEN antes de rodar.');
  console.error('Opcional: DISCORD_GUILD_ID para registrar só no seu servidor (instantâneo).');
  process.exit(1);
}

const commands = JSON.parse(
  await readFile(new URL('./commands.json', import.meta.url), 'utf8')
);

const url = `https://discord.com/api/v10/applications/${appId}${
  guildId ? `/guilds/${guildId}` : ''
}/commands`;

const response = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(commands)
});

const text = await response.text();

if (!response.ok) {
  console.error(`Falha ao registrar (${response.status}):`);
  console.error(text);
  process.exit(1);
}

console.log(guildId ? 'Comando registrado no servidor:' : 'Comando global registrado:');
console.log(text);

if (!guildId) {
  console.log('\nComandos globais podem levar até 1 hora para aparecer. Para testar na hora, use DISCORD_GUILD_ID.');
}
