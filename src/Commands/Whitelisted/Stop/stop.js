const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the current discussion and change the topic.'),
    async execute(interaction) {
        const { channel, user, guild, member } = interaction;
        

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
            content: "This command cannot be used in DMs.",
            flags: 64
            });
        }

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

        const stopEmbed = {
            color: 0x020202,
            title: '🔴𝘾𝙝𝙖𝙣𝙜𝙚 𝙏𝙝𝙚 𝙏𝙤𝙥𝙞𝙘!',
            description: ' **This discussion has gotten too heated and has run its course. The Topic must now be changed. Cancel any replies you are in the middle of and do not start any new replies. Continuing on with this topic will result in a timeout.** ',
            image: {
                url: 'https://images-ext-2.discordapp.net/external/tt-s11SUBbBxQlRsQpmHrcfgk5BJror2zd2-2tUkoww/https/i.imgur.com/B5HkQWg.jpg',
            },
        };

        await interaction.reply({ embeds: [stopEmbed] });

        console.log(`[⭐] [STOP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${username} used the stop command.`);
    },
};
