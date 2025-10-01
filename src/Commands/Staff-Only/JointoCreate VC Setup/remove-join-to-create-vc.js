const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-join-to-create-vc')
        .setDescription('Remove the configured Join To Create channel'),

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
            return interaction.reply({ content: 'You do not have permission to remove the Join To Create channel!', flags: 64 });
        }

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Check if a Join To Create channel is set
        if (!currentSettings.JoinToCreateVC) {
            return interaction.reply({ content: 'No Join To Create channel was set.', flags: 64 });
        }

        // Remove the JoinToCreateVC field only
        delete currentSettings.JoinToCreateVC;

        // Save updated settings
        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[⭐] [REMOVE-JOIN-TO-CREATE-VC] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.tag} removed the Join To Create channel.`);

        return interaction.reply({ content: '✅ The Join To Create channel has been removed.', flags: 64 });
    },
};
