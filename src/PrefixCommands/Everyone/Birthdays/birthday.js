const { EmbedBuilder } = require("discord.js");
const db = require("../../../Handlers/database");

module.exports = {
  name: "birthday",
  description: "View a user's birthday",

  async execute(message, args, client) {
    try {
      const user =
        message.mentions.users.first() ||
        client.users.cache.get(args[0]) ||
        message.author;

      const guildKey = message.guild.id;
      const guildName = message.guild.name;
      const guildId = message.guild.id;

      const birthday = await db.birthdays.get(`${guildKey}.${user.id}`);

        console.log(
      `[🌿] [BIRTHDAY] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${guildName} ${guildId} ${message.author.username} used the ?birthday command to view ${user.username}'s birthday.`
    );

      if (!birthday) {
        return message.reply({
          content: `❌ **${user.username}** has not set their birthday.`,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x207e37)
        .setTitle("🎂・**__Birthday Info__**")
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: "**__User__**",
            value: `${user.tag}`,
            inline: false,
          },
          {
            name: "**__Birthday__**",
            value: `${birthday.day}/${birthday.month}/${birthday.year}`,
            inline: false,
          }
        )
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply({ content: "⚠️ Something went wrong." });
    }
  },
};