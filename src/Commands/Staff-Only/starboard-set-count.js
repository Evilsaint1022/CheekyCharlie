const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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

        const count = interaction.options.getNumber('count');

        if (count < 1) {
            return interaction.reply({ content: 'The count must be at least 1.', flags: MessageFlags.Ephemeral });
        }

        await db.starboard.set(`${guildName}_${guildId}_starboardCount`, count);

        await interaction.reply({ content: `Starboard count set to ${count}.`, flags: MessageFlags.Ephemeral });

    },
};
