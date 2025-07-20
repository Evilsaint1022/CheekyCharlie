const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, MessageFlags, Emoji } = require('discord.js');
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
        const user = interaction.user;
        const userId = user.id;
        const guild = interaction.guild;
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
        const member = guild.members.cache.get(userId);
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

         if (
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
                !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
              ) {
                return interaction.reply({
                  content: '❌ You do not have permission to set the bump channel!',
                  flags: 64
                });
              }

        const emojiInput = interaction.options.getString('emoji');

        await db.starboard.set(`${guildName}_${guildId}_starboardEmoji`, emojiInput);
        return interaction.reply({ content: `Starboard emoji has been set to ${emojiInput}`, flags: MessageFlags.Ephemeral });

    },
};
