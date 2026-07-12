const { Events, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {

    // Ignore bots
    if (member.user.bot) return;

    // Fetch the guild to get the total member count
    const guild = member.guild;
    const welcomechannel = '1500763511448539307';
    const welcomersrole = '1501470170026086480';

    const key = `${member.guild.id}`;

    // Get saved members (or empty array if none)
    let joinedMembers = await db.members.get(key) || [];

    // If this exact member already joined → stop
    if (joinedMembers.includes(member.id)) return;

    // Create the embed message
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`**Welcome ${member.user.tag} to Four-Square**`)
      .setDescription(
        `**Check Out**\n` +
        `**🌿・<#1500763626422796288>**\n` +  // Mentions the welcome channel
        `**🌿・<#1500763684375629894>**\n` +
        `**🌿・<id:customize>**\n\n` +
        `**Invite Link: https://www.discord.gg/invite/3gtJ33cZDH**\n\n` +
        `**Hope you enjoy your stay in the server! ❤️**\n`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Four-Square`, iconURL: guild.iconURL() })
      .setTimestamp()
      .setColor(0x207e37); // Optional: set a color for the embed

    // Send the role mention and embed message to the specified channel by ID
    const welcomeChannel = guild.channels.cache.get(welcomechannel);
    if (welcomeChannel) {
      await welcomeChannel.send({ content: `<@&${welcomersrole}>`, embeds: [welcomeEmbed] });
       } else {
      return;
    }
  },
};
