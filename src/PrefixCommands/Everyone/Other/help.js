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
 * Splits an array of pages into a fixed number of items
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

    // ===================== COMMAND PAGES =====================

    const publicPages = chunkByItems(
      publicCommands,
      20
    );

    const whitelistedPages =
      hasPermission && whitelistedCommands.length > 0
        ? chunkByItems(whitelistedCommands, 20)
        : [];

    const applicationPages =
      hasPermission && applicationCommands.length > 0
        ? chunkByItems(applicationCommands, 20)
        : [];

    const ownerPages =
      ownerCommands.length > 0
        ? chunkByItems(ownerCommands, 20)
        : [];

    // ===================== CATEGORY DATA =====================

    const categories = {
      public: {
        name: 'Everyone Prefix Commands',
        emoji: '🌿',
        pages: publicPages,
        color: 0x207e37
      },

      whitelisted: {
        name: 'Whitelisted Prefix Commands',
        emoji: '🔒',
        pages: whitelistedPages,
        color: 0x207e37
      },

      application: {
        name: 'Whitelisted Application Commands',
        emoji: '🔧',
        pages: applicationPages,
        color: 0x207e37
      },

      owner: {
        name: 'Owner Commands',
        emoji: '👑',
        pages: ownerPages,
        color: 0x207e37
      }
    };

    // ===================== EMBED BUILDER =====================

    function createCategoryEmbed(categoryKey, page = 0) {

      const category = categories[categoryKey];

      const content = category.pages[page] || '';

      let pageText = '';

      if (category.pages.length > 1) {
        pageText =
          `🌿 ${category.name} Page: ${page + 1}/${category.pages.length} • `;
      } else {
        pageText =
          `🌿 ${category.name} • `;
      }

      return new EmbedBuilder()
        .setTitle(`🌿 **\`${category.name}\`** 🌿`)
        .setColor(category.color)
        .setThumbnail(
          message.client.user.displayAvatarURL()
        )
        .setDescription(
          `${middle}\n${content}${middle}`
        )
        .setFooter({
          text:
            `${pageText}` +
            `${message.author.tag}`
        });
    }

    // ===================== HELP MENU EMBED =====================

    const helpEmbed = new EmbedBuilder()
      .setTitle('🌿 **`CheekyCharlie Help Menu`** 🌿')
      .setColor(0x207e37)
      .setThumbnail(
        message.client.user.displayAvatarURL()
      )
      .setDescription(
        `**Welcome to the CheekyCharlie \`?help\` Menu!**\n\n` +
        `Use the buttons below to select the type of commands you want to view.\n\n` +
        `🌿 **\`Everyone Prefix Commands\`**\n` +
        `Commands available to everyone.\n\n` +
        `🔒 **\`Whitelisted Prefix Commands\`**\n` +
        `Prefix commands available to whitelisted members.\n\n` +
        `🔧 **\`Whitelisted Application Commands\`**\n` +
        `Application commands available to whitelisted members.\n\n` +
        `👑 **\`Owner Commands\`**\n` +
        `Commands available to CheekyCharlie owners.\n` +
        `${middle}`
      )
      .setFooter({
        text:
          `🌿 Select a command category • ` +
          `Requested by ${message.author.tag}`
      });

    // ===================== NO COMMANDS CHECK =====================

    if (
      publicPages.length === 0 &&
      whitelistedPages.length === 0 &&
      applicationPages.length === 0 &&
      ownerPages.length === 0
    ) {
      return message.reply(
        'There are currently no commands available.'
      );
    }

    // ===================== CATEGORY BUTTONS =====================

    const categoryRow = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId('help_public')
        .setLabel('Everyone Prefix')
        .setEmoji('🌿')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(publicPages.length === 0),

      new ButtonBuilder()
        .setCustomId('help_whitelisted')
        .setLabel('Whitelisted Prefix')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasPermission || whitelistedPages.length === 0),

      new ButtonBuilder()
        .setCustomId('help_application')
        .setLabel('Whitelisted Application')
        .setEmoji('🔧')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasPermission || applicationPages.length === 0),

      new ButtonBuilder()
        .setCustomId('help_owner')
        .setLabel('Owner')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(ownerPages.length === 0)

    );

    // ===================== SEND =====================

    const sentMessage = await message.reply({
      embeds: [helpEmbed],
      components: [categoryRow]
    });

    // ===================== COLLECTOR =====================

    const collector =
      sentMessage.createMessageComponentCollector({
        time: 60_000
      });


