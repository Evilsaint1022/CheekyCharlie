const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const db = require("../../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle-deadchat')
        .setDescription('Toggle the AI Deadchat messages for the server.'),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: MessageFlags.Ephemeral
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        console.log(`[⭐] [TOGGLE-DEADCHAT] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the toggle deadchat command.`);
        
        const currentState = await db.settings.get(`$${guildId}.deadchatState`);

        if (currentState) {
            await db.settings.set(`${guildId}.deadchatState`, false);
            await interaction.reply({
                content: 'AI Deadchat messages have been disabled for this server.',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await db.settings.set(`${guildId}.deadchatState`, true);
            await interaction.reply({
                content: 'AI Deadchat messages have been enabled for this server.\n-# Make sure the deadchat channel, deadchat role and deadchat duration are set too.',
                flags: MessageFlags.Ephemeral,
            });
        }
        
    },
};
