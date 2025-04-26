const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const settingsDir = path.resolve(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Settings`);
        const settingsFilePath = path.join(settingsDir, 'channelsettings.json');

        fs.mkdirSync(settingsDir, { recursive: true });

        const member = interaction.guild.members.cache.get(userId);

        let whitelistedRoles = [];
        if (fs.existsSync(settingsFilePath)) {
            const settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
            whitelistedRoles = settingsData.roles || [];
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.roles.cache.some(role => whitelistedRoles.includes(role.id))) {
            return interaction.reply({ content: 'You do not have permission to set the Join To Create channel!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');

        let settingsData = {};
        if (fs.existsSync(settingsFilePath)) {
            settingsData = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        }

        settingsData.joinToCreateVC = channel.id;

        fs.writeFileSync(settingsFilePath, JSON.stringify(settingsData, null, 2));

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${guildName} ${guildId} ${interaction.user.tag} used the set-join-to-create-vc to set the channel id "${channel.id}"`);

        return interaction.reply({ content: `This channel is now set to Join To Create: <#${channel.id}>.`, flags: 64 });

    },
};
