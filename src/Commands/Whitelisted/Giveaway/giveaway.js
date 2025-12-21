const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        const userId = interaction.user.id;

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winners = interaction.options.getInteger('winners') || 1;

        const endTime = Date.now() + (duration * 60 * 1000);
        const endTimestamp = Math.floor(endTime / 1000);

        const topRowFromat    = "**─────────── 🌿GIVEAWAY🌿 ──────────**"
        const middle =              `ㅤㅤ · · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`
        const bottomRowFormat = "**───────────────────────────────────────**"

        const space = 'ㅤ'

        const giveawayEmbed = new EmbedBuilder()
            .setTitle(`${topRowFromat}`)
            .setDescription(`\n${space}\n${middle}\nㅤㅤ**・Prize:** ${prize}\nㅤㅤ**・Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)\nㅤㅤ**・Winners:** ${winners}\n${middle}\n${space}\n${bottomRowFormat}`)
            .setColor('#FFFFFF')

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_toggle')
                    .setLabel('🎉 Enter Giveaway')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('giveaway_view-participants')
                    .setLabel('👤 View participants')
                    .setStyle(ButtonStyle.Primary)
            );

        const giveawayMessage = await interaction.channel.send({
            embeds: [giveawayEmbed],
            components: [row]
        });

        const giveawayId = `${guildId}_${giveawayMessage.id}`;
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
