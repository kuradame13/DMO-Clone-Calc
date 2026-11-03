/**
 * DigiClone Discord bot — Cloudflare Worker
 *
 * Recebe as interações do Discord via HTTP (sem gateway/WebSocket),
 * valida a assinatura Ed25519 e responde ao comando /clone.
 *
 * Variável de ambiente obrigatória:
 *   DISCORD_PUBLIC_KEY = Public Key do app no Discord Developer Portal
 */

const TABLE = {
  attack:   [3, 6, 9, 14, 19, 24, 34, 44, 54, 69, 84, 99, 114, 129, 144],
  critical: [15, 30, 45, 70, 95, 120, 170, 220, 270, 345, 420, 495, 570, 645, 720],
  block:    [2, 4, 6, 9, 12, 15, 21, 27, 33, 42, 51, 60, 69, 78, 87],
  evasion:  [12, 24, 36, 56, 76, 96, 136, 176, 216, 276, 336, 396, 456, 516, 576],
  health:   [2, 4, 6, 9, 12, 15, 19, 23, 27, 31, 35, 39, 44, 49, 54]
};

const STATS = {
  attack:   { label: 'Ataque' },
  critical: { label: 'Crítico' },
  block:    { label: 'Bloqueio', flat: true },
  evasion:  { label: 'Evasão' },
  health:   { label: 'Vida', note: 'Vida só fica disponível depois da Transcendência.' }
};

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    throw new Error('hex inválido');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function verifyDiscord(request, rawBody, publicKeyHex) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(publicKeyHex),
    { name: 'Ed25519' },
    false,
    ['verify']
  );

  const data = new TextEncoder().encode(timestamp + rawBody);
  return crypto.subtle.verify({ name: 'Ed25519' }, key, hexToBytes(signature), data);
}

function compute(stat, level, base) {
  const pct = TABLE[stat][level - 1];

  if (STATS[stat].flat) {
    const total = Number.isFinite(base) ? base + pct : null;
    return { pct, bonus: pct, total, flat: true };
  }

  const bonus = (base * pct) / 100;
  return { pct, bonus, total: base + bonus, flat: false };
}

function buildEmbed(stat, level, base, result) {
  const info = STATS[stat];

  const embed = {
    color: 0xffb020,
    title: `${info.label} • Nível ${level}`,
    fields: [
      {
        name: 'Bônus de clone',
        value: `**+${nf.format(result.bonus)}${result.flat ? '%' : ''}**`,
        inline: true
      },
      {
        name: 'Total com clone',
        value: result.total === null ? '—' : `**${nf.format(result.total)}**`,
        inline: true
      },
      {
        name: 'Conta',
        value: result.flat
          ? `Valor fixo (+${result.pct}%), não escala com o base.`
          : `${nf.format(base)} × ${result.pct}%`,
        inline: false
      }
    ],
    footer: { text: 'DigiClone Calculator • DMO Wiki' },
    timestamp: new Date().toISOString()
  };

  if (info.note) embed.description = info.note;
  return embed;
}

function handleClone(interaction) {
  const options = Object.fromEntries(
    (interaction.data.options ?? []).map((option) => [option.name, option.value])
  );

  const stat = options.status;
  const level = Number(options.nivel);
  const base = options.base === undefined || options.base === null ? NaN : Number(options.base);
  const info = STATS[stat];

  if (!info) {
    return json({ type: 4, data: { content: 'Status inválido.', flags: 64 } });
  }

  if (!Number.isInteger(level) || level < 1 || level > 15) {
    return json({ type: 4, data: { content: 'Nível inválido: use de 1 a 15.', flags: 64 } });
  }

  if (!info.flat && (!Number.isFinite(base) || base <= 0)) {
    return json({
      type: 4,
      data: { content: 'Informe um valor base maior que zero.', flags: 64 }
    });
  }

  const result = compute(stat, level, Number.isFinite(base) ? base : NaN);

  return json({
    type: 4,
    data: { embeds: [buildEmbed(stat, level, base, result)] }
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (!env.DISCORD_PUBLIC_KEY) {
      return new Response('Missing DISCORD_PUBLIC_KEY', { status: 500 });
    }

    const rawBody = await request.text();

    let valid = false;
    try {
      valid = await verifyDiscord(request, rawBody, env.DISCORD_PUBLIC_KEY);
    } catch {
      valid = false;
    }

    if (!valid) {
      return new Response('invalid request signature', { status: 401 });
    }

    let interaction;
    try {
      interaction = JSON.parse(rawBody);
    } catch {
      return new Response('invalid payload', { status: 400 });
    }

    // 1 = PING de verificação do endpoint
    if (interaction.type === 1) {
      return json({ type: 1 });
    }

    // 2 = APPLICATION_COMMAND (slash command)
    if (interaction.type === 2 && interaction.data?.name === 'clone') {
      return handleClone(interaction);
    }

    return json({
      type: 4,
      data: { content: 'Comando não suportado.', flags: 64 }
    });
  }
};
