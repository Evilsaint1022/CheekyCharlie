const db = require('../../Handlers/database');
const { execSync } = require('child_process');
const path = require('path');
const fetch = require('node-fetch');
const { REST, Routes, EmbedBuilder } = require('discord.js');
const { owner, repo } = require('../../Functions/Github/github-state');

const STATUS_EMBED_COLOR = 0x2b9348;
const STATUS_EMBED_COLOR_OFFLINE = 0xc1121f;
const REPO_ROOT = path.resolve(__dirname, '../../..');

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

function getRuntimeCommitFooter() {
  try {
    const shortSha = execSync('git rev-parse --short HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    }).trim();

    if (!shortSha) {
      return null;
    }

    return `Commit ${shortSha}`;
  } catch (error) {
    statusLog('Failed to read runtime git commit for status footer.', error);
    return null;
  }
}

function getRuntimeCommitShas() {
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

    return { fullSha, shortSha };
  } catch (error) {
    statusLog('Failed to read runtime git commit for status footer.', error);
    return null;
  }
}

async function isRuntimeCommitLatestOnGithub(runtimeCommit) {
  if (!runtimeCommit) {
    return false;
  }

  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'CheekyCharlie'
  };

  if (process.env.GITHUB_KEY) {
    headers.Authorization = `token ${process.env.GITHUB_KEY}`;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
      headers
    });

    if (!response.ok) {
      return false;
    }

    const commits = await response.json();
    const latestGithubSha = Array.isArray(commits) ? commits[0]?.sha : null;
    return Boolean(latestGithubSha && latestGithubSha === runtimeCommit.fullSha);
  } catch (error) {
    statusLog('Failed to compare runtime commit against GitHub head.', error);
    return false;
  }
}

async function buildStatusEmbed(content, options = {}) {
  const embed = new EmbedBuilder()
    .setDescription(content)
    .setColor(options.color || STATUS_EMBED_COLOR);

  if (options.includeCommitFooter) {
    const runtimeCommit = getRuntimeCommitShas();
    const isLatest = await isRuntimeCommitLatestOnGithub(runtimeCommit);
    const footerText = runtimeCommit
      ? `Commit ${runtimeCommit.shortSha}${isLatest ? ' ✅' : ''}`
      : getRuntimeCommitFooter();

    if (footerText) {
      embed.setFooter({ text: footerText });
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
