const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const db = require('../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard-set-count')
        .setDescription('Set how many reactions are needed to send a message to the starboard')
        .addNumberOption(option => 
            option.setName('count')
                .setDescription('The number of reactions needed to send a message to the starboard')
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

        const count = interaction.options.getNumber('count');

        if (count < 1) {
            return interaction.reply({ content: 'The count must be at least 1.', flags: MessageFlags.Ephemeral });
        }

        await db.starboard.set(`${guildName}_${guildId}_starboardCount`, count);

        await interaction.reply({ content: `Starboard count set to ${count}.`, flags: MessageFlags.Ephemeral });

    },
};
