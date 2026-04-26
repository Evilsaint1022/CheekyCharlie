const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  Events,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} = require('discord.js');
const crypto = require('crypto');
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

function buildChallengeContainer(session, sessionId) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${session.equation}**`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent([
        '```',
        session.input || ' ',
        '```'
      ].join('\n'))
    )
    .addSeparatorComponents(
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

    if (interaction.customId === 'verification_start') {
      if (!interaction.guild) {
        return interaction.reply({
          content: 'This verification button can only be used in a server.',
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

      if (!member) {
        return interaction.reply({
          content: 'I could not find your member profile in this server.',
          flags: 64
        });
      }

      if (member.roles.cache.has(role.id)) {
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

      const equation = createEquation();
      const sessionId = crypto.randomBytes(8).toString('hex');

      sessions.set(sessionId, {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        roleId: role.id,
        equation: equation.text,
        answer: equation.answer,
        input: ''
      });
      deleteSessionLater(sessionId);

      return interaction.reply({
        components: [buildChallengeContainer(sessions.get(sessionId), sessionId)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
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

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const role = await interaction.guild.roles.fetch(session.roleId).catch(() => null);

    if (!member || !role) {
      return interaction.update({
        components: [buildStatusContainer('❌ Verification failed because the member or role could not be found.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (!role.editable) {
      return interaction.update({
        components: [buildStatusContainer('❌ I cannot assign the verified role. Please ask staff to check my permissions and role hierarchy.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      await member.roles.add(role, 'Completed verification challenge');
    } catch (error) {
      console.error('Failed to assign verified role:', error);

      return interaction.update({
        components: [buildStatusContainer('❌ I could not assign the verified role. Please ask staff to check my permissions and role hierarchy.')],
        flags: MessageFlags.IsComponentsV2
      });
    }

    return interaction.update({
      components: [buildStatusContainer(`✅ Correct. You have been given the **${role.name}** role.`)],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
