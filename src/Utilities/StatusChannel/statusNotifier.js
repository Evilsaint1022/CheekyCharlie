const db = require('../../Handlers/database');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { REST, Routes, EmbedBuilder } = require('discord.js');
const { owner, repo } = require('../../Functions/Github/github-state');

const STATUS_EMBED_COLOR = 0x2b9348;
const STATUS_EMBED_COLOR_OFFLINE = 0xc1121f;
const REPO_ROOT = path.resolve(__dirname, '../../..');
const BUILD_COMMIT_FULL_PATH = path.join(REPO_ROOT, '.build-commit-full');
const BUILD_COMMIT_SHORT_PATH = path.join(REPO_ROOT, '.build-commit-short');
const STATUS_DEDUPE_WINDOW_MS = 2 * 60 * 1000;
const sentStatusMessages = new Map();

function statusLog(message, error) {
  const prefix =
    `[📡] [STATUS CHANNEL] [${new Date().toLocaleDateString('en-GB')}] ` +
    `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ${message}`;

  if (error) {
    console.error(prefix, error);
    return;
  }

  console.log(prefix);
}

function getStatusDedupeKey(channelId, content) {
  return crypto.createHash('sha256').update(`${channelId}:${content}`).digest('hex');
}

async function cleanupExpiredStatusDedupeEntries(now) {
  const storedMessages = await db.status_channel.all();

  if (!storedMessages || typeof storedMessages !== 'object') {
    return;
  }

  for (const [key, entry] of Object.entries(storedMessages)) {
    const sentAt = entry?.sentAt;

    if (typeof sentAt !== 'number' || now - sentAt >= STATUS_DEDUPE_WINDOW_MS) {
      sentStatusMessages.delete(key);
      await db.status_channel.delete(key);
    }
  }
}

async function shouldSkipDuplicateStatusMessage(channelId, content) {
  const now = Date.now();
  const dedupeKey = getStatusDedupeKey(channelId, content);
  const memorySentAt = sentStatusMessages.get(dedupeKey);

  if (memorySentAt && now - memorySentAt < STATUS_DEDUPE_WINDOW_MS) {
    return true;
  }

  const storedMessage = await db.status_channel.get(dedupeKey);
  const storedSentAt = storedMessage?.sentAt;

  if (typeof storedSentAt === 'number' && now - storedSentAt < STATUS_DEDUPE_WINDOW_MS) {
    sentStatusMessages.set(dedupeKey, storedSentAt);
    return true;
  }

  await cleanupExpiredStatusDedupeEntries(now);

  sentStatusMessages.set(dedupeKey, now);
  await db.status_channel.set(dedupeKey, {
    channelId,
    content,
    sentAt: now
  });

  return false;
}

async function getConfiguredStatusChannels(client) {
  const statusChannels = [];

  for (const guild of client.guilds.cache.values()) {
    const settings = await db.settings.get(guild.id);
    const channelId = settings?.statusChannel;

    if (!channelId) {
      continue;
    }

    statusChannels.push({
      guildId: guild.id,
      guildName: guild.name,
      channelId
    });
  }

  return statusChannels;
}

async function getConfiguredStatusChannelsFromSettings() {
  const allSettings = await db.settings.all();

  if (!allSettings || typeof allSettings !== 'object') {
    return [];
  }

  return Object.entries(allSettings)
    .filter(([, settings]) => settings && typeof settings === 'object' && typeof settings.statusChannel === 'string')
    .map(([guildId, settings]) => ({
      guildId,
      guildName: settings.guildName || guildId,
      channelId: settings.statusChannel
    }));
}

function normalizeCommitSha(sha) {
  return typeof sha === 'string' ? sha.trim() : '';
}

function buildRuntimeCommitFromBuildFiles() {
  try {
    const fullSha = normalizeCommitSha(fs.readFileSync(BUILD_COMMIT_FULL_PATH, 'utf8'));
    const shortSha = normalizeCommitSha(fs.readFileSync(BUILD_COMMIT_SHORT_PATH, 'utf8'));

    if (!fullSha || !shortSha) {
      return null;
    }

    return {
      source: 'build-file',
      fullSha,
      shortSha
    };
  } catch {
    return null;
  }
}

function getRuntimeCommitFooter(runtimeCommit = null) {
  try {
    const resolvedCommit = runtimeCommit || getRuntimeCommitShas();

    if (!resolvedCommit?.shortSha) {
      return null;
    }

    return `Commit ${resolvedCommit.shortSha}`;
  } catch (error) {
    statusLog('Failed to read runtime git commit for status footer.', error);
    return null;
  }
}

