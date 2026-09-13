const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../Handlers/database');
const path = require('path');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {

    // Test Channels & Roles:
    // const welcomechannel = '1508362167215194152';
    // const welcomersrole = '1504744371709284423';

    // Production Channels & Roles:
    const welcomechannel = '1500763511448539307';
    const welcomersrole = '1501470170026086480';

    // Ignore bots ( Sometimes commented out for testing. )
    if (member.user.bot) return;

    // Fetch the guild to get the total member count
    const guild = member.guild;

    const key = `${member.guild.id}`;

    // Get saved members (or empty array if none)
    let joinedMembers = await db.members.get(key) || [];

    // If this exact member already joined → stop
    if (joinedMembers.includes(member.id)) return;

    // Load welcome banner from storage
    const bannerPath = path.join(
      __dirname,
      '../../Utilities/Cheekycharlie/fsbanner.png'
    );

    const banner = new AttachmentBuilder(bannerPath, {
      name: 'fsbanner.png'
    });

    // Create the embed message
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`**Welcome ${member.user.tag} to Four-Square**`)
      .setDescription(
        `**Check Out**\n` +
        `**🌿・<#1500763626422796288>**\n` +
        `**🌿・<#1500763684375629894>**\n` +
        `**🌿・<id:customize>**\n\n` +
        `**Invite Link: https://www.discord.gg/invite/3gtJ33cZDH**\n\n` +
        `**Hope you enjoy your stay in the server! ❤️**\n`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setImage('attachment://fsbanner.png')
      .setFooter({ text: `Four-Square`, iconURL: guild.iconURL() })
      .setTimestamp()
      .setColor(0x207e37);

    // Send the role mention, banner and embed
    const welcomeChannel = guild.channels.cache.get(welcomechannel);

    if (welcomeChannel) {
      await welcomeChannel.send({
        content: `<@&${welcomersrole}>`,
        embeds: [welcomeEmbed],
        files: [banner]
      });
    } else {
      return;
    }
  },
};