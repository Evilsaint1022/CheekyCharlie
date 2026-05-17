const { Events, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const db = require('../../Handlers/database');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // Channel ID where the welcome message will be sent
    const channelId = await db.settings.get(`${member.guild.id}.welcomechannel`);
    const channel = member.guild.channels.cache.get(channelId);

    // Makes sure it only sends for the Four-Square Server.
    if (!channel) return;
    if (member.user.bot) return;

    const key = `${member.guild.id}`;

    // Get saved members (or empty array if none)
    let joinedMembers = await db.members.get(key) || [];

    // If this exact member already joined → stop
    if (joinedMembers.includes(member.id)) return;

    // Save this member
    joinedMembers.push(member.id);
    await db.members.set(key, joinedMembers);

    try {
      // Load the welcome template and member avatar
      const templatePath = path.join(__dirname, '../../Utilities/Banners/banner.png');
      const template = await loadImage(templatePath);
      const avatar = await loadImage(member.user.displayAvatarURL({ format: 'png' }));

      // Create canvas based on template size
      const canvas = createCanvas(template.width, template.height);
      const ctx = canvas.getContext('2d');

      // Draw the template image onto the canvas
      ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

      // Draw the member's avatar as a circle onto the canvas
      const avatarSize = 150; // Set avatar size
      const avatarX = canvas.width / 2; // Center of the canvas width
      const avatarY = 10 + avatarSize / 1.5; // Adjust as needed and center the avatar

      // Draw circular avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Draw the avatar within the circular clipping area
      ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();

      ctx.textAlign = 'center';

      // Welcome username
      ctx.font = 'bold 28px Sans';
      ctx.fillStyle = '#ffffff';

      ctx.fillText(
      `${member.user.username.toUpperCase()}`,
      canvas.width / 2, 220);

      // Member count
      ctx.font = 'bold 20px Sans';
      ctx.fillStyle = '#d9d9d9';

      ctx.fillText(
      `Member #${member.guild.memberCount}`,
      canvas.width / 2, 250);

      // Convert the canvas to a buffer and send as an attachment
      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'banner.png' });
      
      // Send the customized welcome message with the image attachment
      await channel.send({
        content: `**〉Welcome <@${member.id}> to the ${member.guild.name} Server!**\n`,
        files: [attachment]
      });
    } catch (error) {
      console.error('Error generating welcome image:', error);
    }
  },
};
