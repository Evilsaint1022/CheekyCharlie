// Index.js -------------------------------------------------------------------------------------------------------------------------
//
// ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
//      ❤️ Created by Evilsaint1022 & NZ-Linix ❤️
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

if (process.env.DEV_MODE == "true") {

// Testing Status Emojis
 Red = `<:Red:1542465623139819541>`;
 Orange = `<:Orange:1542465612125704192>`;
 Green = `<:Green:1542465573609275532>`;

} else {

// Production Status Emojis
Red = `<:Red:1505107804808282112>`;
Orange = `<:Orange:1505107802824118342>`;
Green = `<:Green:1505107801050189895>`;
}


// Ready Event ---------------------------------------------------------------------------------------------------------------------
client.once("clientReady", async () => {

    console.log(`🌿・${client.user.tag} Is Starting Up!`.bold.white);

    await sendStatusMessage(client, `${Green} ***CheekyCharlie is Online.***`, {
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

    // Status Groups
    const normalstatus = [
    "Shopping at the Four-Square",
    "Made in New Zealand",
    "Stocking the Shelves",
    "Packing up the Boxes",
    "Stocking the Fridges",
    "Helping a Customer",
    "Greeting Customers at the Door",
    "Working the Night Shift",
    "On the Checkout",
    "Scanning Some Groceries",
    "Restocking the Aisles",
    "Checking the Stock",
    "Taking a Lunch Break",
    "Having a Quick Cuppa",
    "Keeping the Shelves Full",
    "Making the Store Cheeky",
    "Serving Up Some Cheeky Vibes",
    "Bringing the Good Vibes",
    "Here to Brighten Your Day!",
    "Your Friendly Neighbourhood Bot",
    "Spreading Smiles & Good Vibes",
    "CheekyCharlie at Your Service!",
    "Bringing the Fun to Your Server",
    "Making Your Server a Little Cheekier",
    "Here to Make You Smile",
    "Your Daily Dose of Cheekiness",
    "Keeping Things Cheeky",
    "Just Being a Little Cheeky",
    "Powered by Kiwi Ingenuity",
    "100% Kiwi Made",
    "Freshly Made in Aotearoa",
    "Straight From the Four-Square",
    "Keeping It Kiwi",
    "Living the Kiwi Life",
    "Having a Cheeky Moment",
    "Probably Causing Trouble",
    "Definitely Up to Something",
    "Doing Bot Things",
    "Pretending to Work",
    "Working Hard or Hardly Working",
    "Checking My Notifications",
    "Waiting for Someone to Say Hi",
    "Keeping an Eye on Things",
    "Watching the Server",
    "Patrolling the Aisles",
    "Avoiding the Checkout Queue",
    "Looking for the Good Snacks",
    "Buying the Last Packet of Shapes",
    "Having a Cheeky Snack",
    "Where's the L&P?",
    "Someone Say Fish & Chips?",
    "Putting the Kettle On",
    "Sweet As, Bro!",
    "Yeah, Nah, I'm Working",
    "Chur, I'm On It!",
    "No Worries, I'm Here",
    "Keeping the Server Fresh",
    "Fresh Outta the Four-Square",
    "Serving Fresh Bot Vibes",
    "The Cheekiest Bot in Aotearoa"
];

// Combine all enabled statuses
const activeStatuses = [
    ...(normal ? normalstatus : [])
];

// Set Activity
setInterval(() => {
    if (activeStatuses.length === 0) return; // Prevent crash if no statuses are enabled
    const activity = activeStatuses[Math.floor(Math.random() * activeStatuses.length)];
    client.user.setActivity(activity, { type: ActivityType.Custom });
}, 5000);

    // CheekyCharlie is Online!
    console.log(`🌿・${client.user.tag} Is Online!`.bold.white);
    console.log(`🌿・Successfully Finished Startup!`.bold.white);
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
sendEarlyStatusMessage(`${Orange} ***Starting...***`).catch((error) => {
  console.error('Failed to send early startup status message:', error);
});

client.login(process.env.TOKEN);
