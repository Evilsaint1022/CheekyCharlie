const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  Events,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} = require('discord.js');
const crypto = require('crypto');
const { createCanvas } = require('@napi-rs/canvas');
const db = require('../../Handlers/database');

const sessions = new Map();
const SESSION_TTL = 5 * 60 * 1000;

function createEquation() {
  const numbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);

  return {
    text: numbers.join(' + '),
    answer: numbers.reduce((total, number) => total + number, 0).toString()
  };
}

function createPuzzle() {
  const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));

  return {
    text: digits.join(' '),
    answer: digits.join('')
  };
}

function createPuzzleCaptchaAttachment(answer, sessionId) {
  const width = 330;
  const height = 125;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const textCanvas = createCanvas(width, height);
  const textCtx = textCanvas.getContext('2d');
  const warpCanvas = createCanvas(width, height);
  const warpCtx = warpCanvas.getContext('2d');

  ctx.fillStyle = '#f7f7f2';
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 2) {
    const alpha = 0.02 + Math.random() * 0.02;
    ctx.strokeStyle = `rgba(30, 30, 30, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 2);
    ctx.lineTo(width, y + Math.random() * 2);
    ctx.stroke();
  }

  for (let x = -width; x < width * 2; x += 14) {
    ctx.strokeStyle = `rgba(90, 105, 130, ${0.05 + Math.random() * 0.05})`;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 40, height);
    ctx.stroke();
  }

  for (let i = 0; i < 240; i += 1) {
    ctx.fillStyle = `rgba(20, 20, 20, ${0.03 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.8 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 6; i += 1) {
    ctx.strokeStyle = `rgba(200, 70, 60, ${0.15 + Math.random() * 0.07})`;
    ctx.lineWidth = 2 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(0, Math.random() * height);
    ctx.bezierCurveTo(
      width * 0.2,
      Math.random() * height,
      width * 0.8,
      Math.random() * height,
      width,
      Math.random() * height
    );
    ctx.stroke();
  }

  textCtx.textAlign = 'center';
  textCtx.textBaseline = 'middle';

  const warp = (x) => {
    const amplitude = 4 + Math.random() * 5;
    const frequency = 0.025 + Math.random() * 0.02;
    return Math.sin(x * frequency) * amplitude;
  };

  answer.split('').forEach((digit, index) => {
    const segmentWidth = (width - 40) / answer.length;
    const baseX = 20 + segmentWidth * index + segmentWidth / 2;
    const x = baseX + (Math.random() * 14 - 7);
    const y = height / 2 + warp(baseX) + (Math.random() * 16 - 8);
    const rotation = (Math.random() * 0.55) - 0.275;
    const fontSize = 50 + Math.floor(Math.random() * 12);

    textCtx.save();
    textCtx.translate(x, y);
    textCtx.rotate(rotation);
    textCtx.transform(
      1 + (Math.random() * 0.10 - 0.05),
      Math.random() * 0.12 - 0.06,
      Math.random() * 0.16 - 0.08,
      1 + (Math.random() * 0.10 - 0.05),
      0,
      0
    );
    textCtx.font = `900 ${fontSize}px sans-serif`;
    textCtx.strokeStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.12})`;
    textCtx.lineWidth = 1.3 + Math.random() * 1.5;
    textCtx.strokeText(digit, 0, 0);
    textCtx.fillStyle = ['#111827', '#1f2937', '#0f172a', '#2b2d42'][index % 4];
    textCtx.fillText(digit, 0, 0);
    textCtx.restore();
  });

  // Pass 1: column-slice warp with strong bulge and wave distortion.
  for (let x = 0; x < width; x += 1) {
    const sliceWidth = 1;
    const centerOffset = (x + sliceWidth / 2 - width / 2) / (width / 2);
    const bulge = (1 - Math.min(1, centerOffset * centerOffset)) * (8 + Math.random() * 4);
    const wave = Math.sin(x * 0.11) * (3 + Math.random() * 1.2);
    const jitter = Math.random() * 2 - 1;
    const destY = wave - bulge / 2 + jitter;
    const destHeight = height + bulge;

    warpCtx.drawImage(
      textCanvas,
      x,
      0,
      sliceWidth,
      height,
      x,
      destY,
      sliceWidth,
      destHeight
    );
  }

  // Pass 2: row-slice warp to add fish-eye/shear horizontally as well.
  for (let y = 0; y < height; y += 1) {
    const sliceHeight = 1;
    const centerOffset = (y + sliceHeight / 2 - height / 2) / (height / 2);
    const bow = Math.sin((1 - centerOffset * centerOffset) * Math.PI) * (7 + Math.random() * 3);
    const wave = Math.sin(y * 0.16) * (3.5 + Math.random() * 1);
    const jitter = Math.random() * 2.5 - 1.25;
    const destX = bow + wave + jitter - 5;
    const destWidth = width + 10;

    ctx.drawImage(
      warpCanvas,
      0,
      y,
      width,
      sliceHeight,
      destX,
      y,
      destWidth,
      sliceHeight
    );
  }

  for (let i = 0; i < 4; i += 1) {
    ctx.strokeStyle = `rgba(40, 50, 80, ${0.12 + Math.random() * 0.07})`;
    ctx.lineWidth = 3 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(-20, Math.random() * height);
    ctx.bezierCurveTo(
      width * 0.25,
      Math.random() * height,
      width * 0.75,
      Math.random() * height,
      width + 20,
      Math.random() * height
    );
    ctx.stroke();
  }

  // Stronger foreground interference stripes that pass directly over the digits.
  for (let i = 0; i < 3; i += 1) {
    ctx.strokeStyle = `rgba(20, 20, 20, ${0.12 + Math.random() * 0.08})`;
    ctx.lineWidth = 4 + Math.random() * 2.5;
    ctx.beginPath();
    const startX = -20;
    const startY = 18 + i * 24 + (Math.random() * 12 - 6);
    const cp1X = width * 0.25;
    const cp1Y = Math.random() * height;
    const cp2X = width * 0.75;
    const cp2Y = Math.random() * height;
    const endX = width + 20;
    const endY = 20 + i * 22 + (Math.random() * 14 - 7);
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
    ctx.stroke();
  }

  for (let i = 0; i < 2; i += 1) {
    ctx.strokeStyle = `rgba(210, 95, 70, ${0.12 + Math.random() * 0.06})`;
    ctx.lineWidth = 2 + Math.random() * 2;
    ctx.beginPath();
    const stripeX = 20 + i * 70 + (Math.random() * 18 - 9);
    ctx.moveTo(stripeX, -10);
    ctx.lineTo(stripeX - (40 + Math.random() * 30), height + 10);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + Math.random() * 0.08})`;
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    const rw = 10 + Math.random() * 28;
    const rh = 2 + Math.random() * 6;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate((Math.random() * 1.2) - 0.6);
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }

  for (let i = 0; i < 18; i += 1) {
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.06 + Math.random() * 0.08})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + (Math.random() * 44 - 22), startY + (Math.random() * 44 - 22));
    ctx.stroke();
  }

  const attachmentName = `verification-puzzle-${sessionId}.png`;

  return new AttachmentBuilder(canvas.toBuffer('image/png'), {
    name: attachmentName
  });
}

