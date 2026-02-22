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
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const durationInSeconds = await interaction.options.getInteger("duration");
        const durationInMS = durationInSeconds * 1000;

        if ( durationInMS <= 0 ) {
            return interaction.reply({
                content: "❌ Duration cant be 0 or less.",
                flags: 64
            })
        }

        // duration has to be more than 5 mintues
        if ( durationInMS <= 300000 ) {
            return interaction.reply({
                content: "❌ Duration cant be less than 5 minutes.",
                flags: 64
            })
        }

        const currentSettings = await db.settings.get(`${guildId}`) || {};

        currentSettings.deadchatDuration = durationInMS;

        db.settings.set(`${guildId}`, currentSettings);
        console.log(`[⭐] [SET-DEADCHAT-DURATION] [${new Date().toLocaleDateString()}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} Updated deadchatDuration to ${durationInSeconds} seconds`);
        return interaction.reply({
            content: "✅ Updated duration for Deadchat messages.\n-# Make sure the deadchat channel and deadchat role are set too.",
            flags: 64
        })
        
    },
};
