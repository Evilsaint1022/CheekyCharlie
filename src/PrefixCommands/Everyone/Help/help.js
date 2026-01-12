const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const db = require('../../../Handlers/database');

/**
 * Splits an array into pages of a fixed size
 */
function chunkByItems(array, itemsPerPage = 15) {
  const pages = [];
  for (let i = 0; i < array.length; i += itemsPerPage) {
    pages.push(array.slice(i, i + itemsPerPage).join('\n'));
  }
  return pages;
}

module.exports = {
  name: 'help',
  aliases: ['commands'],

  async execute(message) {
    // Prevent DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guildId = message.guild.id;
    const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
    const space = 'ㅤ';

    // ===================== PERMISSIONS =====================

    const WHITELISTED_ROLE_IDS =
      (await db.whitelisted.get(`${guildId}.whitelistedRoles`)) || [];

    const memberRoles = message.member.roles.cache.map(r => r.id);
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
      '- `blackjack-singleplayer` - Starts a game of blackjack using `?blackjack bet.`',
      '- `?blackjack-duels` - Starts a game of blackjack duels using `?blackjack-duels @user bet.`',
      '- `?slots` - Starts a game of slots using `?slots bet`.',
      `${space}`,
      '🌿 **__Shop__** 🌿',
      '- `?shop` - View the shop.',
      '- `?buy` - Buy items from the shop.',
      '- `?use` - Use items.',
      '- `?refund` - refund items bought from the shop.',
      '- `?inventory` - View your inventory.',
      `${space}`,
      '🌿 **__Join-to-Create VC__** 🌿',
      '- `?lock-vc` - Locks the join-to-create vc channel.',
      '- `?unlock-vc` - Unlocks the join-to-create vc channel.',
      `${space}`,
      '🌿 **__One-Word-Story__** 🌿',
      '- `?view-one-word-story` - Starts a game of one-word-story.',
      `${space}`,
      '🌿 **__Staff Applications__** 🌿',
      '- `?staff-apply` - Start a new staff application',
      `${space}`,
      '🌿 **__Venting__** 🌿',
      '- `?vent` - Vent anonymously to the vent channel.',
      `${space}`,
      '🌿 **__Counting__** 🌿',
      '- `?counting`・View the current and next expected number.',
      `${space}`,
      '🌿 **__Birthdays__** 🌿',
      '- `?birthday set` - Sets a birthday using `?birthday set dd/mm/yyyy`.',
      `${space}`,
      '🌿 **__Fun__** 🌿',
      '- `?avatar` - View yours or someone elses avatar.',
      '- `?ai-search` - Use AI search.',
      '- `?emoji` - Show a custom emoji.',
      '- `?cat` - Random cat image.',
      '- `?dog` - Random dog image.',
      '- `?slap` - Slap a user.',
      '- `?kick` - Kick a user.',
      '- `?hug` - Hug a user.',
      '- `?kiss` - Kiss a user.',
      '- `?tickle` - Tickle a user.',
      `${space}`,
      '🌿 **__Others__** 🌿',
      '- `?ping` - Check the bot`s latency.',
      '- `?invite` - Generate a server invite.',
      `\nㅤ\n${middle}`
    ];

    const whitelistedCommands = [
      '`Whitelisted Prefix Commands Coming Soon...`',
      `\n${middle}`
    ];

    // ===================== EMBEDS =====================

    const embeds = [];

    const publicPages = chunkByItems(publicCommands, 15);
    publicPages.forEach((content, index) => {
      embeds.push(
        new EmbedBuilder()
          .setTitle('🌿 **CheekyCharlie Help Menu** 🌿')
          .setColor(0x207e37)
          .setThumbnail(message.client.user.displayAvatarURL())
          .setDescription(`> Prefix: \`?\`\n\n${content}\n\n${middle}`)
          .setFooter({
            text: `Page ${index + 1}/${publicPages.length} • Requested by ${message.author.tag}`
          })
          .setTimestamp()
      );
    });

    if (hasPermission) {
      const staffPages = chunkByItems(whitelistedCommands, 15);
      staffPages.forEach((content, index) => {
        embeds.push(
          new EmbedBuilder()
            .setTitle('🌿 **Whitelisted Commands** 🌿')
            .setColor(0xde4949)
            .setThumbnail(message.client.user.displayAvatarURL())
            .setDescription(`${content}\n\n${middle}`)
            .setFooter({
              text: `Staff Page ${index + 1}/${staffPages.length} • ${message.author.tag}`
            })
            .setTimestamp()
        );
      });
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

    const helpMessage = await message.reply({
      embeds: [embeds[page]],
      components: [row]
    });

    // ===================== COLLECTOR =====================

    const collector = helpMessage.createMessageComponentCollector({
      time: 60_000
    });

    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: "You can't use these buttons.",
          ephemeral: true
        });
      }

      if (i.customId === 'stop') {
        collector.stop();
        return i.update({
          components: [
            new ActionRowBuilder().addComponents(
              row.components.map(btn =>
                ButtonBuilder.from(btn).setDisabled(true)
              )
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
      row.components.forEach(btn => btn.setDisabled(true));
      await helpMessage.edit({ components: [row] });
    });
  }
};
