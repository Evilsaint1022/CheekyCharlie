const db = require('../../Handlers/database');
const { EmbedBuilder, StickerFormatType } = require('discord.js');

const STARBOARD_COLOR = 0x217e38;
const EMBED_DESCRIPTION_LIMIT = 4096;
const FIELD_VALUE_LIMIT = 1024;

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 1)}…`;
}

function formatMessageContent(content) {
  const quotedContent = content
    .split('\n')
    .map(line => `${line || 'ㅤ'}`)
    .join('\n');

  return truncate(quotedContent, EMBED_DESCRIPTION_LIMIT - 4);
}

function formatAttachmentName(name) {
  return truncate(
    (name || 'Attachment').replace(/[\[\]()]/g, ''),
    80
  );
}

module.exports = async function updateStarboard(reaction) {

  const message = reaction.message;

  const guild = message.guild;

  if (!guild) return;

  const guildId = guild.id;

  const userId = message.author.id;

  const username = message.author.username;

  const safeUsername = username.replace(/\./g, '_');

  const messageId = message.id;

  const guildKey = `${guildId}`; // Guild key for storage

  try {

    const config = await db.starboard.get(guildKey);

    if (!config || !config.starboardChannel || !config.starboardEmoji || !config.starboardCount) return;

    const { starboardChannel, starboardEmoji, starboardCount } = config;

    const starboardChannelObj = guild.channels.cache.get(starboardChannel);

    if (!starboardChannelObj || message.channel.id === starboardChannel) return;

    let emojiName = starboardEmoji;

    let emojiForReaction = starboardEmoji;

    if (starboardEmoji.includes(':')) {

      const emojiId = starboardEmoji.split(':')[2]?.slice(0, -1);

      const emoji = guild.emojis.cache.get(emojiId);

      if (!emoji) return;

      emojiName = emoji.name;

      emojiForReaction = emoji;

    }

    const emojiInCache = guild.emojis.cache.find(e => e.name === emojiName);

    const matchedEmoji =
      reaction.emoji.name === emojiName ||
      reaction.emoji.id === emojiInCache?.id;

    if (!matchedEmoji) return;

    const currentReaction = message.reactions.cache.find(r =>
      r.emoji.name === emojiName ||
      r.emoji.id === emojiInCache?.id
    );

    const currentCount = currentReaction?.count || 0;

    const trackingList = (await db.starboardids.get(guildKey)) || [];

    const entryIndex = trackingList.findIndex(entry =>
      entry.user === safeUsername && entry.messageId === messageId
    );

    const storedUrl = entryIndex !== -1 ? trackingList[entryIndex].url : null;

    if (currentCount < parseInt(starboardCount)) {

      if (storedUrl) {

        const oldId = storedUrl.split('/').pop();

        try {

          const oldMsg = await starboardChannelObj.messages.fetch(oldId);

          if (oldMsg) await oldMsg.delete();

        } catch (_) {}

        trackingList.splice(entryIndex, 1);

        await db.starboardids.set(guildKey, trackingList);

      }

      return;

    }

    const authorName = message.author.bot
      ? `${username} [🤖]`
      : username;

    let messageContent = message.content || "_No Message Content_";

    if (message.stickers.size > 0 && !message.content) {

      messageContent = "[ Message contains stickers ]";

    }

    // -------------------------------------------------------------
    // Create the embed
    // -------------------------------------------------------------

    const guildIcon = guild.iconURL({ dynamic: true, size: 128 });
    const authorAvatar = message.author.displayAvatarURL({
      dynamic: true,
      size: 128
    });

    const embed = new EmbedBuilder()
      .setColor(STARBOARD_COLOR)
      .setAuthor({
        name: authorName,
        iconURL: authorAvatar
      })
      .setTitle(`${starboardEmoji} ${currentCount} ${currentCount === 1 ? 'Star' : 'Stars'}`)
      .setURL(message.url)
      .setDescription("ㅤ\n" + formatMessageContent(messageContent) + "\nㅤ")
      .addFields(
        {
          name: 'Author',
          value: `<@${userId}>`,
          inline: true
        },
        {
          name: 'Channel',
          value: `<#${message.channel.id}>`,
          inline: true
        },
        {
          name: 'Original Message',
          value: `[Jump to message](${message.url})`,
          inline: true
        }
      )
      .setFooter({
        text: `${truncate(guild.name, 100)} • Starboard`,
        ...(guildIcon ? { iconURL: guildIcon } : {})
      });

    const images = [];
    const mediaLinks = [];
    const seenImages = new Set();
    const seenLinks = new Set();

    function mediaUrl(value) {
      try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
      } catch (_) {
        return null;
      }
    }

    function isImageUrl(value) {
      const url = mediaUrl(value);
      return url && /\.(png|jpe?g|gif|webp|avif)$/i.test(new URL(url).pathname);
    }

    function addLink(label, value, spoiler = false) {
      const url = mediaUrl(value);
      if (!url || seenLinks.has(url)) return;
      seenLinks.add(url);
      const link = `[${formatAttachmentName(label)}](<${url}>)`;
      mediaLinks.push(spoiler ? `||${link}||` : link);
    }

    function addImage(value) {
      const url = mediaUrl(value);
      if (!url || seenImages.has(url)) return;
      seenImages.add(url);
      if (images.length < 10) images.push(url);
      else addLink('Additional image', url);
    }

    for (const attachment of message.attachments.values()) {
      if (attachment.spoiler) {
        addLink(attachment.name, attachment.url, true);
      } else if (attachment.contentType?.startsWith('image/') || isImageUrl(attachment.url)) {
        addImage(attachment.url);
      } else {
        addLink(attachment.name, attachment.url);
      }
    }

  
    const content = message.content || '';
    const customEmojiPattern = /<(a?):\w+:(\d+)>/g;
    const customEmojis = [...content.matchAll(customEmojiPattern)];
    if (customEmojis.length && !content.replace(customEmojiPattern, '').trim()) {
      for (const [, animated, id] of customEmojis) {
        addImage(`https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=256&quality=lossless`);
      }
    }

    const spoilers = content.match(/\|\|[\s\S]*?\|\|/g) || [];
    const visibleContent = content.replace(/\|\|[\s\S]*?\|\|/g, '');
    for (const match of visibleContent.matchAll(/https?:\/\/[^\s<>]+/g)) {
      const url = match[0].replace(/[.,!?;:)\]]+$/, '');
      if (isImageUrl(url)) addImage(url);
    }

    for (const source of message.embeds) {
      if (source.url && spoilers.some(spoiler => spoiler.includes(source.url))) continue;
      if (source.image?.url) addImage(source.image.url);
      else if (isImageUrl(source.url)) addImage(source.url);
      else if (source.thumbnail?.url) addImage(source.thumbnail.url);
      if (source.video) addLink('Watch video / GIF', source.url || source.video.url);
    }

    for (const sticker of message.stickers.values()) {
      if ([StickerFormatType.PNG, StickerFormatType.APNG, StickerFormatType.GIF].includes(sticker.format)) {
        addImage(sticker.url);
      } else {
        addLink(sticker.name || 'Sticker', sticker.url);
      }
    }

    if (mediaLinks.length) {
      const lines = [];
      let length = 0;
      for (const link of mediaLinks) {
        if (length + link.length + 1 > FIELD_VALUE_LIMIT - 60) continue;
        lines.push(link);
        length += link.length + 1;
      }
      if (lines.length < mediaLinks.length) lines.push('More media available via **Jump to message**.');
      embed.addFields({ name: '📎 Media & attachments', value: lines.join('\n'), inline: false });
    }

    const embeds = [embed];
    if (images.length) {
      embed.setImage(images[0]);
      for (const url of images.slice(1)) {
        embeds.push(new EmbedBuilder().setColor(STARBOARD_COLOR).setImage(url));
      }
    }

    // -------------------------------------------------------------
    // Edit existing starboard message first
    // -------------------------------------------------------------

    if (storedUrl) {

      const oldId = storedUrl.split('/').pop();

      try {

        const oldMsg = await starboardChannelObj.messages.fetch(oldId);

        if (oldMsg) {

          await oldMsg.edit({
            content: '',
            embeds
          });

          return;

        }

      } catch (_) {

        // Only post a new one if the old message truly no longer exists

      }

    }

    // -------------------------------------------------------------
    // Send new starboard message
    // -------------------------------------------------------------

    const newMsg = await starboardChannelObj.send({
      embeds
    });

    await newMsg.react(emojiForReaction);

    const newUrl =
      `https://discord.com/channels/${guildId}/${starboardChannelObj.id}/${newMsg.id}`;

    if (entryIndex !== -1) {

      trackingList[entryIndex].url = newUrl;

    } else {

      trackingList.push({

        user: safeUsername,

        messageId,

        url: newUrl

      });

    }

    await db.starboardids.set(guildKey, trackingList);

  } catch (err) {

    console.error('Error in updateStarboard:', err);

  }

};
