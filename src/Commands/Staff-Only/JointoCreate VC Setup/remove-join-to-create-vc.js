const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');
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
        flags: MessageFlags.Ephemeral // Makes the reply ephemeral
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

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Check if a Join To Create channel is set
        if (!currentSettings.JoinToCreateVC) {
            return interaction.reply({ content: 'No Join To Create channel was set.', flags: MessageFlags.Ephemeral });
        }

        // Remove the JoinToCreateVC field only
        delete currentSettings.JoinToCreateVC;

        // Save updated settings
        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[⭐] [REMOVE-JOIN-TO-CREATE-VC] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} removed the Join To Create channel.`);

        return interaction.reply({ content: '✅ The Join To Create channel has been removed.', flags: MessageFlags.Ephemeral });
    },
};
