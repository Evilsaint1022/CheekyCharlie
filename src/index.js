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
const buttonHandler = require('./Handlers/buttonHandler');

// Show Guilds ----------------------------------------------------------------------------------------------------------------------
const showGuilds = require('./ShowGuilds/showguilds');

const { Client, Collection, Partials, GatewayIntentBits, ActivityType, MessageFlags } = require('discord.js');
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

// Collections for commands, events, and buttons ---------------------------------------------------------------------------------------------

client.events = new Collection();
client.commands = new Collection();
client.buttons = new Collection();

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
    await buttonHandler(client);
    await registerAIHandler(client);

    // Status Toggles
    const normal = true;
    const down = false;
    const issues = false;

    // Status Groups
    const normalstatus = [
    "Shopping at the Four-Square",
    "✌🏻 Nek Minnit",
    "Awww Gummon",
    "🗿 Built Like a Mitre 10",
    "Made in New Zealand",
    "Dm if you have any issues.",
    "😵 You Cant Park There sir",
    "What Happened Mr Drifta"
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

    // Bisecthosting Finished Startup!
    console.log(`🌿・Successfully finished startup`.bold.white);
    // CheekyCharlie is Online!
    const commandCount = client.commands.size;
    console.log(`🌿・${client.user.tag} Is Online! (${commandCount} commands registered)`.bold.white);
});

// Client Login ---------------------------------------------------------------------------------------------------------------------
client.login(process.env.TOKEN);