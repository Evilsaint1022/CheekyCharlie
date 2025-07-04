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
        options: [
            {
                name: 'type',
                description: 'Which leaderboard would you like to see?',
                type: 3,
                required: true,
                choices: [
                    { name: 'Balance', value: 'balance' },
                    { name: 'Level', value: 'level' },
                ],
            },
        ]
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
    {  
        name: 'blackjack',
        description: 'Play a game of Blackjack!',
        options: [
            {
                name: 'bet',
                description: 'The amount of points to bet.',
                type: 4,
                required: true,
            },
        ]
    },
    {
        name: 'pay',
        description: 'Transfer points to another member.',
        options: [
           {
               name: 'user',
               description: 'The member to whom you want to transfer points.',
               type: 6,
               required: true,
           },
           {
               name: 'amount',
               description: 'The number of points to transfer.',
               type: 4,
               required: true,
           },
       ],
    },
    {
        name: 'shop',
        description: 'View the items available in the shop.',
    },
    {
        name: 'buy',
        description: 'Buy an item from the shop.',
    },
    {
        name: 'use',
        description: 'Use an item from your inventory.',
    },
    {
        name: 'refund',
        description: 'Refund an item from your inventory and get your coins back.',
    },
    {
        name: 'inventory',
        description: 'View your inventory.',
        options: [
            {
                name: 'user',
                description: 'The user to view their inventory.',
                type: 6,
                required: false,
            },
        ]
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
    {
        name: "set-verified-role",
        description: "Set the role to assign to verified members.",
        options: [
            {
                name: "role",
                description: "The role to assign to verified members.",
                type: 8,
                required: true,
            }
        ]
    },
    {
        name: "remove-verified-role",
        description: "Remove the currently set verified role.",
    },
    {
        name: "set-bump-channel",
        description: "Set the channel where bump messages will be sent.",
        options: [
            {
                name: "channel",
                description: "The channel to set for bump messages.",
                type: 7,
                required: true,
            }
        ]
    },
    {
        name: "set-bump-role",
        description: "Set the role to assign or mention during bumps.",
        options: [
            {
                name: "role",
                description: "The role to assign or mention during bumps.",
                type: 8,
                required: true,
            }
        ]
    },
    {
        name: "set-modmail-channel",
        description: "Set the channel where the modmail will be sent.",
        options: [
            {
                name: "channel",
                description: "The channel to set for modmail messages.",
                type: 7,
                required: true,
            }
        ]
    },
    {
        name: "set-level-role",
        description: "Assigns a role to a specific level.",
        options: [
            {
                name: "level",
                description: "The level to assign the role to",
                type: 4,
                required: true,
            },
            {
                name: "role",
                description: "The role to assign at that level",
                type: 8,
                required: true,
            },
            {
                name: "sticky",
                description: "Whether to keep this role permanently",
                type: 5,
                required: false,
            }
        ]
    },
    {
        name: "remove-level-role",
        description: "Removes the role assigned to a specific level.",
        options: [
            {
                name: "level",
                description: "The level to remove the role from",
                type: 4,
                required: true,
            }
        ]
    },
    {
        name: "toggle-nsfw-filter",
        description: "Toggle the NSFW filter for the server.",
    },
    {
        name: "set-nsfw-logs-channel",
        description: "Set the channel where NSFW logs will be sent.",
        options: [
            {
                name: "channel",
                description: "The channel to set as the NSFW logs channel.",
                type: 7,
                required: false,
            }
        ]
    },
    {
        name: "remove-nsfw-logs-channel",
        description: "Remove the NSFW logs channel for the server.",
    },
    {
        name: 'set-ignored-ai-channel',
        description: 'Add a channel or category to the ignored AI channels list.',
        options: [
            {
                name: 'channel-or-category',
                description: 'The channel or category to ignore AI responses in',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-ignored-ai-channel',
        description: 'Remove a channel or category from the ignored AI channels list.',
        options: [
            {
                name: 'channel-or-category',
                description: 'The channel or category to remove.',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'add-shop-item',
        description: 'Add a new item to the shop.',
        options: [
            {
                name: 'title',
                description: 'The name of the item.',
                type: 3,
                required: true,
            },
            {
                name: 'description',
                description: 'A description of the item.',
                type: 3,
                required: true,
            },
            {
                name: 'role',
                description: 'The role ID granted by purchasing this item.',
                type: 8,
                required: true,
            },
            {
                name: 'price',
                description: 'The price of the item.',
                type: 4,
                required: true,
            },
            {
                name: 'stock',
                description: 'The amount of this item available (leave empty for unlimited).',
                type: 4,
                required: false,
            },
        ]
    },
    {
        name: 'remove-shop-item',
        description: 'Remove an item from the shop by its title.',
        options: [
            {
                name: 'title',
                description: 'The exact title of the shop item to remove',
                type: 3,
                required: true,
            },
        ]
    },
    {
        name: 'edit-shop-item',
        description: 'Edit an item in the shop by its title.',
        options: [
            {
                name: 'current_title',
                description: 'The current title of the item to edit',
                type: 3,
                required: true,
            },
            {
                name: 'new_title',
                description: 'The exact title of the shop item to edit',
                type: 3,
                required: false,
            },
            {
                name: 'description',
                description: 'New description (optional)',
                type: 3,
                required: false,

            },
            {
                name: 'role',
                description: 'The role ID granted by purchasing this item.',
                type: 8,
                required: false,
            },
            {
                name: 'price',
                description: 'The price of the item.',
                type: 4,
                required: false,
            },
            {
                name: 'stock',
                description: 'The amount of this item available (leave empty for unlimited).',
                type: 4,
                required: false,
            },
        ]
    },
    {
        name: 'set-rss-channel',
        description: 'The channel where rss news will be sent',
        options: [
            {
                name: 'channel',
                description: 'The channel to set for rss news',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-rss-channel',
        description: 'Remove the channel where rss news will be sent',
    },
    {
        name: 'set-rss-topics',
        description: 'Set the topics for the RSS News Channel',
    }
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
