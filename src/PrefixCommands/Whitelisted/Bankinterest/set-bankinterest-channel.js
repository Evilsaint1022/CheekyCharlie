const { PermissionFlagsBits } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  name: "set-bankinterest-channel",
  
  async execute(message, args) {

    // Prevent command usage in DMs
    if (!message.guild) {
      return message.reply("This command cannot be used in DMs.");
    }

    const guildId = message.guild.id;
    const guildName = message.guild.name;
    const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

    const memberRoles = message.member.roles.cache.map(role => role.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

    if (!hasPermission) {
      return message.reply('You do not have the required whitelisted role to use this command.');
    }

    try {
      const guild = message.guild;
      const guildId = guild.id;
      const guildName = guild.name;

      // Get channel from mention or ID
      const channel = message.mentions.channels.first() || guild.channels.cache.get(args[0]);

      if (!channel) {
        return message.reply("❌ Please provide a valid channel.");
      }
      
      // console logs
      console.log(`[💰] [SET-BANKINTEREST-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.username} used the set-bankinterest-channel command to set ${channel.name} - ${channel.id}`);

      const key = `${guildId}`;

      const existing = await db.settings.get(key) || {};
      existing.bankinterest = channel.id;

      await db.settings.set(key, existing);

      await message.reply(`✅ Bank Interest channel has been set to <#${channel.id}>`);

    } catch (error) {
      console.error("Error setting Bank channel:", error);
      await message.reply("❌ Failed to set the Bank channel.");
    }
  }
};