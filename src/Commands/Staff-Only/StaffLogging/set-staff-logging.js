const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-staff-logging')
        .setDescription('Set channels for staff logging (welcome, leave, ban, unban, kick)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome')
                .setDescription('Set the channel where welcome messages will be posted.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for welcome messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Set the channel where leave messages will be posted.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for leave messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Set the channel where ban messages will be posted.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for ban messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Set the channel where unban messages will be posted.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for unban messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Set the channel where kick messages will be posted.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel for kick messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');

        if (channel.type !== 0) {
            return interaction.reply({
                content: '❌ Please select a text channel.',
                flags: MessageFlags.Ephemeral
            });
        }

        const guildKey = `${guildName}_${guildId}`;
        const currentSettings = await db.settings.get(guildKey) || {};

        switch (subcommand) {
            case 'welcome':
                currentSettings.welcomeChannel = channel.id;
                await db.settings.set(guildKey, currentSettings);

                console.log(`[👋] [SET-STAFF-LOGGING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} set welcome channel to #${channel.name}`);

                await interaction.reply({
                    content: `✅ Welcome channel set to <#${channel.id}>`,
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'leave':
                currentSettings.leaveChannel = channel.id;
                await db.settings.set(guildKey, currentSettings);

                console.log(`[👋] [SET-STAFF-LOGGING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} set leave channel to #${channel.name}`);

                await interaction.reply({
                    content: `✅ Leave channel set to <#${channel.id}>`,
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'ban':
                currentSettings.banLogChannel = channel.id;
                await db.settings.set(guildKey, currentSettings);

                console.log(`[🔨] [SET-STAFF-LOGGING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} set ban log channel to #${channel.name}`);

                await interaction.reply({
                    content: `✅ Ban log channel set to <#${channel.id}>`,
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'unban':
                currentSettings.unbanLogChannel = channel.id;
                await db.settings.set(guildKey, currentSettings);

                console.log(`[✅] [SET-STAFF-LOGGING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} set unban log channel to #${channel.name}`);

                await interaction.reply({
                    content: `✅ Unban log channel set to <#${channel.id}>`,
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'kick':
                currentSettings.kickLogChannel = channel.id;
                await db.settings.set(guildKey, currentSettings);

                console.log(`[👢] [SET-STAFF-LOGGING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} set kick log channel to #${channel.name}`);

                await interaction.reply({
                    content: `✅ Kick log channel set to <#${channel.id}>`,
                    flags: MessageFlags.Ephemeral
                });
                break;
        }
    },
};

