const db = require('../../Handlers/database');
const { EmbedBuilder, StickerFormatType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const sharp = require('sharp');

const STARBOARD_COLOR = 0xf1c40f;
const EMBED_DESCRIPTION_LIMIT = 4096;
const FIELD_VALUE_LIMIT = 1024;
const VIDEO_THUMBNAIL_MAX_BYTES = 8 * 1024 * 1024; // Stay under Discord's 10 MB upload limit
const UPLOAD_MAX_BYTES = 8 * 1024 * 1024; // Reshaped images bigger than this are not uploaded

// Embed image shape limits (width / height). Images outside this range get padded so the embed never looks odd.
// Discord makes the embed only as wide as its image, so a narrow image squeezes the title onto a second line.
// Discord shows embed images in a box of about 400 × 300, so images must be at least 4:3 and 400px wide
// to fill the full width of the embed.
const IMAGE_MIN_RATIO = 4 / 3; // Tallest allowed shape (4:3 landscape); taller images get blurred side bars
const IMAGE_MAX_RATIO = 2; // Widest allowed shape (2:1 landscape)
const IMAGE_MIN_WIDTH = 400; // Images narrower than this get scaled up so the embed stays full width
const IMAGE_MAX_SIZE = 1600; // Longest side of a reshaped image
const IMAGE_DOWNLOAD_MAX_BYTES = 25 * 1024 * 1024;

// Bump this whenever the image rules above change, so existing starboard posts get their image rebuilt.
const IMAGE_RULES_VERSION = 2;

// Animated GIFs are rebuilt frame by frame, so keep them smaller to limit CPU, memory and file size.
const GIF_MAX_SIZE = 400; // Longest side of a reshaped GIF (Discord shows embed images at about this size)
const GIF_MAX_PIXELS = 15_000_000; // width × height × frames; bigger GIFs are left as they are (≈5s worst case)

// Only download images from these hosts (prevents the bot fetching arbitrary/internal addresses).
const TRUSTED_IMAGE_HOSTS = [
  'cdn.discordapp.com',
  'media.discordapp.net',
  'tenor.com',
  'klipy.com'
];

function isTrustedImageHost(value) {
  try {
    const { protocol, hostname } = new URL(value);
    if (protocol !== 'https:') return false;
    const host = hostname.toLowerCase();
    return TRUSTED_IMAGE_HOSTS.some(trusted => host === trusted || host.endsWith(`.${trusted}`));
  } catch (_) {
    return false;
  }
}

// Animated images are reshaped with sharp (frame by frame) instead of the canvas.
function isAnimatedImage(buffer, contentType) {
  if (contentType.includes('gif') || buffer.subarray(0, 4).toString('latin1') === 'GIF8') return true;

  const header = buffer.subarray(0, 4096).toString('latin1');
  if (header.startsWith('RIFF') && header.includes('WEBP') && header.includes('ANIM')) return true; // Animated WebP
  if (header.startsWith('\x89PNG') && header.includes('acTL')) return true; // Animated PNG

  return false;
}

// Animated PNGs can't be read frame by frame by sharp, so they are left as they are.
function isAnimatedPng(buffer) {
  const header = buffer.subarray(0, 4096).toString('latin1');
  return header.startsWith('\x89PNG') && header.includes('acTL');
}

// Work out the padded canvas size for an image, or null if its shape and size are already fine.
function getReshapeSize(width, height, maxSize, { force = false } = {}) {
  if (!width || !height) return null;

  const ratio = width / height;
  const targetRatio = Math.min(Math.max(ratio, IMAGE_MIN_RATIO), IMAGE_MAX_RATIO);

  if (!force && targetRatio === ratio && width >= IMAGE_MIN_WIDTH) return null;

  // Canvas size before scaling: grow the short side so the canvas has the target shape.
  // The target shape is always landscape, so the width is the longest side.
  const baseWidth = targetRatio > ratio ? height * targetRatio : width;
  const baseHeight = targetRatio < ratio ? width / targetRatio : height;

  // Keep the result between the minimum width and the maximum size.
  const scale = Math.min(Math.max(1, IMAGE_MIN_WIDTH / baseWidth), maxSize / baseWidth);
  const canvasWidth = Math.round(baseWidth * scale);
  const canvasHeight = Math.round(baseHeight * scale);

  // Size of the original image when fitted inside the canvas.
  const fitScale = Math.min(canvasWidth / width, canvasHeight / height);
  const fitWidth = Math.max(1, Math.round(width * fitScale));
  const fitHeight = Math.max(1, Math.round(height * fitScale));

  return { canvasWidth, canvasHeight, fitWidth, fitHeight };
}

// Read a GIF's size from its first bytes so GIFs that already fill the embed can be skipped without downloading them fully.
function gifIsAlreadyFine(header) {
  if (header.subarray(0, 4).toString('latin1') !== 'GIF8' || header.length < 10) return false;

  const width = header.readUInt16LE(6);
  const height = header.readUInt16LE(8);
  if (!width || !height) return false;

  const ratio = width / height;

  return ratio >= IMAGE_MIN_RATIO && ratio <= IMAGE_MAX_RATIO && width >= IMAGE_MIN_WIDTH;
}

// Download an image. If skipIf(firstBytes) returns true, the download stops early and { skipped: true } is returned.
async function downloadImage(url, maxBytes = IMAGE_DOWNLOAD_MAX_BYTES, { skipIf } = {}) {
  if (!isTrustedImageHost(url)) return null;

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.startsWith('image/') || !response.body) return null;
  if (Number(response.headers.get('content-length')) > maxBytes) return null;

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let checked = !skipIf;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);

    if (!checked && total >= 16) {
      checked = true;
      if (skipIf(Buffer.concat(chunks))) {
        await reader.cancel();
        return { skipped: true };
      }
    }
  }

  const buffer = Buffer.concat(chunks);
  if (!buffer.length) return null;

  return { buffer, contentType };
}

