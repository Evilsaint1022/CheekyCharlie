// Index.js -------------------------------------------------------------------------------------------------------------------------
//
// ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
//             Created by Evilsaint1022
// ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
//
// ------------------------------------------------- @Index.js ----------------------------------------------------------------------

require('dotenv').config({ quiet: true });
const { loadEvents } = require('../src/Handlers/eventHandler');
const { registerCommands } = require('./register-commands');
const { loadFunctions }  = require('./Handlers/functionHandler');
const registerAIHandler = require('./Handlers/AI-Handler');
const commandHandler = require('../src/Handlers/commandHandler');
const PrefixCommands = require('../src/Handlers/prefixcommandsHandler');

// Database -------------------------------------------------------------------------------------------------------------------------
const db = require('../src/Handlers/database');
const { sendEarlyStatusMessage, sendStatusMessage, shutdownBot } = require('./Utilities/StatusChannel/statusNotifier');

// Show Guilds ----------------------------------------------------------------------------------------------------------------------
const showGuilds = require('./ShowGuilds/showguilds');

const { Client, Collection, Partials, GatewayIntentBits, ActivityType, } = require('discord.js');
const { user, Message, GuildMember, ThreadMember, Channel, Reaction, User, GuildScheduledEvent, SoundboardSound } = Partials;

// Load Console Colors --------------------------------------------------------------------------------------------------------------

const colors = require('colors'); // For console colors
// loads colors globally for console use.

// ----------------------------------------------------------------------------------------------------------------------------------
const client = new Client({
    intents: 53608447, // All intents
    partials: [user, Message, GuildMember, ThreadMember, Channel, Reaction, User, GuildScheduledEvent, SoundboardSound],
    // All partials
});

// Collections for commands and events ---------------------------------------------------------------------------------------------

client.events = new Collection();
client.commands = new Collection();
client.prefixCommands = new Collection();

// Deployment timestamp (Unix seconds) — set once at process start
client.startupTime = Math.floor(Date.now() / 1000);

// Ready Event ---------------------------------------------------------------------------------------------------------------------
client.once("clientReady", async () => {
    console.log(`🌿・${client.user.tag} Is Starting Up!`.bold.white);
    await sendStatusMessage(client, 'Cheeky Charlie is back online.', {
      includeCommitFooter: true
    });

    // Registers Application Commands
    registerCommands(client);

    // Wait Imports to fully load
    await showGuilds(client);
    await loadFunctions(client);
    await loadEvents(client);
    await commandHandler(client);
    await PrefixCommands(client);
    await registerAIHandler(client);

    // Status Toggles
    const normal = true;
    const down = false;
    const issues = false;

    // Status Groups
    const normalstatus = [
    "Shopping at the Four-Square",
    "Made in New Zealand",
    "Stocking Shelves",
    "Packing up the boxes",
    "Stocking the Fridges",
    "Helping a Customer",
    "Greeting Customers at the Door",
    "Made by the people for the people!",
    "mee6 who? I'm CheekyCharlie!",
    "Serving up some cheeky vibes",
    "Here to brighten your day!",
    "Your friendly neighborhood bot",
    "Spreading smiles and good vibes",
    "CheekyCharlie at your service!",
    "Bringing the fun to your server",
    "Making your day a little cheekier",
    "Here to make you smile",
    "Your daily dose of cheekiness"
];

const downstatus = [
    "🔴・𝗖𝘂𝗿𝗿𝗲𝗻𝘁𝗹𝘆 𝗗𝗼𝘄𝗻",
    "🔧・Server Restarting Soon"
];

const issuesstatus = [
    "⚠️・Experiencing Issues"
];

// Combine all enabled statuses
const activeStatuses = [
    ...(normal ? normalstatus : []),
    ...(down ? downstatus : []),
    ...(issues ? issuesstatus : [])
];

// Set Activity
setInterval(() => {
    if (activeStatuses.length === 0) return; // Prevent crash if no statuses are enabled
    const activity = activeStatuses[Math.floor(Math.random() * activeStatuses.length)];
    client.user.setActivity(activity, { type: ActivityType.Custom });
}, 5000);

    // CheekyCharlie is Online!
    console.log(`🌿・${client.user.tag} Is Online!`.bold.white);
    console.log(`Successfully Finished Startup`.bold.white);
});

// Interaction Command Handler -----------------------------------------------------------------------------------------------------

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`[Slash Command Error] /${interaction.commandName}:`, error);
        const reply = { content: 'There was an error while executing this command!', flags: 64 };
        try {
            if (interaction.replied || interaction.deferred)
                await interaction.followUp(reply);
            else
                await interaction.reply(reply);
        } catch { /* interaction expired or already cleaned up */ }
    }
});

// Prefix Command Handler -----------------------------------------------------------------------------------------------------------

client.defaultPrefix = "?"; // 👈 default fallback prefix

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;

  // 👇 GET SETTINGS FROM DB
  const settings = await db.settings.get(guildId);

  // 👇 USE DB PREFIX OR FALLBACK
  const prefix = settings?.prefix || client.defaultPrefix;

  if (!message.content.startsWith(prefix)) return;

  const trimmedContent = message.content.slice(prefix.length).trimStart();
  if (!trimmedContent) return;

  const firstWhitespaceIndex = trimmedContent.search(/\s/);
  const commandName = (
    firstWhitespaceIndex === -1
      ? trimmedContent
      : trimmedContent.slice(0, firstWhitespaceIndex)
  ).toLowerCase();
  const rawArgs = firstWhitespaceIndex === -1
    ? ''
    : trimmedContent.slice(firstWhitespaceIndex).trimStart();
  const args = rawArgs ? rawArgs.trim().split(/\s+/) : [];

  message.rawArgs = rawArgs;
  
  const command =
    client.prefixCommands.get(commandName) ||
    client.prefixCommands.find(cmd => cmd.aliases?.includes(commandName));

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`[Prefix Command Error] ${commandName}:`, error);
  }
});

const handleTerminationSignal = async (signal) => {
  await shutdownBot(client, {
    exitCode: 0,
    reason: signal
  });
};

process.once('SIGTERM', () => {
  handleTerminationSignal('SIGTERM');
});

process.once('SIGINT', () => {
  handleTerminationSignal('SIGINT');
});

// Client Login ---------------------------------------------------------------------------------------------------------------------
sendEarlyStatusMessage('Starting...').catch((error) => {
  console.error('Failed to send early startup status message:', error);
});

client.login(process.env.TOKEN);
