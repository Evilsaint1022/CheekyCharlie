const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  EmbedBuilder
} = require('discord.js');

const db = require('../../Handlers/database');

module.exports = {
  name: 'leaveguild',
  description: 'Force the bot to leave a server (Owner only)',

  async execute(message, args, client) {

    const userId = message.author.id;

    // 🔐 Fetch owners from DB
    const owners = await db.owners.get('CheekyCharlie_Owners');

    if (!Array.isArray(owners)) {
      console.error('Owners list broken:', owners);
      return message.reply('⚠️ Owner list is misconfigured.');
    }

    if (!owners.includes(userId)) {
      return message.reply('🚫 You do not have permission to use this command.');
    }

    // -----------------------------
    // GET GUILDS
    // -----------------------------
    const guilds = client.guilds.cache
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(guild => ({
        label: `🌿・${guild.name}`.slice(0, 100),
        description: `〉ID: ${guild.id}`.slice(0, 100),
        value: guild.id
      }));

    if (!guilds.length) {
      return message.reply('❌ I am not in any servers.');
    }

    // Discord only allows 25 options per select menu
    const first25 = guilds.slice(0, 25);

    // -----------------------------
    // EMBED
    // -----------------------------
    const embed = new EmbedBuilder()
      .setTitle('**🌿 __Leave Guild__ 🌿**')
      .setDescription('〉Select a server for the \`CheekyCharlie\` to leave.')
      .setColor(0x207e37);

    // -----------------------------
    // SELECT MENU
    // -----------------------------
    const menu = new StringSelectMenuBuilder()
      .setCustomId('leaveguild_select')
      .setPlaceholder('Choose a server...')
      .addOptions(first25);

    const row = new ActionRowBuilder().addComponents(menu);

    const msg = await message.reply({
      embeds: [embed],
      components: [row]
    });

    // -----------------------------
    // COLLECTOR
    // -----------------------------
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000
    });

    collector.on('collect', async interaction => {

      // Only command author can use it
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: '🚫 You cannot use this menu.',
          flags: 64
        });
      }

      const guildId = interaction.values[0];
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        return interaction.reply({
          content: '❌ Guild no longer found.',
          flags: 64
        });
      }

      try {

        const guildName = guild.name;

        await guild.leave();

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setTitle('👋 Left Guild')
              .setDescription(
                `Successfully left **${guildName}**\n\`${guildId}\``
              )
              .setColor('Green')
          ],
          components: []
        });

      } catch (err) {

        console.error(err);

        await interaction.reply({
          content: '⚠️ Failed to leave the server.',
          flags: 64
        });

      }

    });

    // -----------------------------
    // TIMEOUT
    // -----------------------------
    collector.on('end', async () => {

      if (!msg.editable) return;

      await msg.edit({
        components: []
      }).catch(() => {});

    });

  }
};