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
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Fetch whitelisted roles from the database
        const whitelistedRoles = await db.config.get(`${guildId}.whitelistedRoles`) || [];

        // Check if the user has the required permissions or a whitelisted role
        const member = interaction.guild.members.cache.get(userId);
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
        ) {
            return interaction.reply({ content: 'You do not have permission to set the Join To Create channel!', flags: 64 });
        }

        const channel = interaction.options.getChannel('channel');

        // Update the database with the new Join To Create channel
        db.config.set(`${guildId}_joinToCreateVC`, channel.id);

        // Logging the action
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${interaction.guild.name} ${guildId} ${interaction.user.tag} used the set-join-to-create-vc to set the channel id "${channel.id}"`);

        return interaction.reply({ content: `This channel is now set to Join To Create: <#${channel.id}>.`, flags: 64 });
    },
};
