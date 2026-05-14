const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../Handlers/database');

const ignoredDeletionIds = new Set();

function formatStickyLog(message, extra = '') {
  const suffix = extra ? ` ${extra}` : '';
  return (
    `[📌] [STICKY] [${new Date().toLocaleDateString('en-GB')}] ` +
    `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message}${suffix}`
  );
}

function logSticky(message, extra = '') {
  console.log(formatStickyLog(message, extra));
}

function logStickyError(message, error) {
  console.error(formatStickyLog(message), error);
}

function getChannelKey(guildId, channelId) {
  return `${guildId}.${channelId}`;
}

async function getStickyConfig(guildId, channelId) {
  return (await db.stickyMessages.get(getChannelKey(guildId, channelId))) || null;
}

async function removeStickyConfig(guildId, channelId) {
  await db.stickyMessages.delete(getChannelKey(guildId, channelId));
}

async function findStickyConfigByMessageId(stickyMessageId) {
  if (!stickyMessageId) {
    return null;
  }

  const allStickyConfigs = await db.stickyMessages.all();

  if (!allStickyConfigs || typeof allStickyConfigs !== 'object') {
    return null;
  }

  for (const [guildId, guildConfigs] of Object.entries(allStickyConfigs)) {
    if (!guildConfigs || typeof guildConfigs !== 'object') {
      continue;
    }

    for (const [channelId, config] of Object.entries(guildConfigs)) {
      if (config?.stickyMessageId === stickyMessageId) {
        return { guildId, channelId, config };
      }
    }
  }

  return null;
}

function buildStickyEmbed(content, authorTag) {
  return new EmbedBuilder()
    .setDescription(content)
    .setColor(0x2f3136);
}

async function deleteStickyMessageById(client, channelId, stickyMessageId) {
  if (!stickyMessageId) {
    return false;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      return false;
    }

    const stickyMessage = await channel.messages.fetch(stickyMessageId).catch(() => null);
    if (!stickyMessage) {
      return false;
    }

    ignoredDeletionIds.add(stickyMessageId);
    await stickyMessage.delete().catch(() => {});
    return true;
  } finally {
    setTimeout(() => ignoredDeletionIds.delete(stickyMessageId), 10000);
  }
}

async function sendStickyMessage(channel, content, authorTag) {
  const embed = buildStickyEmbed(content, authorTag);
  return channel.send({ embeds: [embed] });
}

async function upsertStickyMessage({ client, guild, channel, content, authorTag, deleteExisting = true }) {
  const guildId = guild.id;
  const channelId = channel.id;
  const existingConfig = await getStickyConfig(guildId, channelId);

  if (deleteExisting && existingConfig?.stickyMessageId) {
    await deleteStickyMessageById(client, channelId, existingConfig.stickyMessageId);
  }

  const stickyMessage = await sendStickyMessage(channel, content, authorTag || existingConfig?.authorTag || null);

  await db.stickyMessages.set(getChannelKey(guildId, channelId), {
    guildId,
    guildName: guild.name,
    channelId,
    stickyMessageId: stickyMessage.id,
    content,
    authorTag: authorTag || existingConfig?.authorTag || null,
    updatedAt: new Date().toISOString()
  });

  return stickyMessage;
}

async function handleStickyChannelMessage(message, client) {
  if (!message.guild || message.author.bot) {
    return;
  }

  const me = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
  if (!me) {
    return;
  }

  if (!me.permissions.has(PermissionFlagsBits.ManageMessages) || !me.permissions.has(PermissionFlagsBits.SendMessages)) {
    return;
  }

  const stickyConfig = await getStickyConfig(message.guild.id, message.channel.id);
  if (!stickyConfig?.content) {
    return;
  }

  try {
    await upsertStickyMessage({
      client,
      guild: message.guild,
      channel: message.channel,
      content: stickyConfig.content,
      authorTag: stickyConfig.authorTag || null,
      deleteExisting: true
    });

    logSticky(`${message.guild.name} ${message.guild.id} refreshed sticky message in #${message.channel.name} (${message.channel.id}) after ${message.author.tag}.`);
  } catch (error) {
    logStickyError(
      `${message.guild.name} ${message.guild.id} failed to refresh sticky message in channel ${message.channel.id}.`,
      error
    );
  }
}

async function handleStickyMessageDeletion(message) {
  const stickyMessageId = message?.id;

  if (!stickyMessageId) {
    return;
  }

  if (ignoredDeletionIds.has(stickyMessageId)) {
    ignoredDeletionIds.delete(stickyMessageId);
    return;
  }

  const stickyMatch = await findStickyConfigByMessageId(stickyMessageId);
  if (!stickyMatch) {
    return;
  }

  await removeStickyConfig(stickyMatch.guildId, stickyMatch.channelId);
  logSticky(`${stickyMatch.config.guildName || stickyMatch.guildId} ${stickyMatch.guildId} removed sticky config for channel ${stickyMatch.channelId} after the sticky message was deleted manually.`);
}

module.exports = {
  getStickyConfig,
  removeStickyConfig,
  upsertStickyMessage,
  handleStickyChannelMessage,
  handleStickyMessageDeletion,
  logSticky,
  logStickyError
};
