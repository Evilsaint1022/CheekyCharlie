const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChatInputCommandInteraction } = require('discord.js');

const db = require("../../../Handlers/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-deadchat-duration')
        .setDescription('Set the duration for Deadchat messages to be sent.')
        .addIntegerOption(option =>
            option
            .setName("duration")
            .setDescription("The duration in seconds")
            .setRequired(true)
        ),

    /**
    * @param {ChatInputCommandInteraction} interaction
    */
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

        const durationInSeconds = await interaction.options.getInteger("duration");
        const durationInMS = durationInSeconds * 1000;

        if ( durationInMS <= 0 ) {
            return interaction.reply({
                content: "❌ Duration cant be 0 or less.",
                flags: 64
            })
        }

        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        currentSettings.deadchatDuration = durationInMS;

        db.settings.set(`${guildName}_${guildId}`, currentSettings);
        console.log(`[⭐] [SET-DEADCHAT-DURATION] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} Updated deadchatDuration to ${durationInSeconds} seconds`);
        return interaction.reply({
            content: "✅ Updated duration for Deadchat messages.\n-# Make sure the deadchat channel and deadchat role are set too.",
            flags: 64
        })
        
    },
};
