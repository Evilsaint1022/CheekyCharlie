const { PermissionsBitField, PermissionFlagsBits } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  name: "remove-bankinterest-channel",
  aliases: ["removebankichannel"],

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
      const user = message.author;
      const guildId = guild.id;
      const guildName = guild.name;
      const userId = user.id;
      
      // console logs
      console.log(`[💰] [REMOVE-BANKINTEREST-CHANNEL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.username} used the remove-bank-channel command.`);

      const whitelistedRoles = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];
      const member = guild.members.cache.get(userId);

      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !member.roles.cache.some(role => whitelistedRoles.includes(role.id))
      ) {
        return message.reply('❌ You do not have permission to set the bank channel!');
      }
      
      // Fetch current settings or default to empty object
      const currentSettings = await db.settings.get(`${guildId}`) || {};

      // Check if a Bank channel is set
      if (!currentSettings.bankinterest) {
        return message.reply('No Bank Interest channel is currently set.');
      }

      delete currentSettings.bankinterest;

      db.settings.set(`${guildId}`, currentSettings);

      await message.reply(`✅ Bank Interest channel has been removed.`);

    } catch (error) {
      console.error("Error setting Bank channel:", error);
      await message.reply("❌ Failed to set the Bank channel.");
    }
  }
};