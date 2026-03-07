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

    const guildName = interaction.guild.name;
    const guildId = interaction.guild.id;
    const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const space = 'ㅤ';

    // ===================== PERMISSIONS =====================

    const WHITELISTED_ROLE_IDS =
      (await db.whitelisted.get(`${guildId}.whitelistedRoles`)) || [];

    const memberRoles = interaction.member.roles.cache.map(r => r.id);
    const hasPermission = WHITELISTED_ROLE_IDS.some(id =>
      memberRoles.includes(id)
    );

    // ===================== PERMISSIONS =====================

    console.log(`[🌿] [HELP] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the help command.`);

    // ===================== COMMAND LISTS =====================
    // Each line = ONE item (important for 20 per page)

    const publicCommands = [
      '**🌿・__Economy__**',
      '- `?leaderboard`・Check the wallet/bank/money/level leaderboard',
      '- `?balance`・Check your ferns balance or check another users balance',
      '- `?deposit`・Deposit ferns into your bank',
      '- `?withdraw`・Withdraw ferns from your bank',
      '- `?level`・Check your current level or other users level',
      '- `?levelroles`・View all level roles for this server',
      '- `?pick`・Picks ferns when the drop party`s drops',
      '- `?pay`・Pay other members Ferns',
      '- `?rob`・Rob another user`s wallet',
      '- `?heist`・Heist another user`s bank',
      '- `?beg`・Beg for ferns',
      '- `?daily`・Daily ferns collect',
      '- `?weekly`・Weekly ferns collect',
      '- `?monthly`・Monthly ferns collect',
      ``,
      '**🌿・__Economy Games__**',
      '- `blackjack-singleplayer`・Starts a game of blackjack`',
      '- `?blackjack-duels`・Starts a game of blackjack duels`',
      '- `?slots`・Starts a game of slots using `?slots bet`',
      ``,
      '**🌿・__Passive Mode__**',
      '- `?passive`・Toggle passive mode',
      ``,
      '**🌿・__Shop__**',
      '- `?shop`・View the shop',
      '- `?buy`・Buy items from the shop',
      '- `?use`・Use items.',
      '- `?refund`・refund items bought from the shop',
      '- `?inventory`・View your inventory',
      ``,
      '**🌿・__Join-to-Create VC__**',
      '- `?lock-vc`・Locks the join-to-create vc channel',
      '- `?unlock-vc`・Unlocks the join-to-create vc channel',
      ``,
      '**🌿・__One-Word-Story__**',
      '- `?view-one-word-story`・Views the current story in the server',
      ``,
      '**🌿・__Staff Applications__**',
      '- `?staff-apply`・Start a new staff application',
      ``,
      '**🌿・__Venting__**',
      '- `?venting`・Vent anonymously to the vent channel',
      ``,
      '**🌿・__Counting__**',
      '- `?counting`・View the current, next expected and record number for the guilds counting.',
      ``,
      '**🌿・__Birthdays__**',
      '- `?birthday set`・Set your birthday. Format:`dd/mm/yyyy`',
      ``,
      '**🌿・__Fun__**',
      '- `?avatar`・View yours or someone elses avatar',
      '- `?ai-search`・Use AI search',
      '- `?emoji`・Show a custom emoji',
      '- `?cat`・Random cat image.',
      '- `?dog`・Random dog image',
      '- `?slap`・Slap a user',
      '- `?kick`・Kick a user',
      '- `?hug`・Hug a user',
      '- `?kiss`・Kiss a user',
      '- `?tickle`・Tickle a user',
      '- `?punch`・Punch a user',
      ``,
      '**🌿・__Others__**',
      '- `?help`・View all commands',
      '- `?github`・View the bot`s github repo',
      '- `?ping`・Check the bot`s latency',
      '- `?invite`・Generate a temporary invite link for the server',
    ];

    const whitelistedCommands = [
      '**🌿・__Set-Whitelisted-Role__**',
      '- `?set-whitelisted-roles`・Sets a role to be whitelisted',
      '- `?remove-whitelisted-roles`・Removes a role from being whitelisted',
      ``,
      '**🌿・__Staff-Applications__**',
      '- `?staff-toggle`・Toggles staff applications from open and closed.',
      ``,
      '**🌿・__Ghostping__**',
      '- `?ghostping-toggle`・Toggles ghostping from on and off.',
      ``,
      '**🌿・__Prefix__**',
      '- `?prefix-set`・Sets a prefix for the server',
      '- `?prefix-reset`・Resets the prefix for the server',
      ``,
      '**🌿・__Others__**',
      '- `?echo`・Repeats what ever you say',
      '- `?stop`・Staff command to use during heated moments in chat',
      '- `?steal`・teal emojis from other guilds',
      ``,
      '**🌿・__Birthdays__**',
      '- `?birthdaychannel`・Sets a birthday channel for the birthday messages',
      '- `?birthdaypingrole`・Sets a role to be pinged for the birthday messages',
      '- `?birthdaygivenrole`・Sets a role to be given for birthdays',
    ];

    // ===================== EMBEDS =====================

    const embeds = [];

    // Public pages (15 items per page)
    const publicPages = chunkByItems(publicCommands, 30);

    publicPages.forEach((content, index) => {
      embeds.push(
        new EmbedBuilder()
          .setTitle(`🌿 **__Help Menu__** 🌿`)
          .setColor(0x207e37)
          .setThumbnail(interaction.client.user.displayAvatarURL())
          .setDescription(
            `- **The Prefix has been set to** \`?\`\n${middle}\n${content}\n${middle}`
          )
          .setFooter({
            text: `Page ${index + 1}/${publicPages.length} • Requested by ${interaction.user.tag}`
          })
          .setTimestamp()
      );
    });

    // Whitelisted pages
    if (hasPermission) {
      const staffPages = chunkByItems(whitelistedCommands, 30);

      staffPages.forEach((content, index) => {
        embeds.push(
          new EmbedBuilder()
            .setTitle('🌿 **__Whitelisted Commands__** 🌿')
            .setColor(0x207e37)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setDescription(`${middle}\n${content}\n${middle}`)
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
