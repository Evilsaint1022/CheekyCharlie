const { MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'stop',
    description: 'Stop the current discussion and change the topic.',
    async execute(message, args, client) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply("This command cannot be used in DMs.");
        }

        const guildId = message.guild.id;
        const guildName = message.guild.name;
        const username = message.author.username;

        // Whitelisted role check
        const WHITELISTED_ROLE_IDS =
            await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = message.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId =>
            memberRoles.includes(roleId)
        );

        if (!hasPermission) {
            return message.reply(
                'You do not have the required whitelisted role to use this command.'
            );
        }

        const stopEmbed = {
            color: 0xFF0000,
            title: '_**🔴・Change The Topic!**_',
            description:
                ' **This discussion has gotten too heated and has run its course. ' +
                'The Topic must now be changed. Cancel any replies you are in the middle of ' +
                'and do not start any new replies. Continuing on with this topic will result in a timeout.** ',
            image: {
                url: 'https://images-ext-2.discordapp.net/external/tt-s11SUBbBxQlRsQpmHrcfgk5BJror2zd2-2tUkoww/https/i.imgur.com/B5HkQWg.jpg',
            },
        };

        await message.channel.send({ embeds: [stopEmbed] });

        console.log(
            `[⭐] [STOP] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guildName} ${guildId} ${username} used the stop command.`
        );
    },
};
