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

client.once("ready", async () => {
    console.log(`🌿・${client.user.tag} Is Online!`.bold.green);

    // Registers Application Commands
    registerCommands(client);

    // Wait for events and commands to fully load
    await loadEvents(client);
    await commandHandler(client);
    await registerAIHandler(client); // In case it's async

    // Run startup bump reminder
    const { runStartupBumpReminder } = require("./Functions/StartupBumpReminder");
    runStartupBumpReminder(client);

    // Bank interest system
    const { StartInterest } = require('./Functions/bank-interest');
    StartInterest();

    // Bot activity logic
    let afkStatus = true;

    //Activity list
    const activities = [
        "Shopping at PaknSave",
        "✌🏻Nek Minnit",
        "Awww Gummon",
        "🗿Built Like a Mitre 10",
        "Made in New Zealand",
        "@ping me for help",
        "Dm if you have any issues."
    ];

    //Afk Activity list
    const afk = ['🔨 - Under Maintenance'];

    setInterval(() => {
        const list = afkStatus ? afk : activities;
        const activity = list[Math.floor(Math.random() * list.length)];
        client.user.setActivity(activity, { type: ActivityType.Custom });
    }, 5000);

    // ✅ Final startup log, after all handlers & functions are done
    console.log(`successfully finished startup`.bold.green);
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

// Client Login ---------------------------------------------------------------------------------------------------------------------
client.login(process.env.TOKEN);
