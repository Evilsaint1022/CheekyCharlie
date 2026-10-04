const db = require('../../../Handlers/database');

module.exports = {
  name: "prefix-set",
  aliases: ["ps"],

  async execute(message, args,) {

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
      return message.reply('You do not have the required whitelisted role to use this command.');
    }

    const newPrefix = args[0];

    if (!newPrefix) {
      return message.reply("Please provide a new prefix.");
    }

    if (newPrefix.length > 3) {
      return message.reply("Prefix cannot be longer than 3 characters.");
    }

    // Get existing settings (if any)
    const existingSettings = await db.settings.get(guildId) || {};

    // Save new prefix while keeping other settings
    await db.settings.set(guildId, {
      ...existingSettings,
      prefix: newPrefix
    });

    console.log(`[⭐] [PREFIX-SET] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.username} used the prefix-set command to set the prefix to ${newPrefix}`);

    message.reply(`✅ Prefix has been updated to: \`${newPrefix}\``);
  }
};