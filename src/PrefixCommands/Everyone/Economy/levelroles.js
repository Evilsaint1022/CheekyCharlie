const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
  name: "levelroles",
  aliases: ["lr"],
  description: "Displays all level roles for this guild",

  async execute(message, args) {

    if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const guildKey = `${message.guild.id}`;

    console.log(
      `[🌿] [LEVEL ROLES] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
      `${message.guild.name} ${message.guild.id} ${message.author.tag} used levelroles command.`
    );

    const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
    const bottom = `**╰────────────────────────────╯**`;
    const bottommessage = `🌿・Four-Squre Level Roles`;
    const levelRoles = await db.levelroles.get(guildKey);

    if (!levelRoles || Object.keys(levelRoles).length === 0) {
      return message.reply("❌ No level roles have been set for this server.");
    }

    // Sort levels numerically
    const sortedLevels = Object.keys(levelRoles)
      .sort((a, b) => Number(a) - Number(b));

    // ------------------------------
    // PAGINATION
    // ------------------------------
    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(sortedLevels.length / itemsPerPage));
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;

      const content = sortedLevels
        .slice(start, start + itemsPerPage)
        .map((level, idx) => {
          const data = levelRoles[level];
          const role = message.guild.roles.cache.get(data.roleId);

          const base = `**__Level ${level}__**`;
          const roleDisplay = role ? role : "`Role not found`";
          const sticky = data.sticky ? "`\`Yes\``" : "`\`No\``";

          return `🌿・${base}\n> • **Role:** ${roleDisplay}\n> • **Permanent:** ${sticky}`;
        })
        .join('\n\n');

      return new EmbedBuilder()
        .setTitle(`**╭─── 🌿 ${message.guild.name} Level Roles 🌿 ───╮**`)
        .setDescription(`\n_current level roles for ${message.guild.name}_\n` + `${middle}\n` + content + `\n\n${bottommessage}\n\n${bottom}` || "*No level roles found.*")
        .setColor(0x207e37)
        .setThumbnail(message.guild.iconURL())
        .setFooter({
          text: `Page ${page + 1} of ${totalPages}`,
          iconURL: message.client.user.displayAvatarURL()
        })
    };

    // ------------------------------
    // BUTTONS (Same Style As Leaderboard)
    // ------------------------------
    const row = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),

        new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages - 1)
      );

    const msg = await message.reply({
      embeds: [generateEmbed(currentPage)],
      components: totalPages > 1 ? [row()] : []
    });

    if (totalPages <= 1) return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== message.author.id) {
        return btn.reply({
          content: "You're not allowed to use these buttons.",
          ephemeral: true
        });
      }

      if (btn.customId === 'previous' && currentPage > 0) currentPage--;
      if (btn.customId === 'next' && currentPage < totalPages - 1) currentPage++;

      if (btn.customId === 'stop') {
        collector.stop();
        return btn.update({ components: [] });
      }

      await btn.update({
        embeds: [generateEmbed(currentPage)],
        components: [row()]
      });
    });

    collector.on('end', () => {
      if (msg.editable) msg.edit({ components: [] });
    });

  }
};