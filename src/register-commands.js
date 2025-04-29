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
        name: 'set-whitelisted-roles',
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
        name: 'remove-whitelisted-roles',
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
        name: 'set-level-channel',
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
        name: 'remove-level-channel',
        description: 'Remove the channel where level-up messages are sent',
    },
    {
        name: 'set-partydrop-channel',
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
        name: 'remove-partydrop-channel',
        description: 'Remove the configured party drops channel',
    },
    {
        name: 'set-join-to-create-vc',
        description: 'Set the Voice channel for the join to create feature',
        options: [
            {
                name: 'channel',
                description: 'The channel to set for the join to create feature',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-join-to-create-vc',
        description: 'Remove the configured join to create channel',
    },
    {
        name: "starboard-set-channel",
        description: "Set the channel where starboard messages will be sent",
        options: [
            {
                name: "channel",
                description: "The channel to set for starboard messages",
                type: 7,
                required: true,
            }
        ]
    },
    {
        name: "starboard-set-count",
        description: "Set how many reactions are needed to send a message to the starboard",
        options: [
            {
                name: "count",
                description: "The number of reactions needed to send a message to the starboard",
                type: 10,
                required: true,
            }
        ]
    },
    {
        name: "starboard-set-emoji",
        description: "Set the emoji used for starboard reactions",
        options: [
            {
                name: "emoji",
                description: "The emoji to use for starboard reactions",
                type: 3,
                required: true,
            }
        ]
    },
];

// Rest -------------------------------------------------------------------------------------------------------------------------------------------------

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Register Commands ------------------------------------------------------------------------------------------------------------------------------------
// This function will register the commands either globally or for a specific guild based on the environment.
const registerCommands = async (client) => {
    try {
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
        }
    } catch (err) {
        console.error('Error registering commands:', err);
    }
};

// Exporting Register Commands --------------------------------------------------------------------------------------------------------------------------------

module.exports = { registerCommands };
