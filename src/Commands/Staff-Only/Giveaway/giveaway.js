const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create a giveaway')
        .addStringOption(option => 
            option.setName('prize')
                .setDescription('The prize for the giveaway')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)
        ),

    async execute(interaction) {
        
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const userId = interaction.user.id;

        const modWhitelistedRoles = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];
        const member = interaction.guild.members.cache.get(userId);
        const memberRoles = member.roles.cache.map(role => role.id);

        const hasAdminPermission = interaction.member.permissions.has('Administrator');
        const hasModRole = modWhitelistedRoles.some(roleId => memberRoles.includes(roleId));

        if (!hasAdminPermission && !hasModRole) {
            return interaction.reply({ 
                content: 'You do not have permission to create giveaways. Only administrators or staff members can create giveaways.', 
                flags: 64 
            });
        }

        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winners = interaction.options.getInteger('winners') || 1;

        const endTime = Date.now() + (duration * 60 * 1000);
        const endTimestamp = Math.floor(endTime / 1000);

        const giveawayEmbed = new EmbedBuilder()
            .setTitle(prize)
            .setDescription(`**Winners:** ${winners}\n**Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)\n**Host:** ${interaction.user}`)
            .setColor('#4e5180')
            .setFooter({ text: `0 participants` })
            .setTimestamp(endTime);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel('🎉 Join Giveaway')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('giveaway_leave')
                    .setLabel('❌ Leave Giveaway')
                    .setStyle(ButtonStyle.Danger)
            );

        const giveawayMessage = await interaction.channel.send({
            embeds: [giveawayEmbed],
            components: [row]
        });

        const giveawayId = `${guildName}_${guildId}_${giveawayMessage.id}`;
        await db.giveaways.set(giveawayId, {
            messageId: giveawayMessage.id,
            channelId: interaction.channel.id,
            guildId: guildId,
            guildName: guildName,
            prize: prize,
            winners: winners,
            hostId: userId,
            endTime: endTime,
            ended: false
        });

        await db.giveaway_participants.set(giveawayId, []);

        console.log(`[🎉] [GIVEAWAY] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} created a giveaway for ${prize} with ${winners} winner(s) ending in ${duration} minutes.`);

        await interaction.reply({ 
            content: '✅ Giveaway created successfully!', 
            flags: 64 
        });
    },
};
