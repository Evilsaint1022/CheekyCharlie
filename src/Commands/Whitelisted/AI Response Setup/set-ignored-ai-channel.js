const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-ignored-ai-channel')
        .setDescription('Add a channel or category to the ignored AI channels list.')
        .addChannelOption(option => 
            option.setName('channel-or-category')
                  .setDescription('The channel or category to ignore AI responses in')
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

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }
        
        const ignoredChannels = await db.settings.get(`${guildId}.ignoredAIChannels`) || [];

        if ( ignoredChannels.includes(channel.id) ) {
            return interaction.reply({ content: `Channel / Category <#${channel.id}> is already ignored for AI responses.`, flags: 64 });
        }

        ignoredChannels.push(channel.id);

        await db.settings.set(`${guildId}.ignoredAIChannels`, ignoredChannels);
        console.log(`[⭐] [SET-IGNORE-AI-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} Added channel / category <#${channel.id}> to the ignored AI channels list.`);

        return interaction.reply({
            content: `Channel / Category <#${channel.id}> has been added to the ignored AI channels list.`,
            flags: 64
        });
        
    },
};
