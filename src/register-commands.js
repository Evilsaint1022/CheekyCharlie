// Register-Commands.js ---------------------------------------------------------------------------------------------------------------------------------

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

// ------------------------------------------------- @Everyone Application Commands ---------------------------------------------------------------------
const commands = [
    {
        name: 'help',
        description: 'Get a list of available commands.',
    },
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
        name: 'invite',
        description: 'Invite your friends!',
    },
    {
        name: 'blackjack-singleplayer',
        description: 'Play a game of blackjack and bet your balance!',
        options: [
            {
                name: 'bet',
                description: 'The amount to bet',
                type: 4,
                required: true,
            },
        ],
    },
    {
        name: 'blackjack-duels',
        description: 'Challenge another member to a blackjack game and bet your balance!',
        options: [
            {
                name: 'opponent',
                description: 'The member you want to challenge',
                type: 6,
                required: true,
            },
            {
                name: 'bet',
                description: 'The amount to bet',
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
        description: 'Refund an item from your inventory and get your ferns back.',
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
    {
        name: 'lock-vc',
        description: 'Locks the voice channel.',
    },
    {
        name: 'unlock-vc',
        description: 'Unlocks the voice channel.',
    },
    {
        name: 'ai-search',
        description: 'Search for results using AI.',
        options: [
            {
                name: 'query',
                description: 'What do you want to search for?',
                type: 3,
                required: true,
            },
        ]
    },
    {
        name: 'staff-apply',
        description: 'Apply to become a staff member.',
    },
    {
        name: 'venting',
        description: 'Vent something to the vent channel.',
        options: [
            {
                name: 'message',
                description: 'What do you want to vent?',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'russian-roulette',
        description: 'Challenge another member to Russian Roulette. Winner takes the pot.',
        options: [
            {
                name: 'target',
                description: 'Member to challenge',
                type: 6,
                required: true,
            },
            {
                name: 'bet',
                description: 'Amount to bet',
                type: 4,
                required: true,
            },
        ],
    },
    {
        name: 'emoji',
        description: 'Show a custom emoji as an image (PNG/GIF).',
        options: [
            {
                name: 'emoji',
                description: 'Enter the emoji',
                type: 3,
                required: true,
            },
        ],
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
        name: "set-starboard-channel",
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
        name: "set-starboard-count",
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
        name: "set-starboard-emoji",
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
    },
    {
        name: 'toggle-levels',
        description: 'Toggle the levels feature on or off for this server.',
    },
    {
        name: 'set-counting-channel',
        description: 'Set the channel where the counting game will happen.',
        options: [
            {
                name: 'channel',
                description: 'The counting channel',
                type: 7,
                required: true,
            },
        ]
    },
    {
        name: 'remove-counting-channel',
        description: 'Remove the counting channel.',
    },
    {
        name: 'set-counting-emojis',
        description: 'Set the custom counting emojis.',
        options: [
            {
                name: 'correct_emoji',
                description: 'Emoji to show when the number is correct',
                type: 3,
                required: true,
            },
            {
                name: 'wrong_emoji',
                description: 'Emoji to show when the number is wrong',
                type: 3,
                required: true,
            },
        ]
    },
    {
        name: 'remove-counting-emojis',
        description: 'Reset the custom emojis for counting feedback.',
    },
    {
        name: 'set-color-of-the-week',
        description: 'Set the color of the week Role.',
        options: [
            {
                name: 'role',
                description: 'The role to update colors on',
                type: 8,
                required: true,
            },
        ]
    },
    {
        name: 'remove-color-of-the-week',
        description: 'Remove the Color of the Week role setting for this server.',
    },
    {
        name: 'set-story-channel',
        description: 'Set the channel where the story game will happen.',
        options: [
            {
                name: 'channel',
                description: 'The story channel',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-story-channel',
        description: 'Remove the currently set story channel.',
    },
    {
        name: 'view-one-word-story',
        description: 'View the current one-word story.',
    },
    {
        name: 'reset-one-word-story',
        description: 'Reset the current one-word story.',
    },
    {
        name: 'set-boosters-role',
        description: 'Set the server boosters role.',
        options: [
            {
                name: 'role',
                description: 'Select the boosters role',
                type: 8,
                required: true,
            },
        ]
    },
    {
        name: 'remove-boosters-role',
        description: 'Remove the server boosters role.',
    },
    {
        name: 'set-staff-app-channel',
        description: 'Set the channel where staff applications will be posted.',
        options: [
            {
                name: 'channel',
                description: 'The channel for staff applications',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-staff-app-channel',
        description: 'Remove the staff application channel.',
    },
    {
        name: 'accept-application',
        description: 'Accept a staff application (use in application thread).',
    },
    {
        name: 'decline-application',
        description: 'Decline a staff application (use in application thread).',
        options: [
            {
                name: 'reason',
                description: 'Reason for declining the application',
                type: 3,
                required: false,
            },
        ],
    },
    {
        name: 'manage-staff-apps-questions',
        description: 'Manage staff application questions with an interactive GUI.',
    },
    {
        name: 'set-deadchat-channel',
        description: 'Set the channel where deadchat messages will be sent',
        options: [
            {
                name: 'channel',
                description: 'The channel to send deadchat messages',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'set-deadchat-duration',
        description: 'Set the duration for Deadchat messages to be sent.',
        options: [
            {
                name: 'duration',
                description: 'The duration in seconds',
                type: 4,
                required: true,
            },
        ],
    },
    {
        name: 'set-deadchat-role',
        description: 'Set the role to to mention in deadchat messages.',
        options: [
            {
                name: 'role',
                description: 'The role to mention.',
                type: 8,
                required: true,
            },
        ],
    },
    {
        name: 'toggle-deadchat',
        description: 'Toggle the AI Deadchat messages for the server.',
    },
    {
        name: 'set-vent-channel',
        description: 'Set the channel where vent confessions will be sent',
        options: [
            {
                name: 'channel',
                description: 'The channel to set for vent confessions',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-vent-channel',
        description: 'Remove the current vent channel',
    },
    {
        name: 'stop',
        description: 'Staff command to calm down the server.',
    },
    {
        name: 'giveaway',
        description: 'Create a giveaway',
        options: [
            {
                name: 'prize',
                description: 'The prize for the giveaway',
                type: 3,
                required: true,
            },
            {
                name: 'duration',
                description: 'Duration in minutes',
                type: 4,
                required: true,
            },
            {
                name: 'winners',
                description: 'Number of winners (default: 1)',
                type: 4,
                required: false,
            },
        ],
    },
    {
        name: 'giveaway-setup',
        description: 'Configure giveaway participation whitelist and blacklist settings',
        options: [
            {
                name: 'whitelist',
                description: 'Toggle whitelist - only whitelisted roles can join giveaways',
                type: 1,
            },
            {
                name: 'whitelist-add-role',
                description: 'Add a role that can join giveaways',
                type: 1,
                options: [
                    {
                        name: 'role',
                        description: 'The role to allow joining giveaways',
                        type: 8,
                        required: true,
                    },
                ],
            },
            {
                name: 'whitelist-remove-role',
                description: 'Remove a role from the giveaway participation whitelist',
                type: 1,
                options: [
                    {
                        name: 'role',
                        description: 'The role to remove',
                        type: 8,
                        required: true,
                    },
                ],
            },
            {
                name: 'blacklist',
                description: 'Toggle blacklist - blacklisted roles cannot join giveaways',
                type: 1,
            },
            {
                name: 'blacklist-add-role',
                description: 'Add a role that cannot join giveaways',
                type: 1,
                options: [
                    {
                        name: 'role',
                        description: 'The role to prevent from joining giveaways',
                        type: 8,
                        required: true,
                    },
                ],
            },
            {
                name: 'blacklist-remove-role',
                description: 'Remove a role from the giveaway participation blacklist',
                type: 1,
                options: [
                    {
                        name: 'role',
                        description: 'The role to remove',
                        type: 8,
                        required: true,
                    },
                ],
            },
            {
                name: 'view',
                description: 'View current giveaway settings',
                type: 1,
            },
        ],
    },
    {
        name: 'set-bankinterest-channel',
        description: 'Set the bank interest channel for this server.',
        options: [
            {
                name: 'channel',
                description: 'The channel to set for bank interest messages.',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-bankinterest-channel',
        description: 'Removes the bank interest channel for this server.',
    },
    {
        name: 'set-qotd-channel',
        description: 'Set the channel where the Question of the Day will be sent.',
        options: [
            {
                name: 'channel',
                description: 'The channel to set for QOTD messages.',
                type: 7,
                required: true,
            },
        ],
    },
    {
        name: 'remove-qotd-channel',
        description:  'Removes the channel where the Question of the Day will be sent.',
    },
    {
        name: 'set-qotd-role',
        description: 'Set the role to mention for Question of the Day.',
        options: [
            {
                name: 'role',
                description: 'The role to mention for QOTD.',
                type: 8,
                required: true,
            },
        ],
    },
    {
        name: 'remove-qotd-role',
        description: 'Removed the role to mention for Question of the Day.'
    },
    {
        name: 'toggle-qotd',
        description: 'Enable or disable the Question of the Day feature.',
    },
    {
        name: 'set-ban-channel',
        description: 'Set the channel where ^banned messages are counted',
        options: [
            {
                name: 'channel',
                description: 'The channel to use for banned messages',
                type: 7,
                required: true
            },
        ],
    },
    {
        name: 'remove-ban-channel',
        description: 'Remove the configured ^banned channel'
    },
    {
        name: 'steal',
        description: 'Steal an emoji and add it to this server',
        options: [
            {
                name: 'emoji',
                description: 'The emoji you want to steal',
                type: 3,
                required: true
            },
            {
                name: 'name',
                description: 'Optional name for the emoji',
                type: 3,
                required: false
            },
        ],
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
