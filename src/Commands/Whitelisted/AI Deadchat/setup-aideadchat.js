const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-aideadchat')
        .setDescription('Setup the AI-Deadchat feature')
        .addChannelOption(option =>
                option.setName('channel')
                .setDescription('The channel to send deadchat messages')
                .setRequired(true)
        )
        .addRoleOption(option =>
                option.setName('role')
                .setDescription('The role to mention.')
                .setRequired(true)
            )
        .addIntegerOption(option =>
                option.setName("duration")
                .setDescription("The duration in seconds")
                .setRequired(true)
        ),
        
        

            async execute(interaction) {

        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64 // Makes the reply ephemeral
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

        const channel = interaction.options.getChannel('channel');
        const targetRole = interaction.options.getRole('role');
        const durationInSeconds = await interaction.options.getInteger("duration");
        const durationInMS = durationInSeconds * 1000;

        // DeadChat Channel -------------------------------------------------
        if (channel) {
        const currentSettings = await db.settings.get(`${guildId}`) || {};

        currentSettings.deadchatChannelId = channel.id;

        // Save updated settings
        db.settings.set(`${guildId}`, currentSettings);
        }

        // DeadChat Role -------------------------------------------------
        if (targetRole) {
        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildId}`) || {};

        // Update only the VerifiedRole field
        currentSettings.deadchatRoleId = targetRole.id;

        // Save updated settings
        db.settings.set(`${guildId}`, currentSettings);
        }

        // DeadChat Duration -------------------------------------------------

        if (durationInSeconds) {

        if ( durationInMS <= 0 ) {
            return interaction.reply({
                content: "❌ Duration cant be 0 or less.",
                flags: 64
            })
        }

        // duration has to be more than 5 mintues
        if ( durationInMS <= 300000 ) {
            return interaction.reply({
                content: "❌ Duration cant be less than 5 minutes.",
                flags: 64
            })
        }

        const currentSettings = await db.settings.get(`${guildId}`) || {};

        currentSettings.deadchatDuration = durationInMS;

        db.settings.set(`${guildId}`, currentSettings);
        }
        await interaction.reply({
        content: `✅ You have successfully Setup the Channel:<#${channel.id}> Role:${targetRole} Duration:\`${durationInSeconds}\` Seconds! \n-# Make sure to use /toggle-aideadchat`,
        flags: MessageFlags.Ephemeral,
        })
        console.log(`[⭐] [SETUP-AIDEADCHAT] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the setup-aideadchat command.`);

    }}