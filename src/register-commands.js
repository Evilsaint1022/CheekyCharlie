// Register-Commands.js ---------------------------------------------------------------------------------------------------------------------------------

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

// ------------------------------------------------- @Everyone Application Commands ---------------------------------------------------------------------
const commands = [
    {
        name: 'ping',
        description: 'Checks the bot latency!',
    },
    {
        name: 'avatar',
        description: 'Displays the avatar of a specified user or your own.',
        options: [
            {
                name: 'user',
                description: 'The user whose avatar you want to see',
                type: 6,
                required: false,
            },
        ],
    },
    {
        name: 'cat',
        description: 'Get a random cat image from The Cat API',
    },
    {
        name: 'dog',
        description: 'Get a random dog image from The Dog API',
    },
    {
        name: 'github',
        description: 'Get the Evilsaint1022 GitHub Repository link',
    },
    {
        name: 'balance',
        description: "Check your current balance or another user's balance.",
        options: [
            {
                name: 'user',
                description: 'The user to check the balance of',
                type: 6,
                required: false,
            },
        ]
    },
    {
        name: 'daily',
        description: 'Claim your daily coins!',
    },
    {
        name: 'invite',
        description: 'Invite your friends!',
    },
    {
        name: 'deposit',
        description: 'Deposit points from your Wallet to your Bank.',
        options: [
            {
                name: 'amount',
                description: 'The amount of points to deposit.',
                type: 4,
                required: true,
            },
        ]
    },
    {
        name: 'withdraw',
        description: 'Withdraw points from your Bank to your Wallet.',
        options: [
            {
                name: 'amount',
                description: 'The amount of points to withdraw.',
                type: 4,
                required: true,
            },
        ]
    },
    {
        name: 'leaderboard',
        description: 'Displays The Leaderboard',
    },
    {
        name: 'level', 
        description: 'Check your current level or another user\'s level.',
        options: [
            {
                name: 'user',
                description: 'The user to check the level of',
                type: 6,
                required: false,
            },
        ]
    },
    {
        name: 'pick',
        description: 'Pick up the dropped ferns for points!',
    },

    // ------------------------------------------------- @Staff Application Commands ------------------------------------------------------------------------

    {
        name: 'echo',
        description: 'Replies with the message you provide',
        options: [
            {
                name: 'message',
                description: 'The message to echo back',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'setwhitelistedroles',
        description: 'Sets the whitelisted roles for the echo command',
        options: [
            {
                name: 'role',
                description: 'Role to whitelist',
                type: 8,
                required: true,
            },
        ],
    },
    {
        name: 'removewhitelistedroles',
        description: 'Removes a role from the whitelisted roles for the echo command',
        options: [
            {
                name: 'role',
                description: 'Role to remove from whitelist',
                type: 8,
                required: true,
            },
        ],
    },
    {
        name: 'setlevelchannel',
        description: 'Set the channel where level-up messages will be sent',
        options: [
            {
                name: 'channel',
                description: 'The channel to send level-up messages',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'removelevelchannel',
        description: 'Remove the channel where level-up messages are sent',
    },
    {
        name: 'set-party-drop-channel',
        description: 'Set the channel where the party drops will go',
        options: [
            {
                name: 'channel',
                description: 'The channel to set for party drops',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-party-drop-channel',
        description: 'Remove the configured party drops channel',
    },
];

// Rest -------------------------------------------------------------------------------------------------------------------------------------------------

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Register Commands ------------------------------------------------------------------------------------------------------------------------------------
// This function will register the commands either globally or for a specific guild based on the environment.
const registerCommands = async (client) => {
    try {
        // Fetch existing commands from Discord API to prevent duplicates
        let existingCommands = [];
        if (process.env.GUILD_ID) {
            console.log(`Checking existing commands for the guild with ID: ${process.env.GUILD_ID}`);
            existingCommands = await rest.get(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
            );
        } else {
            existingCommands = await rest.get(
                Routes.applicationCommands(process.env.CLIENT_ID)
            );
        }

        // Filter out the commands that are already registered
        const newCommands = commands.filter(command => {
            return !existingCommands.some(existingCommand => existingCommand.name === command.name);
        });

        if (newCommands.length > 0) {
            // Register only the new commands
            if (process.env.GUILD_ID) {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                    { body: [...existingCommands, ...newCommands] }
                );
            } else {
                await rest.put(
                    Routes.applicationCommands(process.env.CLIENT_ID),
                    { body: [...existingCommands, ...newCommands] }
                );
            }
        } else {
        }
    } catch (err) {
        console.error('Error registering commands:', err);
    }
};

// Exporting Register Commands --------------------------------------------------------------------------------------------------------------------------------

module.exports = { registerCommands };