// ===================== TIMER RESET =====================

    function resetTimer() {
      collector.resetTimer({
        time: 60_000
      });
    }

    // ===================== STATE =====================

    let currentCategory = null;
    let page = 0;

    // ===================== COLLECT =====================

    collector.on('collect', async i => {

      // ===================== USER CHECK =====================

      if (i.user.id !== message.author.id) {

        return i.reply({
          content: "You can't use these buttons.",
          ephemeral: true
        });
      }
      

      // ===================== CATEGORY CHANGE =====================

      if (i.customId.startsWith('help_')) {

        // Resets the 60 second timer.
        resetTimer();

        const selectedCategory =
          i.customId.replace('help_', '');

        if (!categories[selectedCategory]) {
          return;
        }

        const category =
          categories[selectedCategory];

        // Security check
        if (
          selectedCategory === 'whitelisted' &&
          !hasPermission
        ) {
          return i.reply({
            content:
              "You don't have permission to view these commands.",
            ephemeral: true
          });
        }

        if (
          selectedCategory === 'application' &&
          !hasPermission
        ) {
          return i.reply({
            content:
              "You don't have permission to view these commands.",
            ephemeral: true
          });
        }

        if (
          selectedCategory === 'owner' &&
          ownerPages.length === 0
        ) {
          return i.reply({
            content:
              "You don't have permission to view these commands.",
            ephemeral: true
          });
        }

        if (category.pages.length === 0) {
          return i.reply({
            content:
              'There are currently no commands in this category.',
            ephemeral: true
          });
        }

        currentCategory = selectedCategory;
        page = 0;

        // ===================== NAVIGATION BUTTONS =====================

        const navigationRow =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId('menu')
              .setLabel('Menu')
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId('stop')
              .setLabel('Stop')
              .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(
                category.pages.length === 1
              )

          );

        return i.update({
          embeds: [
            createCategoryEmbed(
              currentCategory,
              page
            )
          ],
          components: [
            navigationRow
          ]
        });

      }

      // ===================== MENU =====================

      if (i.customId === 'menu') {

        // Refresh the 60 seconds timer.
        resetTimer();

        currentCategory = null;
        page = 0;

        return i.update({
          embeds: [helpEmbed],
          components: [categoryRow]
        });
      }

      // ===================== STOP =====================

      if (i.customId === 'stop') {

        collector.stop('stopped');

        const disabledRows = [];

        // Disable category buttons
        disabledRows.push(
          new ActionRowBuilder().addComponents(
            categoryRow.components.map(btn =>
              ButtonBuilder
                .from(btn)
                .setDisabled(true)
            )
          )
        );

        // Disable navigation buttons
        if (currentCategory) {

          const category =
            categories[currentCategory];

          disabledRows.push(
            new ActionRowBuilder().addComponents(

              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),

              new ButtonBuilder()
                .setCustomId('menu')
                .setLabel('Menu')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),

              new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),

              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)

            )
          );

        }

        return i.update({
          components: []
        });

      }

      // ===================== PAGE CHANGE =====================

      if (
        currentCategory &&
        (i.customId === 'prev' ||
          i.customId === 'next')
      ) {

        const category =
          categories[currentCategory];

        if (i.customId === 'prev') {
          page--;
        }

        if (i.customId === 'next') {
          page++;
        }

        // ===================== SAFETY =====================

        if (page < 0) {
          page = 0;
        }

        if (page > category.pages.length - 1) {
          page = category.pages.length - 1;
        }

        // ===================== NAVIGATION BUTTONS =====================

        const navigationRow =
          new ActionRowBuilder().addComponents(

            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),

            new ButtonBuilder()
              .setCustomId('menu')
              .setLabel('Menu')
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId('stop')
              .setLabel('Stop')
              .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(
                page === category.pages.length - 1
              )

          );

        // ===================== UPDATE =====================

        return i.update({
          embeds: [
            createCategoryEmbed(
              currentCategory,
              page
            )
          ],
          components: [
            navigationRow
          ]
        });
      }

    });

    // ===================== COLLECTOR END =====================

    collector.on('end', async () => {

      try {

        const disabledRows = [];

        // Disable category buttons
        disabledRows.push(
          new ActionRowBuilder().addComponents(
            categoryRow.components.map(btn =>
              ButtonBuilder
                .from(btn)
                .setDisabled(true)
            )
          )
        );

        // Disable navigation buttons if a category is open
        if (currentCategory) {

          disabledRows.push(
            new ActionRowBuilder().addComponents(

              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),

              new ButtonBuilder()
                .setCustomId('menu')
                .setLabel('Menu')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),

              new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('Stop')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),

              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)

            )
          );

        }

        await sentMessage.edit({
          components: []
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