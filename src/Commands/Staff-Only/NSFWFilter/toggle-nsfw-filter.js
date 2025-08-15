const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const db = require("../../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle-nsfw-filter')
        .setDescription('Toggle the NSFW filter for the server.'),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const whitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
            const userRoles = interaction.member.roles.cache.map(role => role.id);
            const hasWhitelistedRole = whitelistedRoles.some(roleId => userRoles.includes(roleId));

            if (!hasWhitelistedRole) {
                return interaction.reply({ 
                    content: 'You do not have permission to use this command.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        const currentState = await db.settings.get(`${guildName}_${guildId}.nsfwFilter`);

        if (currentState) {
            await db.settings.set(`${guildName}_${guildId}.nsfwFilter`, false);
            await interaction.reply({
                content: 'NSFW filter has been disabled for this server.',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await db.settings.set(`${guildName}_${guildId}.nsfwFilter`, true);
            await interaction.reply({
                content: 'NSFW filter has been enabled for this server.',
                flags: MessageFlags.Ephemeral,
            });
        }
        
    },
};