function getRuntimeCommitShas() {
  const buildFileCommit = buildRuntimeCommitFromBuildFiles();

  if (buildFileCommit) {
    return buildFileCommit;
  }

  try {
    const fullSha = execSync('git rev-parse HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    }).trim();
    const shortSha = execSync('git rev-parse --short HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    }).trim();

    if (!fullSha || !shortSha) {
      return null;
    }

    return {
      source: 'git',
      fullSha,
      shortSha
    };
  } catch {
    return null;
  }
}

  async function fetchLatestGithubHeadSha() {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'CheekyCharlie',
      'Accept-Encoding': 'identity' // 🚨 THIS IS THE FIX
    };

    if (process.env.GITHUB_KEY) {
      headers.Authorization = `token ${process.env.GITHUB_KEY}`;
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/Evilsaint1022/CheekyCHarlie/commits?per_page=1`,
        { headers }
      );

      if (!response.ok) {
        return null;
      }

      // 🚨 DO NOT use response.json() (this is what is crashing)
      const text = await response.text();
      const commits = JSON.parse(text);

      return Array.isArray(commits) ? commits[0]?.sha || null : null;

    } catch (error) {
      statusLog('Failed to fetch latest GitHub commit for status footer.', error);
      return null;
    }
  }

async function buildStatusEmbed(content, options = {}) {
  const embed = new EmbedBuilder()
    .setDescription(content)
    .setColor(options.color || STATUS_EMBED_COLOR);

  if (options.includeCommitFooter) {
    const runtimeCommit = getRuntimeCommitShas();
    const latestGithubSha = await fetchLatestGithubHeadSha();
    const footerText = runtimeCommit
      ? `Commit ${runtimeCommit.shortSha}${latestGithubSha === runtimeCommit.fullSha ? ' ✅' : ''}`
      : latestGithubSha
        ? `Commit ${latestGithubSha.slice(0, 7)} ✅`
        : getRuntimeCommitFooter(runtimeCommit);

    if (footerText) {
      embed.setFooter({ text: footerText });
    } else {
      statusLog('Runtime commit footer was skipped because no runtime commit could be resolved.');
    }
  }

  return embed;
}

async function sendStatusMessage(client, content, options = {}) {
  const configuredChannels = await getConfiguredStatusChannels(client);
  const embed = await buildStatusEmbed(content, options);

  for (const { guildId, guildName, channelId } of configuredChannels) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);

      if (!channel || !channel.isTextBased()) {
        statusLog(`${guildName} ${guildId} has an invalid status channel configured: ${channelId}`);
        continue;
      }

      if (await shouldSkipDuplicateStatusMessage(channelId, content)) {
        statusLog(`${guildName} ${guildId} skipped duplicate status update to ${channelId}: ${content}`);
        continue;
      }

      await channel.send({ embeds: [embed] });
      statusLog(`${guildName} ${guildId} sent status update to ${channelId}: ${content}`);
    } catch (error) {
      statusLog(`${guildName} ${guildId} failed to send status update to ${channelId}.`, error);
    }
  }
}

async function sendEarlyStatusMessage(content, options = {}) {
  if (!process.env.TOKEN) {
    statusLog(`Skipped early status update because TOKEN is missing: ${content}`);
    return;
  }

  const configuredChannels = await getConfiguredStatusChannelsFromSettings();

  if (configuredChannels.length === 0) {
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  const embed = await buildStatusEmbed(content, options);

  for (const { guildId, guildName, channelId } of configuredChannels) {
    try {
      if (await shouldSkipDuplicateStatusMessage(channelId, content)) {
        statusLog(`${guildName} ${guildId} skipped duplicate early status update to ${channelId}: ${content}`);
        continue;
      }

      await rest.post(Routes.channelMessages(channelId), {
        body: { embeds: [embed.toJSON()] }
      });

      statusLog(`${guildName} ${guildId} sent early status update to ${channelId}: ${content}`);
    } catch (error) {
      statusLog(`${guildName} ${guildId} failed to send early status update to ${channelId}.`, error);
    }
  }
}

async function shutdownBot(client, options = {}) {
  const {
    exitCode = 0,
    reason = 'shutdown',
    destroyClient = true
  } = options;

  if (!client || client.__isShuttingDown) {
    return;
  }

  client.__isShuttingDown = true;

  try {
    statusLog(`Shutdown requested via ${reason}.`);

    if (client.isReady()) {
      await sendStatusMessage(client, 'Shutting down...', {
        color: STATUS_EMBED_COLOR_OFFLINE
      });
      await sendStatusMessage(client, 'Cheeky Charlie is offline.', {
        color: STATUS_EMBED_COLOR_OFFLINE
      });
    }
  } catch (error) {
    statusLog(`Status-channel shutdown notifications failed during ${reason}.`, error);
  } finally {
    if (destroyClient) {
      await client.destroy().catch(() => null);
    }

    process.exit(exitCode);
  }
}

module.exports = {
  STATUS_EMBED_COLOR,
  STATUS_EMBED_COLOR_OFFLINE,
  sendEarlyStatusMessage,
  sendStatusMessage,
  shutdownBot,
  statusLog
};
