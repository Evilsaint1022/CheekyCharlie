const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const db = require("../../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-aideadchat')
        .setDescription('Resets the AI-Deadchat'),

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

        const currentSettings = await db.settings.get(`${guildId}`) || {};
        if (currentSettings.deadchatDuration) {
            delete currentSettings.deadchatDuration
        }
         if (currentSettings.deadchatChannelId) {
            delete currentSettings.deadchatChannelId
         }
        
        if (currentSettings.deadchatRoleId) {
        delete currentSettings.deadchatRoleId
        }
        if (currentSettings.deadchatState) {
            delete currentSettings.deadchatState
        };

        const settings = await db.settings.set(`${guildId}`, currentSettings);

       await interaction.reply({
                content: '✅ You have Succesfully Reset the AI-Deadchat\n-# If you want to feature again use the /setup-aideadchat command',
                flags: MessageFlags.Ephemeral,
            });

        console.log(`[⭐] [RESET-AIDEADCHAT] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the reset-aideadchat command.`);
    },
};
