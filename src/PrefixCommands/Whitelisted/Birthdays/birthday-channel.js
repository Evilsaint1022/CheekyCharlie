const db = require('../../../Handlers/database');

module.exports = {
  name: 'birthdaychannel',
  aliases: ['bdaychannel'],

  async execute(message, args) {

    if (message.channel.isDMBased()) {
            return message.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const guildId = message.guild.id;
        const guildName = message.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = message.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return message.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: 64 });
        }

        const channel =
          message.mentions.channels.first() ||
          message.guild.channels.cache.get(args[0]);

        if (!channel) {
          return message.reply('Please mention a valid channel.');
        }

        const settings = await db.birthdaysettings.get(`${guildId}`) || {};

        settings.birthdaychannel = channel.id;

        await db.birthdaysettings.set(`${guildId}`, settings);

        message.reply(`🎂 Birthday announcements channel set to ${channel}`);
      }
    };
