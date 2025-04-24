const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removelevelchannel')
        .setDescription('Remove the configured level-up channel'),

    async execute(interaction) {
        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const settingsFilePath = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Settings/channelsettings.json`);
        const member = interaction.guild.members.cache.get(userId);

        // Load roles that are allowed to run this command
        let whitelistedRoles = [];
        if (fs.existsSync(settingsFilePath)) {
            const settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
            whitelistedRoles = settingsData.roles || [];
        }

        // Check for permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.roles.cache.some(role => whitelistedRoles.includes(role.id))) {
            return interaction.reply({ content: 'You do not have permission to remove the level-up channel!', flags: 64 });
        }

        // Check if the file exists
        if (!fs.existsSync(settingsFilePath)) {
            return interaction.reply({ content: 'No level-up channel is currently set.', flags: 64 });
        }

        // Load, remove the LevelChannelId, and save
        let settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        if ('LevelChannelId' in settingsData) {
            delete settingsData.LevelChannelId;
            fs.writeFileSync(settingsFilePath, JSON.stringify(settingsData, null, 2));
            return interaction.reply({ content: 'The level-up channel has been removed.', flags: 64 });
        } else {
            return interaction.reply({ content: 'No level-up channel was set.', flags: 64 });
        }
    }
};
