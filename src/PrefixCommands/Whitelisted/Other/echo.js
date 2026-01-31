const { MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'echo',
    description: 'Repeats your message',
    async execute(message, args, client) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply("This command cannot be used in DMs.");
        }

        const guildId = message.guild.id;
        const guildName = message.guild.name;

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

        // Get message content after the command
        const messageContent = args.join(' ');

        // Delete the command message
        message.delete().catch(() => {});

        if (!messageContent) {
            return message.reply('You need to provide a message to echo.');
        }

        // Send the echoed message
        await message.channel.send(messageContent);

        // Console Logs
        console.log(
            `[⭐] [ECHO] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guildName} ${guildId} ${message.author.tag} used the echo command. ` +
            `Message: ${messageContent}`
        );
    },
};
