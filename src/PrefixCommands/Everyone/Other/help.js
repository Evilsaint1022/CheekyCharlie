// Prefix Command
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const db = require('../../../Handlers/database');

/**
 * Splits an array into pages of a fixed size
 */
function chunkByItems(array, itemsPerPage = 15) {
  const pages = [];

  for (let i = 0; i < array.length; i += itemsPerPage) {
    pages.push(array.slice(i, i + itemsPerPage).join(''));
  }

  return pages;
}

module.exports = {
  name: 'help',
  aliases: ['commands'],
  description: 'Shows all available commands',

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {

    // ===================== DM CHECK =====================

    if (message.channel.type === ChannelType.DM) {
      return message.reply('This command cannot be used in DMs.');
    }

    const guildName = message.guild.name;
    const guildId = message.guild.id;
    const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;

    // ===================== PERMISSIONS =====================

    const WHITELISTED_ROLE_IDS =
      (await db.whitelisted.get(`${guildId}.whitelistedRoles`)) || [];

    const memberRoles = message.member.roles.cache.map(r => r.id);

    const hasPermission = WHITELISTED_ROLE_IDS.some(id =>
      memberRoles.includes(id)
    );

    // ===================== LOG =====================

    console.log(
      `[🌿] [HELP] [${new Date().toLocaleDateString('en-GB')}] ` +
      `[${new Date().toLocaleTimeString("en-NZ", {
        timeZone: "Pacific/Auckland"
      })}] ` +
      `${guildName} ${guildId} ${message.author.username} used the help command.`
    );

    // ===================== COMMAND DATA =====================

    const commandsData = await db.commands.get('prefix_commands');
    const application = await db.commands.get('application_commands');

    if (!commandsData) {
      return message.reply('No prefix command data could be found.');
    }

    if (!application) {
      console.warn('[HELP] No application command data could be found.');
    }

    // ===================== FORMAT CATEGORY =====================

    /**
     * Converts:
     * economy_games
     *
     * into:
     * Economy Games
     */
    function formatCategoryName(name) {
      return name
        .split('_')
        .map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
    }

    // ===================== FORMAT COMMAND =====================

    /**
     * Converts a command object into help-menu lines.
     */
    function formatCommand(command) {

      const lines = [];

      let line =
        `***\`${command.command}\`***・_${command.description}_\n`;

      lines.push(line);

      // Usage
      if (command.usage) {
      // lines.push(``);
      }

      // Aliases
      if (command.aliases?.length) {
        // lines.push(``);
      }

      return lines;
    }

    // ===================== FORMAT CATEGORY =====================

    function formatCommandCategory(categoryName, commands) {

      const lines = [
        ``
      ];

      for (const command of commands) {
        lines.push(
          ...formatCommand(command)
        );
      }

      // lines.push('');

      return lines;
    }

// ===================== PUBLIC PREFIX COMMANDS =====================

const publicCommands = [];

if (commandsData.everyone) {

  for (const [categoryName, commands] of Object.entries(
    commandsData.everyone
  )) {

    publicCommands.push(
      ...formatCommandCategory(
        categoryName,
        commands
      )
    );

  }

}


// ===================== WHITELISTED PREFIX COMMANDS =====================

const whitelistedCommands = [];

if (
  hasPermission &&
  commandsData.whitelisted
) {

  for (const [categoryName, commands] of Object.entries(
    commandsData.whitelisted
  )) {

    whitelistedCommands.push(
      ...formatCommandCategory(
        categoryName,
        commands
      )
    );

  }

}


// ===================== WHITELISTED APPLICATION COMMANDS =====================

const applicationCommands = [];

if (
  hasPermission &&
  application?.whitelisted
) {

  for (const [categoryName, commands] of Object.entries(
    application.whitelisted
  )) {

    applicationCommands.push(
      ...formatCommandCategory(
        categoryName,
        commands
      )
    );

  }

}

    // ===================== OWNER PREFIX COMMANDS =====================

    // Replace this with your Discord user ID
    const owners = await db.owners.get('CheekyCharlie_Owners');

        if (!Array.isArray(owners)) {
      console.error('Owners list broken:', owners);
      return message.reply('⚠️ Owner list is misconfigured.');
    }

    const ownerCommands = [];

    if (owners.includes(message.author.id)) {

      ownerCommands.push(
        ...formatCommandCategory(
          'Owner',
          commandsData.owner
        )
      );

    }

    // ===================== EMBEDS =====================

    const embeds = [];

    // ===================== PUBLIC PAGES =====================

    const publicPages = chunkByItems(
      publicCommands,
      20
    );

    publicPages.forEach((content, index) => {

      embeds.push(
        new EmbedBuilder()
          .setTitle('🌿 **\`CheekyCharlie Help Menu\`** 🌿')
          .setColor(0x207e37)
          .setThumbnail(
            message.client.user.displayAvatarURL()
          )
          .setDescription(
            `**Welcome to the Cheekycharlie \`?help\` Menu!**\n` +
            `${middle}\n${content}${middle}`
          )
          .setFooter({
            text:
              `🌿 Prefix Commands Page: ${index + 1}/${publicPages.length} • ` +
              `Requested by ${message.author.tag}`
          })
      );

    });

    // ===================== WHITELISTED PREFIX PAGES =====================

    if (
      hasPermission &&
      whitelistedCommands.length > 0
    ) {

      const staffPages = chunkByItems(
        whitelistedCommands,
        20
      );

      staffPages.forEach((content, index) => {

        embeds.push(
          new EmbedBuilder()
            .setTitle('🌿 **\`Whitelisted Prefix Commands\`** 🌿')
            .setColor(0x207e37)
            .setThumbnail(
              message.client.user.displayAvatarURL())
            .setDescription(`${middle}\n${content}${middle}`)
            .setFooter({
              text:
                `🌿 Whitelisted Prefix Page: ${index + 1}/${staffPages.length} • ` +
                `${message.author.tag}`
            })
        );

      });

    }

    // ===================== WHITELISTED APPLICATION PAGES =====================

        if (
      hasPermission &&
      applicationCommands.length > 0
    ) {

      const staffPages = chunkByItems(
        applicationCommands,
        20
      );

      staffPages.forEach((content, index) => {

        embeds.push(
          new EmbedBuilder()
            .setTitle('🌿 **\`Whitelisted Application Commands\`** 🌿')
            .setColor(0x207e37)
            .setThumbnail(
              message.client.user.displayAvatarURL()
            )
            .setDescription(`${middle}\n${content}${middle}`)
            .setFooter({
              text:
                `🌿 Whitelisted Application Page: ${index + 1}/${staffPages.length} • ` +
                `${message.author.tag}`
            })
        );

      });

    }

    // ===================== OWNER PAGES =====================

    if (ownerCommands.length > 0) {

      const ownerPages = chunkByItems(
        ownerCommands,
        20
      );

      ownerPages.forEach((content, index) => {

        embeds.push(
          new EmbedBuilder()
            .setTitle('🌿 **\`Owner Prefix Commands\`** 🌿')
            .setColor(0x207e37)
            .setThumbnail(
              message.client.user.displayAvatarURL()
            )
            .setDescription(`${middle}\n${content}${middle}`)
            .setFooter({
              text:
                `🌿 Owners Page: ${index + 1}/${ownerPages.length} • ` +
                `${message.author.tag}`
            })
        );

      });

    }

    // ===================== NO COMMANDS CHECK =====================

    if (embeds.length === 0) {
      return message.reply(
        'There are currently no commands available.'
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
        .setDisabled(
          embeds.length === 1
        )

    );

    // ===================== SEND =====================

    const sentMessage = await message.reply({
      embeds: [embeds[page]],
      components: [row]
    });

    // ===================== COLLECTOR =====================

    const collector =
      sentMessage.createMessageComponentCollector({
        time: 60_000
      });

    collector.on('collect', async i => {

      // ===================== USER CHECK =====================

      if (i.user.id !== message.author.id) {

        return i.reply({
          content: "You can't use these buttons.",
          ephemeral: true
        });

      }

      // ===================== STOP =====================

      if (i.customId === 'stop') {

        collector.stop('stopped');

        return i.update({
          components: [
            new ActionRowBuilder().addComponents(
              row.components.map(btn =>
                ButtonBuilder
                  .from(btn)
                  .setDisabled(true)
              )
            )
          ]
        });

      }

      // ===================== PAGE CHANGE =====================

      if (i.customId === 'prev') {
        page--;
      }

      if (i.customId === 'next') {
        page++;
      }

      // Safety
      if (page < 0) {
        page = 0;
      }

      if (page > embeds.length - 1) {
        page = embeds.length - 1;
      }

      // ===================== BUTTON STATE =====================

      row.components[0].setDisabled(
        page === 0
      );

      row.components[2].setDisabled(
        page === embeds.length - 1
      );

      // ===================== UPDATE =====================

      await i.update({
        embeds: [embeds[page]],
        components: [row]
      });

    });

    // ===================== COLLECTOR END =====================

    collector.on('end', async () => {

      row.components.forEach(button =>
        button.setDisabled(true)
      );

      try {

        await sentMessage.edit({
          components: [row]
        });

      } catch (error) {

        // Message may have been deleted
        if (error.code !== 10008) {
          console.error(
            '[HELP] Failed to disable buttons:',
            error
          );
        }

      }

    });

  }
};

