const db = require('../../../Handlers/database');

module.exports = {
  name: "ghostping-toggle",
  aliases: ["gptoggle"],

  async execute(message, args) {

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
        
    // Get current value (default to false if not set)
    const current = await db.settings.get(`${message.guild.id}.ghostping`) || false;

    // Toggle it
    const newValue = !current;

    // Save new value
    await db.settings.set(`${message.guild.id}.ghostping`, newValue);

    message.reply(`Ghostping detection is now set to: **${newValue}**`);
  }
};