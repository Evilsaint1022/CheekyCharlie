const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-join-to-create-vc')
        .setDescription('Set the Voice channel for the join to create feature')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to set')
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
        const userId = interaction.user.id;

        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        // Check if the user has the required permissions or a whitelisted role
        const member = interaction.guild.members.cache.get(userId);
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to set the Join To Create channel!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Update only the JoinToCreateVC field
        currentSettings.JoinToCreateVC = channel.id;

        // Save updated settings
        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${guildName}_${guildId} ${interaction.user.tag} used the set-join-to-create-vc to set the channel id "${channel.id}"`);

        return interaction.reply({ content: `✅ This channel is now set to Join To Create: <#${channel.id}>.`, flags: 64 });
    },
};
