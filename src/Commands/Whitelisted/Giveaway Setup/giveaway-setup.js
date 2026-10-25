const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-setup')
        .setDescription('Configure giveaway whitelist, blacklist and winner role settings')
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
                .setName('set-given-role')
                .setDescription('Set a role that is given to giveaway winners')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to give to giveaway winners')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-given-role')
                .setDescription('Stop giving a role to giveaway winners')
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
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        const settingsKey = `${guildId}`;
        const settings = await db.giveaway_settings.get(settingsKey) || {
            whitelistEnabled: false,
            blacklistEnabled: false,
            whitelistedRoles: [],
            blacklistedRoles: [],
            givenRole: null
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

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Whitelist ${settings.whitelistEnabled ? 'enabled' : 'disabled'} by ${interaction.user.username}`);
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

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Role ${whitelistRole.name} added to whitelist by ${interaction.user.username}`);
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

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Role ${removeWhitelistRole.name} removed from whitelist by ${interaction.user.username}`);
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

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Blacklist ${settings.blacklistEnabled ? 'enabled' : 'disabled'} by ${interaction.user.username}`);
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

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Role ${blacklistRole.name} added to blacklist by ${interaction.user.username}`);
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

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Role ${removeBlacklistRole.name} removed from blacklist by ${interaction.user.username}`);
                break;

            case 'set-given-role':

                const givenRole = interaction.options.getRole('role');

                // The bot can't give @everyone, integration/bot roles, or roles above its own highest role
                if (givenRole.id === guildId || givenRole.managed || !givenRole.editable) {
                    return interaction.reply({ 
                        content: `❌ I can't give ${givenRole} to members. Make sure it isn't @everyone or a bot/integration role, that I have the **Manage Roles** permission, and that my highest role is above it.`, 
                        flags: 64 
                    });
                }

                if (settings.givenRole === givenRole.id) {
                    return interaction.reply({ 
                        content: `❌ ${givenRole} is already the giveaway given role!`, 
                        flags: 64 
                    });
                }

                settings.givenRole = givenRole.id;
                await db.giveaway_settings.set(settingsKey, settings);
                await interaction.reply({ 
                    content: `✅ ${givenRole} will now be given to giveaway winners and automatically removed after 1 month.`, 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Given role set to ${givenRole.name} by ${interaction.user.username}`);
                break;

            case 'remove-given-role':

                if (!settings.givenRole) {
                    return interaction.reply({ 
                        content: '❌ There is no giveaway given role set!', 
                        flags: 64 
                    });
                }

                settings.givenRole = null;
                await db.giveaway_settings.set(settingsKey, settings);
                await interaction.reply({ 
                    content: '✅ Giveaway winners will no longer be given a role.', 
                    flags: 64 
                });

                console.log(`[🎉] [GIVEAWAY SETUP] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Given role removed by ${interaction.user.username}`);
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
                        `**Blacklisted Roles:** ${blacklistRoleNames}\n\n` +
                        `**Winner Given Role:** ${settings.givenRole ? `<@&${settings.givenRole}> (removed after 1 month)` : 'None'}`,
                    flags: 64
                });
                break;
                
        }
    },
};