function buildChallengeContainer(session, sessionId) {
  const prompt = session.mode === 'puzzle'
    ? 'Enter the digits exactly as shown below.'
    : 'Solve the math problem below.';

  const container = new ContainerBuilder();

  if (session.mode === 'puzzle' && session.attachmentName) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(`attachment://${session.attachmentName}`)
      )
    );
  }

  container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(prompt)
    );

  if (session.mode === 'math') {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${session.challengeText}**`)
    );
  }

  container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([
        '```',
        session.input || ' ',
        '```'
      ].join('\n'))
    ).addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    );

  buildKeypadRows(sessionId).forEach(row => container.addActionRowComponents(row));

  return container;
}

function buildStatusContainer(content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(content)
    );
}

function buildKeypadRows(sessionId) {
  const layout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['x', '0', 'check']
  ];

  return layout.map(row => new ActionRowBuilder().addComponents(
    row.map(value => {
      const button = new ButtonBuilder()
        .setCustomId(`verification_key_${sessionId}_${value}`)
        .setStyle(value === 'check' ? ButtonStyle.Success : ButtonStyle.Secondary);

      if (value === 'check') {
        return button.setLabel('✔︎');
      }

      return button.setLabel(value);
    })
  ));
}

function deleteSessionLater(sessionId) {
  setTimeout(() => sessions.delete(sessionId), SESSION_TTL);
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'verification_start' || interaction.customId.startsWith('verification_start_')) {
      if (!interaction.guild) {
        return interaction.reply({
          content: 'This verification button can only be used in a server.',
          flags: 64
        });
      }

      const mode = interaction.customId === 'verification_start'
        ? 'math'
        : interaction.customId.replace('verification_start_', '').toLowerCase();

      if (!['math', 'puzzle'].includes(mode)) {
        return interaction.reply({
          content: 'This verification button is using an unknown mode.',
          flags: 64
        });
      }

      const settings = await db.settings.get(interaction.guild.id) || {};
      const roleId = settings.VerifiedRole;

      if (!roleId) {
        return interaction.reply({
          content: 'No verified role has been set for this server yet.',
          flags: 64
        });
      }

      const role = await interaction.guild.roles.fetch(roleId).catch(() => null);

      if (!role) {
        return interaction.reply({
          content: 'The configured verified role no longer exists.',
          flags: 64
        });
      }

      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      const roleToRemove = settings.UnverifiedRole
        ? await interaction.guild.roles.fetch(settings.UnverifiedRole).catch(() => null)
        : null;

      if (!member) {
        return interaction.reply({
          content: 'I could not find your member profile in this server.',
          flags: 64
        });
      }

      if (roleToRemove && member.roles.cache.has(roleToRemove.id) && !roleToRemove.editable) {
        return interaction.reply({
          content: 'I cannot remove the configured old role. Please check my role permissions and hierarchy.',
          flags: 64
        });
      }

      if (member.roles.cache.has(role.id)) {
        if (roleToRemove && member.roles.cache.has(roleToRemove.id)) {
          await member.roles.remove(roleToRemove, 'Already verified; removing old verification role').catch(error => {
            console.error('Failed to remove old verification role from already verified member:', error);
          });
        }

        return interaction.reply({
          content: 'You are already verified.',
          flags: 64
        });
      }

      if (!role.editable) {
        return interaction.reply({
          content: 'I cannot assign the configured verified role. Please check my role permissions and hierarchy.',
          flags: 64
        });
      }

      const challenge = mode === 'puzzle' ? createPuzzle() : createEquation();
      const sessionId = crypto.randomBytes(8).toString('hex');
      const captchaAttachment = mode === 'puzzle'
        ? createPuzzleCaptchaAttachment(challenge.answer, sessionId)
        : null;

      sessions.set(sessionId, {
        mode,
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        roleId: role.id,
        roleToRemoveId: settings.UnverifiedRole || null,
        challengeText: challenge.text,
        answer: challenge.answer,
        attachmentName: captchaAttachment?.name || null,
        input: ''
      });
      deleteSessionLater(sessionId);

      const replyOptions = {
        components: [buildChallengeContainer(sessions.get(sessionId), sessionId)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      };

      if (captchaAttachment) {
        replyOptions.files = [captchaAttachment];
      }

      return interaction.reply(replyOptions);
    }

    if (!interaction.customId.startsWith('verification_key_')) return;

    const [, , sessionId, value] = interaction.customId.split('_');
    const session = sessions.get(sessionId);

    if (!session) {
      return interaction.update({
        components: [buildStatusContainer('This verification session has expired. Press the verification button again.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (session.userId !== interaction.user.id || session.guildId !== interaction.guild?.id) {
      return interaction.reply({
        content: 'This verification keypad is not for you.',
        flags: 64
      });
    }

    if (value === 'x') {
      session.input = session.input.slice(0, -1);

      return interaction.update({
        components: [buildChallengeContainer(session, sessionId)],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (value !== 'check') {
      if (session.input.length < 6) {
        session.input += value;
      }

      return interaction.update({
        components: [buildChallengeContainer(session, sessionId)],
        flags: MessageFlags.IsComponentsV2
      });
    }

    sessions.delete(sessionId);

    if (session.input !== session.answer) {
      return interaction.update({
        components: [buildStatusContainer('❌ Incorrect answer. Verification cancelled. Press the verification button again to retry.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    await interaction.deferUpdate();

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const role = await interaction.guild.roles.fetch(session.roleId).catch(() => null);
    const roleToRemove = session.roleToRemoveId
      ? await interaction.guild.roles.fetch(session.roleToRemoveId).catch(() => null)
      : null;

    if (!member || !role) {
      return interaction.editReply({
        components: [buildStatusContainer('❌ Verification failed because the member or role could not be found.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!role.editable) {
      return interaction.editReply({
        components: [buildStatusContainer('❌ I cannot assign the verified role. Please ask staff to check my permissions and role hierarchy.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (roleToRemove && member.roles.cache.has(roleToRemove.id) && !roleToRemove.editable) {
      return interaction.editReply({
        components: [buildStatusContainer('❌ I cannot remove the old role. Please ask staff to check my permissions and role hierarchy.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      await member.roles.add(role, 'Completed verification challenge');
      if (roleToRemove && member.roles.cache.has(roleToRemove.id)) {
        await member.roles.remove(roleToRemove, 'Completed verification challenge');
      }
    } catch (error) {
      console.error('Failed to update verification roles:', error);

      return interaction.editReply({
        components: [buildStatusContainer('❌ I could not update your verification roles. Please ask staff to check my permissions and role hierarchy.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    return interaction.editReply({
      components: [buildStatusContainer(`✅ Correct. You have been given the **${role.name}** role.`)],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