// Redraw an image onto a canvas with a sensible shape: the full image stays visible in the middle,
// and a blurred, darkened copy of it fills the empty space. Returns null if no change is needed.
async function reshapeImage(buffer, { force = false } = {}) {
  const image = await loadImage(buffer);
  const { width, height } = image;

  const size = getReshapeSize(width, height, IMAGE_MAX_SIZE, { force });
  if (!size) return null;

  const { canvasWidth, canvasHeight, fitWidth, fitHeight } = size;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Background: the image stretched to cover the canvas, blurred and darkened.
  const coverScale = Math.max(canvasWidth / width, canvasHeight / height);
  const coverWidth = width * coverScale;
  const coverHeight = height * coverScale;
  ctx.filter = `blur(${Math.round(Math.max(canvasWidth, canvasHeight) / 25)}px)`;
  ctx.drawImage(image, (canvasWidth - coverWidth) / 2, (canvasHeight - coverHeight) / 2, coverWidth, coverHeight);
  ctx.filter = 'none';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Foreground: the whole image, centred.
  ctx.drawImage(image, (canvasWidth - fitWidth) / 2, (canvasHeight - fitHeight) / 2, fitWidth, fitHeight);

  return canvas.encode('jpeg', 90);
}

// Same as reshapeImage, but for animated GIFs/WebPs: every frame is padded, so the animation keeps playing.
// The blurred background is made from the first frame. Returns null if no change is needed or it isn't safe to do.
async function reshapeAnimatedImage(buffer) {
  const metadata = await sharp(buffer, { animated: true }).metadata();
  const width = metadata.width;
  const height = metadata.pageHeight || metadata.height;
  const frames = metadata.pages || 1;

  const size = getReshapeSize(width, height, GIF_MAX_SIZE);
  if (!size) return null;

  const { canvasWidth, canvasHeight, fitWidth, fitHeight } = size;

  // Very long or large GIFs would use too much memory/CPU, so leave those as they are.
  if (canvasWidth * canvasHeight * frames > GIF_MAX_PIXELS) return null;

  const left = Math.floor((canvasWidth - fitWidth) / 2);
  const top = Math.floor((canvasHeight - fitHeight) / 2);

  // Background: first frame stretched to cover the canvas, blurred and darkened.
  const background = await sharp(buffer, { pages: 1 })
    .resize(canvasWidth, canvasHeight, { fit: 'cover' })
    .blur(Math.max(1, Math.round(Math.max(canvasWidth, canvasHeight) / 25)))
    .composite([{
      input: { create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.45 } } }
    }])
    .png()
    .toBuffer();

  // Foreground: every frame resized and padded with transparency to the canvas size.
  // sharp stores animations as one tall image with the frames stacked on top of each other.
  const foreground = await sharp(buffer, { animated: true })
    .resize(fitWidth, fitHeight, { fit: 'fill' })
    .extend({
      top,
      bottom: canvasHeight - fitHeight - top,
      left,
      right: canvasWidth - fitWidth - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Repeat the background behind every frame, then lay the frames on top.
  const stacked = await sharp({
    create: { width: canvasWidth, height: canvasHeight * frames, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
  })
    .composite([
      { input: background, tile: true, top: 0, left: 0 },
      { input: foreground, raw: { width: canvasWidth, height: canvasHeight * frames, channels: 4 }, top: 0, left: 0 }
    ])
    .raw()
    .toBuffer();

  // effort: 1 encodes about twice as fast as the default, with almost the same file size.
  const output = await sharp(stacked, {
    raw: { width: canvasWidth, height: canvasHeight * frames, channels: 4, pageHeight: canvasHeight }
  })
    .gif({
      effort: 1,
      ...(metadata.delay ? { delay: metadata.delay } : {}),
      loop: metadata.loop ?? 0
    })
    .toBuffer();

  return output.length <= UPLOAD_MAX_BYTES ? output : null;
}

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

  const middle = `· · - ┈┈━━━ ˚ . 🌿 . ˚ ━━━┈┈ - · ·`;

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

    let messageContent = message.content || `[\`No Message Content\`]`;

    if (message.stickers.size > 0 && !message.content) {

      messageContent = `[\`Message contains stickers\`]`;

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
      .setTitle(`***${starboardEmoji} \`${guild.name}'s Starboard\` ${starboardEmoji}***`)
      .setThumbnail(guildIcon)
      .setFooter({
        text: `${starboardEmoji} STARBOARD • ${authorName}`,
        ...(authorAvatar ? { iconURL: authorAvatar } : {})
      });

    const images = [];
    const mediaLinks = [];
    const videoLinks = [];
    const videoThumbnails = new Set();
    const seenImages = new Set();
    const seenLinks = new Set();
    const resolvedGifPages = new Set();

    function mediaUrl(value) {
      try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
      } catch (_) {
        return null;
      }
    }

    function isGifProviderUrl(value) {
      const url = mediaUrl(value);
      if (!url) return false;
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname === 'tenor.com' || hostname.endsWith('.tenor.com') ||
        hostname === 'klipy.com' || hostname.endsWith('.klipy.com');
    }

    function isImageUrl(value) {
      const url = mediaUrl(value);
      if (!url) return false;
      const { hostname, pathname } = new URL(url);
      // Tenor/Klipy share links (e.g. tenor.com/abc.gif) end in .gif but are web pages, not images.
      if (isGifProviderUrl(url) && !/^media\d*\./i.test(hostname)) return false;
      return /\.(png|jpe?g|gif|webp|avif)$/i.test(pathname);
    }

    // Convert a Tenor video URL (…AAAPo/name.mp4) into its full-size GIF (…AAAAC/name.gif).
    function tenorGifFromVideo(value) {
      const url = mediaUrl(value);
      if (!url) return null;
      const parsed = new URL(url);
      if (!/(^|\.)tenor\.com$/i.test(parsed.hostname)) return null;
      const match = parsed.pathname.match(/^(?:\/m)?\/([A-Za-z0-9_-]{11})[A-Za-z0-9_-]{5}\/([^/]+)\.(?:mp4|webm|gif|png)$/i);
      if (!match) return null;
      return `https://media.tenor.com/${match[1]}AAAAC/${match[2]}.gif`;
    }

    // Fetch a Tenor/Klipy page and pull the animated GIF URL out of its meta tags.
    async function fetchGifFromPage(pageUrl) {
      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) return null;

      const html = await response.text();
      const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
      const candidates = {};

      for (const tag of metaTags) {
        const property = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
        if (!['twitter:image', 'og:image', 'og:image:url', 'og:image:secure_url'].includes(property)) continue;
        if (candidates[property]) continue;

        const contentUrl = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!contentUrl) continue;

        try {
          const directUrl = new URL(contentUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '"'), pageUrl);
          if (directUrl.protocol === 'https:') candidates[property] = directUrl.href;
        } catch (_) {}
      }

      // twitter:image is Tenor's full-size GIF; og:image is a small preview. Prefer animated .gif files.
      const ordered = ['twitter:image', 'og:image:secure_url', 'og:image:url', 'og:image']
        .map(key => candidates[key])
        .filter(Boolean);

      return ordered.find(u => /\.gif$/i.test(new URL(u).pathname)) || ordered[0] || null;
    }

    function isVideoAttachment(attachment) {
      if (attachment.contentType?.startsWith('video/')) return true;
      const url = mediaUrl(attachment.url);
      return !!url && /\.(mp4|mov|webm|mkv|m4v)$/i.test(new URL(url).pathname);
    }

    // Discord's media proxy returns a still frame of a video when asked for format=jpeg.
    function videoThumbnailUrl(attachment) {
      const url = mediaUrl(attachment.proxyURL || attachment.url);
      if (!url) return null;
      const thumbnail = new URL(url);
      thumbnail.searchParams.set('format', 'jpeg');
      return thumbnail.href;
    }

    // Links to other websites are downloaded through Discord's image proxy instead of directly.
    function downloadUrlFor(value) {
      if (isTrustedImageHost(value)) return value;

      for (const source of message.embeds) {
        if (source.image?.url === value && source.image.proxyURL) return source.image.proxyURL;
        if (source.thumbnail?.url === value && source.thumbnail.proxyURL) return source.thumbnail.proxyURL;
      }

      return null;
    }

    // Make sure the embed image has a sensible shape. Returns the final image URL to use.
    async function prepareEmbedImage(imageUrl) {
      const isVideoThumbnail = videoThumbnails.has(imageUrl);
      imageReady = false;

      const downloadUrl = downloadUrlFor(imageUrl);
      if (!downloadUrl) return imageUrl;

      try {
        const downloaded = await downloadImage(
          downloadUrl,
          isVideoThumbnail ? VIDEO_THUMBNAIL_MAX_BYTES : IMAGE_DOWNLOAD_MAX_BYTES,
          // Normal-shaped GIFs (most Tenor/Klipy GIFs) are skipped after reading their first few bytes.
          { skipIf: isVideoThumbnail ? undefined : gifIsAlreadyFine }
        );

        if (!downloaded) {
          if (isVideoThumbnail) console.error('Failed to download video thumbnail:', imageUrl);
          return imageUrl;
        }

        // From here on the result is final, so it can be reused on later edits.
        imageReady = true;

        if (downloaded.skipped) return imageUrl;

        // Animated GIFs/WebPs are reshaped frame by frame so they keep moving.
        if (isAnimatedImage(downloaded.buffer, downloaded.contentType)) {
          if (isAnimatedPng(downloaded.buffer)) return imageUrl;

          const reshapedGif = await reshapeAnimatedImage(downloaded.buffer);
          if (!reshapedGif) return imageUrl;

          files.push(new AttachmentBuilder(reshapedGif, { name: 'starboard-image.gif' }));
          return 'attachment://starboard-image.gif';
        }

        const reshaped = await reshapeImage(downloaded.buffer);
        if (reshaped) {
          files.push(new AttachmentBuilder(reshaped, { name: 'starboard-image.jpg' }));
          return 'attachment://starboard-image.jpg';
        }

        // Video still frames are always attached so they show up reliably in the embed.
        if (isVideoThumbnail) {
          const { contentType } = downloaded;
          const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
          files.push(new AttachmentBuilder(downloaded.buffer, { name: `video-thumbnail.${extension}` }));
          return `attachment://video-thumbnail.${extension}`;
        }
      } catch (error) {
        imageReady = false;
        console.error('Failed to prepare starboard image:', error);
      }

      return imageUrl;
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
      } else if (isVideoAttachment(attachment)) {
        // Embeds can't play videos, so show a still frame plus a link to the video.
        const thumbnail = videoThumbnailUrl(attachment);
        if (thumbnail) {
          addImage(thumbnail);
          videoThumbnails.add(thumbnail);
        }
        const videoUrl = mediaUrl(attachment.url);
        if (videoUrl) videoLinks.push(`▶ **[Watch video](<${videoUrl}>)**`);
      } else {
        addLink(attachment.name, attachment.url);
      }
    }

  
    const content = message.content || '';
    const customEmojiPattern = /<(a?):\w+:(\d+)>/g;
    const customEmojis = [...content.matchAll(customEmojiPattern)];
    if (customEmojis.length && !content.replace(customEmojiPattern, '').trim()) {
      for (const [, animated, id] of customEmojis) {
       // addImage(`https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=256&quality=lossless`);
      }
    }

    const spoilers = content.match(/\|\|[\s\S]*?\|\|/g) || [];
    const visibleContent = content.replace(/\|\|[\s\S]*?\|\|/g, '');

    for (const match of visibleContent.matchAll(/https?:\/\/[^\s<>]+/g)) {
      const url = match[0].replace(/[.,!?;:)\]]+$/, '');

      if (isImageUrl(url)) {
        addImage(url);
        continue;
      }

      if (!isGifProviderUrl(url)) continue;

      // Extract the actual GIF image URL from Tenor or Klipy pages.
      try {
        const gifUrl = tenorGifFromVideo(url) || await fetchGifFromPage(url);
        if (gifUrl) {
          addImage(gifUrl);
          resolvedGifPages.add(mediaUrl(url));
        }
      } catch (error) {
        console.error('Failed to extract GIF image:', error);
      }
    }

    for (const source of message.embeds) {
      if (source.url && spoilers.some(spoiler => spoiler.includes(source.url))) continue;

      // Tenor GIFs arrive as "gifv" embeds with only a still thumbnail + mp4, so rebuild the GIF URL.
      const tenorGif = tenorGifFromVideo(source.video?.url) || tenorGifFromVideo(source.thumbnail?.url);
      if (tenorGif) {
        addImage(tenorGif);
        if (source.url) seenLinks.add(mediaUrl(source.url));
        continue;
      }

      // Already handled by the Tenor/Klipy page lookup above; skip the still thumbnail.
      if (resolvedGifPages.has(mediaUrl(source.url))) continue;

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

      if (lines.length < mediaLinks.length) {
        lines.push('More media available via **Jump to message**.');
      }
    }

    const embeds = [embed];


    // -----------------------------------------------------------------------------------------------
    // DEBUG MODE (remove after Tenor testing)
    
    // console.log('[Starboard DEBUG] content:', JSON.stringify(message.content));
    // console.log('[Starboard DEBUG] source embeds:', JSON.stringify(message.embeds.map(e => ({
    //  type: e.data?.type, url: e.url, image: e.image?.url, thumbnail: e.thumbnail?.url, video: e.video?.url
    // }))));
    // console.log('[Starboard DEBUG] images found:', images);
    // -----------------------------------------------------------------------------------------------

    
    // Tenor and Klipy GIFs need a different image slot:
    // - Klipy: images[0] (the GIF pulled from the Klipy page)
    // - Tenor: images[1] (the GIF rebuilt from Discord's Tenor embed, which Discord can display)
    const isTenorHost = value => {
      const url = mediaUrl(value);
      return !!url && /(^|\.)tenor\.com$/i.test(new URL(url).hostname);
    };

    const isTenorMessage =
      [...visibleContent.matchAll(/https?:\/\/[^\s<>]+/g)].some(match => isTenorHost(match[0])) ||
      message.embeds.some(source => isTenorHost(source.url) || isTenorHost(source.video?.url));

    // Images/videos uploaded by the user are added first, so they always use images[0].
    const hasUploadedMedia = [...message.attachments.values()].some(attachment =>
      !attachment.spoiler &&
      (attachment.contentType?.startsWith('image/') || isImageUrl(attachment.url) || isVideoAttachment(attachment))
    );

    const files = [];
    let keptAttachments = [];
    let imageReady = false;
    let imageSource = null;
    let imageFile = null;
    let embedImage = null;

    // Fetch the existing starboard post (if any) so its image can be reused instead of rebuilt.
    let oldMsg = null;
    if (storedUrl) {
      try {
        oldMsg = await starboardChannelObj.messages.fetch(storedUrl.split('/').pop());
      } catch (_) {
        // The old starboard post no longer exists; a new one is sent below.
      }
    }

    if (images.length) {
      // Fall back to images[0] if Tenor only produced one image (e.g. Discord's embed had not loaded yet).
      embedImage = isTenorMessage && !hasUploadedMedia ? (images[1] || images[0]) : images[0];

      // Discord CDN links change their ?ex=… part over time, so compare without the query string.
      const sourceUrl = new URL(embedImage);
      imageSource = `${sourceUrl.origin}${sourceUrl.pathname}`;

      const previous = entryIndex !== -1 ? trackingList[entryIndex] : null;
      // Images made with older rules are rebuilt so they follow the current shape rules.
      const sameSource = oldMsg &&
        previous?.imageSource === imageSource &&
        previous?.imageVersion === IMAGE_RULES_VERSION;
      const previousAttachment = sameSource && previous.imageFile
        ? oldMsg.attachments.find(attachment => attachment.name === previous.imageFile)
        : null;

      if (sameSource && !previous.imageFile) {
        // Already checked last time: the original image needed no changes.
        imageReady = true;
        embed.setImage(embedImage);
      } else if (previousAttachment) {
        // Reuse the image that was already reshaped/uploaded, instead of rebuilding it on every star.
        imageReady = true;
        imageFile = previousAttachment.name;
        keptAttachments = [previousAttachment];
        embed.setImage(`attachment://${imageFile}`);
      } else {
        // Reshape oddly sized images (and attach video still frames) so the embed always looks tidy.
        const preparedImage = await prepareEmbedImage(embedImage);
        imageFile = preparedImage.startsWith('attachment://') ? preparedImage.slice('attachment://'.length) : null;
        embed.setImage(preparedImage);
      }
    }

    // Remember which image was used, so later edits can reuse it (failed attempts are retried next time).
    function saveImageInfo(entry) {
      if (imageReady) {
        entry.imageSource = imageSource;
        entry.imageFile = imageFile;
        entry.imageVersion = IMAGE_RULES_VERSION;
      } else {
        delete entry.imageSource;
        delete entry.imageFile;
        delete entry.imageVersion;
      }
    }

    // Build the description last so "Watch video" links can sit with the message content.
    // With no text, the video link replaces the "No Message Content" placeholder.
    const videoText = videoLinks.join('\n');
    const contentText = videoText && !message.content && !message.stickers.size
      ? ''
      : formatMessageContent(messageContent);
    const descriptionTop = `${middle}\n〉**__Author:__** <@${userId}>\n〉**__Channel:__** \`${message.channel.name}\`\n〉**__Reactions:__** \`${currentCount}\`\n\n**__Original Message__**\n**[Jump to message](${message.url})**\n${middle}\nㅤ\n`;
    const descriptionBottom = `${contentText && videoText ? '\n' : ''}${videoText}\nㅤ\n${middle}`;
    const contentRoom = EMBED_DESCRIPTION_LIMIT - descriptionTop.length - descriptionBottom.length;

    embed.setDescription(descriptionTop + truncate(contentText, contentRoom) + descriptionBottom);

    // -------------------------------------------------------------
    // Edit existing starboard message first
    // -------------------------------------------------------------

    if (oldMsg) {

      try {

        // attachments keeps only a reused image; anything else old is cleared so it isn't duplicated.
        await oldMsg.edit({
          content: '',
          embeds,
          files,
          attachments: keptAttachments
        });

        saveImageInfo(trackingList[entryIndex]);

        await db.starboardids.set(guildKey, trackingList);

        return;

      } catch (_) {

        // Only post a new one if the old message truly no longer exists

      }

    }

    // A reused image only exists on the old post, so rebuild it for a brand new post.
    if (keptAttachments.length) {
      keptAttachments = [];
      const preparedImage = await prepareEmbedImage(embedImage);
      imageFile = preparedImage.startsWith('attachment://') ? preparedImage.slice('attachment://'.length) : null;
      embed.setImage(preparedImage);
    }

    // -------------------------------------------------------------
    // Send new starboard message
    // -------------------------------------------------------------

    const newMsg = await starboardChannelObj.send({
      embeds,
      files
    });

    await newMsg.react(emojiForReaction);

    const newUrl =
      `https://discord.com/channels/${guildId}/${starboardChannelObj.id}/${newMsg.id}`;

    if (entryIndex !== -1) {

      trackingList[entryIndex].url = newUrl;

      saveImageInfo(trackingList[entryIndex]);

    } else {

      const newEntry = {

        user: safeUsername,

        messageId,

        url: newUrl

      };

      saveImageInfo(newEntry);

      trackingList.push(newEntry);

    }

    await db.starboardids.set(guildKey, trackingList);

  } catch (err) {

    console.error('Error in updateStarboard:', err);

  }

};
