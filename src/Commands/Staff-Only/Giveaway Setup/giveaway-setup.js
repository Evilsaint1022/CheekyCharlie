const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-setup')
        .setDescription('Configure giveaway participation whitelist and blacklist settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Toggle whitelist - only whitelisted roles can join giveaways')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist-add-role')
                .setDescription('Add a role that can join giveaways')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to allow joining giveaways')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist-remove-role')
                .setDescription('Remove a role from the giveaway participation whitelist')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist')
                .setDescription('Toggle blacklist - blacklisted roles cannot join giveaways')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist-add-role')
                .setDescription('Add a role that cannot join giveaways')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to prevent from joining giveaways')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist-remove-role')
                .setDescription('Remove a role from the giveaway participation blacklist')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current giveaway settings')
        ),

    async execute(interaction) {
        
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const member = interaction.guild.members.cache.get(userId);
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ 
                content: 'You do not have permission to use this command!', 
                flags: 64 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const settingsKey = `${guildName}_${guildId}`;
        const settings = await db.giveaway_settings.get(settingsKey) || {
            whitelistEnabled: false,
            blacklistEnabled: false,
            whitelistedRoles: [],
            blacklistedRoles: []
        };

        switch (subcommand) {
            case 'whitelist':

                settings.whitelistEnabled = !settings.whitelistEnabled;
                await db.giveaway_settings.set(settingsKey, settings);

                await interaction.reply({ 
                    content: settings.whitelistEnabled 
                        ? '✅ Giveaway participation whitelist has been **enabled**. Only users with whitelisted roles can join giveaways.' 
                        : '✅ Giveaway participation whitelist has been **disabled**. Anyone can now join giveaways.', 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Whitelist ${settings.whitelistEnabled ? 'enabled' : 'disabled'} by ${interaction.user.username}`);
                break;

            case 'whitelist-add-role':

                const whitelistRole = interaction.options.getRole('role');
                if (settings.whitelistedRoles.includes(whitelistRole.id)) {
                    return interaction.reply({ 
                        content: `❌ ${whitelistRole} is already in the whitelist!`, 
                        flags: 64 
                    });
                }

                settings.whitelistedRoles.push(whitelistRole.id);
                await db.giveaway_settings.set(settingsKey, settings);
                await interaction.reply({ 
                    content: `✅ ${whitelistRole} can now join giveaways.`, 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Role ${whitelistRole.name} added to whitelist by ${interaction.user.username}`);
                break;

            case 'whitelist-remove-role':

                const removeWhitelistRole = interaction.options.getRole('role');
                if (!settings.whitelistedRoles.includes(removeWhitelistRole.id)) {
                    return interaction.reply({ 
                        content: `❌ ${removeWhitelistRole} is not in the whitelist!`, 
                        flags: 64 
                    });
                }

                settings.whitelistedRoles = settings.whitelistedRoles.filter(id => id !== removeWhitelistRole.id);
                await db.giveaway_settings.set(settingsKey, settings);
                await interaction.reply({ 
                    content: `✅ ${removeWhitelistRole} has been removed from the giveaway participation whitelist.`, 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Role ${removeWhitelistRole.name} removed from whitelist by ${interaction.user.username}`);
                break;

            case 'blacklist':

                settings.blacklistEnabled = !settings.blacklistEnabled;
                await db.giveaway_settings.set(settingsKey, settings);
                await interaction.reply({ 
                    content: settings.blacklistEnabled 
                        ? '✅ Giveaway participation blacklist has been **enabled**. Users with blacklisted roles cannot join giveaways.' 
                        : '✅ Giveaway participation blacklist has been **disabled**.', 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Blacklist ${settings.blacklistEnabled ? 'enabled' : 'disabled'} by ${interaction.user.username}`);
                break;

            case 'blacklist-add-role':

                const blacklistRole = interaction.options.getRole('role');
                if (settings.blacklistedRoles.includes(blacklistRole.id)) {
                    return interaction.reply({ 
                        content: `❌ ${blacklistRole} is already in the blacklist!`, 
                        flags: 64 
                    });
                }
                settings.blacklistedRoles.push(blacklistRole.id);
                await db.giveaway_settings.set(settingsKey, settings);
                await interaction.reply({ 
                    content: `✅ ${blacklistRole} can no longer join giveaways.`, 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Role ${blacklistRole.name} added to blacklist by ${interaction.user.username}`);
                break;

            case 'blacklist-remove-role':

                const removeBlacklistRole = interaction.options.getRole('role');
                if (!settings.blacklistedRoles.includes(removeBlacklistRole.id)) {
                    return interaction.reply({ 
                        content: `❌ ${removeBlacklistRole} is not in the blacklist!`, 
                        flags: 64 
                    });
                }

                settings.blacklistedRoles = settings.blacklistedRoles.filter(id => id !== removeBlacklistRole.id);
                await db.giveaway_settings.set(settingsKey, settings);
                await interaction.reply({ 
                    content: `✅ ${removeBlacklistRole} has been removed from the giveaway participation blacklist.`, 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString('en-GB')}] ${guildName} - Role ${removeBlacklistRole.name} removed from blacklist by ${interaction.user.username}`);
                break;

            case 'view':

                const whitelistRoleNames = settings.whitelistedRoles.length > 0
                    ? settings.whitelistedRoles.map(id => `<@&${id}>`).join(', ')
                    : 'None';
                const blacklistRoleNames = settings.blacklistedRoles.length > 0
                    ? settings.blacklistedRoles.map(id => `<@&${id}>`).join(', ')
                    : 'None';

                await interaction.reply({
                    content: `**Giveaway Settings for ${guildName}**\n\n` +
                        `**Whitelist:** ${settings.whitelistEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `**Whitelisted Roles:** ${whitelistRoleNames}\n\n` +
                        `**Blacklist:** ${settings.blacklistEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `**Blacklisted Roles:** ${blacklistRoleNames}`,
                    flags: 64
                });
                break;
                
        }
    },
};
