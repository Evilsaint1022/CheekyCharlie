const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-partydrop-channel')
        .setDescription('Set the channel where the party drops will go')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel for the party drops')
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

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        // Get the channel from the interaction
        const channel = interaction.options.getChannel('channel');

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildId}`) || {};

        // Update only the DropPartyChannel field
        currentSettings.DropPartyChannel = channel.id;

        // Save updated settings
        db.settings.set(`${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[⭐] [SET-PARTYDROP-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} set the drop party channel to "${channel.id}"`);

        return interaction.reply({
            content: `✅ Drops will now appear in <#${channel.id}>.`,
            flags: 64,
        });
    },
};
