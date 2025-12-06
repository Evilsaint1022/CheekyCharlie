const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-level-channel')
        .setDescription('Set the channel where level-up messages will be sent')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send level-up messages')
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
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.options.getChannel('channel');

        // Fetch current settings or default to empty object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Update only the LevelChannelId field
        currentSettings.LevelChannel = channel.id;

        // Save updated settings
        db.settings.set(`${guildName}_${guildId}`, currentSettings);

        // Logging the action
        const timestamp = new Date().toLocaleTimeString();
        const datestamp = new Date().toLocaleDateString();
        console.log(`[⭐] [SET-LEVEL-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.tag} used the set-level-channel command to set the channel ID "${channel.id}"`);

        return interaction.reply({ content: `✅ Level-up messages will now be sent in <#${channel.id}>.`, flags: 64 });
    },

    sendLevelUpMessage: async function (client, guildId, levelUpMessage, fallbackChannel) {
        // Fetch guild name for the key (optional, fallback to unknown)
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        const guildName = guild ? guild.name : 'UnknownGuild';

        // Fetch the full settings object
        const currentSettings = await db.settings.get(`${guildName}_${guildId}`) || {};

        // Get LevelChannelId field
        const channelId = currentSettings.LevelChannelId;
        console.log(`Loaded LevelChannel: ${channelId}`);

        let targetChannel = null;

        if (channelId) {
            try {
                targetChannel = await client.channels.fetch(channelId);
                console.log(`Sending level-up message to channel: ${targetChannel.name}`);
            } catch (error) {
                console.error(`Error fetching channel with ID ${channelId}: ${error}`);
            }
        }

        if (!targetChannel) {
            console.log('Using fallback channel (same as the command channel).');
            targetChannel = fallbackChannel;
        }

        if (targetChannel) {
            targetChannel.send(levelUpMessage);
        } else {
            console.error('No valid channel found to send the level-up message!');
        }
    }
};
