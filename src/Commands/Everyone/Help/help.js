const {
  SlashCommandBuilder,
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
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands'),

  async execute(interaction) {
    // Prevent DMs
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: 'This command cannot be used in DMs.',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
    const space = 'ㅤ';

    // ===================== PERMISSIONS =====================

    const WHITELISTED_ROLE_IDS =
      (await db.whitelisted.get(`${guildId}.whitelistedRoles`)) || [];

    const memberRoles = interaction.member.roles.cache.map(r => r.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(id =>
      memberRoles.includes(id)
    );

    // ===================== COMMAND LISTS =====================
    // Each line = ONE item (important for 15 per page)

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
      '🌿 **__Join-to-Create VC_** 🌿',
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
      '- `?avatar` - View yours or someone elses avatar using `?pfp @user`',
      '- `?ai-search` - Use `gpt-4o-mini` to search for results `?ai text`',
      '- `?emoji` - Show a custom emoji as an image (PNG/GIF) using `?e Emoji`.',
      '- `?cat` - Generates a random picture of a cat.',
      '- `?dog` - Generates a random picture of a dog.',
      '- `?slap` - Slap other users by using `?slap @user`.',
      '- `?kick` - Kick other users by using `?kick @user`.',
      '- `?hug` - Hug other users by using `?hug @user`.',
      '- `?kiss` - Kiss other users by using `?kiss @user`.',
      '- `?tickle` - Tickle other users by using `?tickle @user`.',
      `${space}`,
      '🌿 **__Others__** 🌿',
      '- `?ping` - Check the bot`s latency.',
      '- `?invite` - Generates a temporary invite link for server you are in.',
      `\nㅤ\n${middle}`
    ];

    const whitelistedCommands = [
      '`Whitelisted Prefix Commands Coming Soon...`',
      `\n${middle}`
    ];

    // ===================== EMBEDS =====================

    const embeds = [];

    // Public pages (15 items per page)
    const publicPages = chunkByItems(publicCommands, 15);

    publicPages.forEach((content, index) => {
      embeds.push(
        new EmbedBuilder()
          .setTitle('🌿 **CheekyCharlie Help Menu** 🌿')
          .setColor(0x207e37)
          .setThumbnail(interaction.client.user.displayAvatarURL())
          .setDescription(
            `> Prefix: \`?\`\n\n${content}\n\n${middle}`
          )
          .setFooter({
            text: `Page ${index + 1}/${publicPages.length} • Requested by ${interaction.user.tag}`
          })
          .setTimestamp()
      );
    });

    // Whitelisted pages
    if (hasPermission) {
      const staffPages = chunkByItems(whitelistedCommands, 15);

      staffPages.forEach((content, index) => {
        embeds.push(
          new EmbedBuilder()
            .setTitle('🌿 **Whitelisted Commands** 🌿')
            .setColor(0xde4949)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setDescription(`${content}\n\n${middle}`)
            .setFooter({
              text: `Staff Page ${index + 1}/${staffPages.length} • ${interaction.user.tag}`
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
      row.components.forEach(button => button.setDisabled(true));
      await message.edit({ components: [row] });
    });
  }
};
