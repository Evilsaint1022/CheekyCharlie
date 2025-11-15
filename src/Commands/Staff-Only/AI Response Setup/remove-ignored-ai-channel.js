const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-ignored-ai-channel')
        .setDescription('Remove a channel from the ignored AI channels list.')
        .addChannelOption(option => 
            option.setName('channel-or-category')
                .setDescription('The channel or category to remove.')
                .setRequired(true)
        ),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const channel = interaction.options.getChannel('channel-or-category') || interaction.channel;
        const username = interaction.user.username;
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }
        
        const ignoredChannels = await db.settings.get(`${guildName}_${guildId}.ignoredAIChannels`) || [];

        if ( !ignoredChannels.includes(channel.id) ) {
            return interaction.reply({ content: `Channel / Category <#${channel.id}> is not ignored for AI responses.`, flags: 64 });
        }

        const index = ignoredChannels.indexOf(channel.id);
        if (index > -1) {
            ignoredChannels.splice(index, 1);
        }
        
        await db.settings.set(`${guildName}_${guildId}.ignoredAIChannels`, ignoredChannels);
        console.log(`[⭐] [REMOVE-IGNORE-AI-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${username} Removed channel / category <#${channel.id}> from the ignored AI channels list.`);

        return interaction.reply({
            content: `Channel / Category <#${channel.id}> has been removed from the ignored AI channels list.`,
            flags: 64
        });
    },
};
