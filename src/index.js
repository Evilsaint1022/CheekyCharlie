// Index.js -------------------------------------------------------------------------------------------------------------------------
//
// ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
//             Created by Evilsaint1022
// ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
//
// ------------------------------------------------- @Index.js ----------------------------------------------------------------------

require('dotenv').config();
const { loadEvents } = require('../src/Handlers/eventHandler');
const commandHandler = require('../src/Handlers/commandHandler');
const { registerCommands } = require('./register-commands');
const registerAIHandler = require('./Handlers/AI-Handler'); // Adjust path if needed
const { Client, Collection, Partials, GatewayIntentBits, ActivityType, } = require('discord.js');
const { user, Message, GuildMember, ThreadMember, Channel, Reaction, User, GuildScheduledEvent, SoundboardSound } = Partials;

// Loading Punycode ------------------------------------------------------------------------------------------------------------

// 🔴 Deprication Error
const punycode = require('punycode/'); // ✅ Uses userland alternative

// @Linix_red can you try have a look at fixing this please <3.

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

// Ready Event ---------------------------------------------------------------------------------------------------------------------

client.once("ready", () => {
    console.log(`[🌿│${client.user.tag} Is Online!]`.bold.green);

    // Registers Application Commands
    registerCommands(client);

    // Loading the Handlers
    loadEvents(client);
    commandHandler(client);

    // loading the AI handler
    registerAIHandler(client);

// Activities Status ---------------------------------------------------------------------------------------------------------------

// Boolean flag to control AFK status
let afkStatus = true; // Set to `true` for AFK, `false` for activities

// Lists of activities
const activities = [
    "Shopping at PaknSave",
    "✌🏻Nek Minnit",
    "Awww Gummon",
    "🗿Built Like a Mitre 10",
    "Made in New Zealand",
    "@ping me for help",
    "Dm if you have any issues."
];

const afk = [
    '🔨 - Under Maintenance',
];

// Set bot activity every 5 seconds based on AFK status
setInterval(() => {
    let activityList;

    if (afkStatus) {
        activityList = afk; // Use AFK list if afkStatus is true
    } else {
        activityList = activities; // Use activities list if afkStatus is false
    }

    const activity = activityList[Math.floor(Math.random() * activityList.length)];
    client.user.setActivity(activity, { type: ActivityType.Custom });
}, 5000); // Update every 5 seconds

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
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

// Bank interest system -------------------------------------------------------------------------------------------------------------

const { startInterest } = require('./bank-interest');
startInterest();

// Client Login ---------------------------------------------------------------------------------------------------------------------

client.login(process.env.TOKEN);
