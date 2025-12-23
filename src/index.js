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

// Global Variables ----------------------------------------------------------------------------------------------------------------
client.prefix = "!"; // 👈 PREFIX DEFINED HERE

// Ready Event ---------------------------------------------------------------------------------------------------------------------
client.once("clientReady", async () => {
    console.log(`🌿・${client.user.tag} Is Starting Up!`.bold.white);

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
    "🌿Shopping at the Four-Square",
    "🌿Made in New Zealand",
    "🌿Stocking Shelves",
    "🌿Packing up the boxes",
    "🌿Stocking the Fridges",
    "🌿message me if you have any issues.",
    "🌿Helping a Customer",
    "🌿Bisechosting",
    "🌿Greeting Customers at the Door"
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

    // Bisechosting Finished Startup!
    console.log(`successfully finished startup`.bold.green);
    // CheekyCharlie is Online!
    console.log(`🌿・${client.user.tag} Is Online!`.bold.white);
});

// Interaction Command Handler -----------------------------------------------------------------------------------------------------

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 });
    }
});

// Prefix Command Handler -----------------------------------------------------------------------------------------------------------

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(client.prefix)) return;

  const args = message.content
    .slice(client.prefix.length)
    .trim()
    .split(/ +/);

  const commandName = args.shift().toLowerCase();
  const command = client.prefixCommands.get(commandName);

  if (!command) return;

  await command.execute(message, args, client);
});

// Client Login ---------------------------------------------------------------------------------------------------------------------
client.login(process.env.TOKEN);