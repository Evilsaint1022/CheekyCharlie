const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, Emoji } = require('discord.js');
const fs = require('fs');
const path = require('path');

const db = require("../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard-set-emoji')
        .setDescription('Set the emoji used for starboard reactions')
        .addStringOption(option => 
            option.setName('emoji')
                .setDescription('The emoji to use for starboard reactions')
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

        const emojiInput = interaction.options.getString('emoji');

        await db.starboard.set(`${guildName}_${guildId}_starboardEmoji`, emojiInput);
        return interaction.reply({ content: `Starboard emoji has been set to ${emojiInput}`, flags: MessageFlags.Ephemeral });

    },
};
