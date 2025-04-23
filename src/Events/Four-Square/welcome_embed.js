const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // Fetch the guild to get the total member count
    const guild = member.guild;

    // Create the embed message
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`**Welcome ${member.user.tag} to Four-Square**`)
      .setDescription(
        `**Check Out**\n` +
        `**🌿 <#1346955022461829162>**\n` +  // Mentions the welcome channel
        `**🌿 ⁠<#1346995633776754768>**\n` +
        `**🌿 <id:customize>**\n\n` +
        `**Server Invite: https://dscord.gg/f4waCZD324**\n\n` +
        `**Hope you enjoy your stay in the server! ❤️**\n`
      )
      .setImage("https://media.discordapp.net/attachments/1346995633776754768/1356820016842150139/Untitled371_20250319131308.png?ex=67edf49c&is=67eca31c&hm=72d9d293dd7874e6cc4323c0ead048c5eac8f0ade4b9d5b8157fe43ff5f4e472&=&format=webp&quality=lossless&width=450&height=89")
      .setThumbnail(member.client.user.displayAvatarURL()) // Bot icon as thumbnail
      .setFooter({ text: `Four-Square`, iconURL: guild.iconURL() })
      .setTimestamp()
      .setColor(0xFFFFFF); // Optional: set a color for the embed

    // Send the role mention and embed message to the specified channel by ID
    const welcomeChannel = guild.channels.cache.get('1346955022461829162');
    if (welcomeChannel) {
      await welcomeChannel.send({ content: `<@&1356828430464974941>`, embeds: [welcomeEmbed] });
    } else {
      console.error("Welcome channel not found. Please check the channel ID.");
    }
  },
};
