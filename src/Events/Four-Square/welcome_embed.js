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
      .setImage("https://cdn.discordapp.com/attachments/1346998014115578010/1365543472076947456/Untitled371_20250319131308.png?ex=680db0f6&is=680c5f76&hm=56ba655e67bb5c9268f6fa68a177a9890567779bf53dc830be78039888c7aadc&width=450&height=89")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Four-Square`, iconURL: guild.iconURL() })
      .setTimestamp()
      .setColor(0x207e37); // Optional: set a color for the embed

    // Send the role mention and embed message to the specified channel by ID
    const welcomeChannel = guild.channels.cache.get('1346955022461829162');
    if (welcomeChannel) {
      await welcomeChannel.send({ content: `<@&1356828430464974941>`, embeds: [welcomeEmbed] });
    } else {
      console.error("Welcome channel not found. Please check the channel ID.");
    }
  },
};
