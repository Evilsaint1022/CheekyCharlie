const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands'),

  async execute(interaction) {

    // Prevent command usage in DMs
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const guildId = interaction.guild.id;
    const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
    const space = 'ㅤ';

    // Get whitelisted roles
    const WHITELISTED_ROLE_IDS =
      (await db.whitelisted.get(`${guildId}.whitelistedRoles`)) || [];

    const memberRoles = interaction.member.roles.cache.map(r => r.id);

    const hasPermission = WHITELISTED_ROLE_IDS.some(id =>
      memberRoles.includes(id)
    );

    // ===================== COMMAND LISTS =====================

    const publicCommands = [
      '🌿 **__Economy__** 🌿',
      '- `?leaderboard`・Check the wallet/bank/money/level leaderboard.',
      '- `?balance`・Check your ferns balance or check another users balance.',
      '- `?deposit`・Deposit ferns into your bank.',
      '- `?withdraw`・Withdraw ferns from your bank.',
      '- `?level`・Check your current level or other users level.',
      '- `?daily`・Daily ferns collect.',
      '- `?pick`・Picks ferns when the drop party`s drops.',
      '- `?pay`・Pay other members Ferns.',
      `${space}`,
      `🌿 **__Economy Games__** 🌿`,
      '- `?slots` - Starts a game of slots using `?slots bet`.',
      `${space}`,
      '🌿 **__Counting__** 🌿',
      '- `?counting`・View the current and next expected number.',
      `${space}`,
      '🌿 **__Fun__** 🌿',
      '- `?cat` - Generates a random picture of a cat.',
      '- `?dog` - Generates a random picture of a dog.',
      '- `?slap` - Slap other users by using `?slap @user`.',
      '- `?kick` - Kick other users by using `?kick @user`.',
      '- `?hug` - Hug other users by using `?hug @user`.',
      '- `?kiss` - Kiss other users by using `?kiss @user`.',
      '- `?tickle` - Tickle other users by using `?tickle @user`.',
      `\nㅤ\n${middle}`
    ];

    const whitelistedCommands = [
      '`Whitelisted Prefix Commands Coming Soon...`',
      `\n${middle}`
    ];

    // ===================== EMBEDS =====================

    const embeds = [];

    // Page 0 — Everyone
    embeds.push(
      new EmbedBuilder()
        .setTitle('🌿 **__CheekyCharlie Help Menu__** 🌿')
        .setColor('#de4949')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setDescription(
          'ㅤ\n> Prefix has been set to `?`\n\nHere are the available prefix commands:\nㅤ\n' +
          middle
        )
        .addFields({
          name: '🌿 **__Everyone Prefix Commands__** 🌿\nㅤ',
          value: publicCommands.join('\n')
        })
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp()
    );

    // Page 1 — Whitelisted (ONLY if allowed)
    if (hasPermission) {
      embeds.push(
        new EmbedBuilder()
          .setTitle('🌿 **__CheekyCharlie Help Menu__** 🌿')
          .setColor('#de4949')
          .setThumbnail(interaction.client.user.displayAvatarURL())
          .setDescription(
          'ㅤ\n> Prefix has been set to `?`\n\nHere are the available prefix commands:\nㅤ\n' +
          middle
        )
          .addFields({
            name: '🌿 **__Whitelisted Prefix Commands__** 🌿\nㅤ',
            value: whitelistedCommands.join('\n')
          })
          .setFooter({ text: `Requested by ${interaction.user.tag}` })
          .setTimestamp()
      );
    }

// ===================== BUTTONS =====================

    let page = 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId('stop')
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(embeds.length === 1)
    );

    const message = await interaction.reply({
      embeds: [embeds[page]],
      components: [row],
      fetchReply: true
    });

    // ===================== COLLECTOR =====================

    const collector = message.createMessageComponentCollector({
      time: 60_000
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "You can't use these buttons.",
          ephemeral: true
        });
      }

      if (i.customId === 'stop') {
        collector.stop('stopped');
        return i.update({
          components: [
            new ActionRowBuilder().addComponents(
              row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
            )
          ]
        });
      }

      if (i.customId === 'prev') page--;
      if (i.customId === 'next') page++;

      row.components[0].setDisabled(page === 0);
      row.components[2].setDisabled(page === embeds.length - 1);

      await i.update({
        embeds: [embeds[page]],
        components: [row]
      });
    });

    collector.on('end', async () => {
      row.components.forEach(button => button.setDisabled(true));
      await message.edit({ components: [row] });
    });
  }
};
