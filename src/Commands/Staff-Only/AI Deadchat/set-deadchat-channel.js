const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-deadchat-channel')
        .setDescription('Set the channel where deadchat messages will be sent')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send deadchat messages')
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

        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const member = interaction.guild.members.cache.get(userId);

        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to set the deadchat channel!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');

        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        currentSettings.deadchatChannelId = channel.id;

        // Save updated settings
        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toLocaleTimeString();
        const datestamp = new Date().toLocaleDateString();
        console.log(`[SET-DEADCHAT-CHANNEL] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.tag} used the set-deadchat-channel command to set the channel ID "${channel.id}"`);

        return interaction.reply({ content: `✅ Deadchat messages will now be sent in <#${channel.id}>.\n-# Make sure the deadchat role and deadchat duration are set too and the AI deadchat is activated.`, flags: 64 });
    },
};
