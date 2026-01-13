const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  name: 'characters',
  aliases: ['characters', 'simpsons'],
  description: 'View all Simpsons characters',

  async execute(message, args) {
    try {
      const res = await fetch('https://thesimpsonsapi.com/api/characters');
      const data = await res.json();
      const characters = data.results;

      if (!Array.isArray(characters) || !characters.length) {
        return message.reply('No characters found.');
      }
      const perpage = 2;
      const ITEMS_PER_PAGE = Math.ceil(characters.length / perpage);
      const pages = [];

      for (let i = 0; i < characters.length; i += ITEMS_PER_PAGE) {
        pages.push(characters.slice(i, i + ITEMS_PER_PAGE));
      }

      let page = 0;

      const buildEmbed = (pageIndex) => {
        const embed = new EmbedBuilder()
          .setTitle('💛 **__The Simpsons Characters__**')
          .setDescription('All characters from The Simpsons.\n\n**Click on the image to view the character.**\nyou can talk as the characters by typing `:CharacterName: Message`')
          .setColor(0xF9E547)
          .setFooter({
            text: `Page ${pageIndex + 1} / ${pages.length}`
          });

        pages[pageIndex].forEach((char) => {
          embed.addFields({
            name: char.name,
            value: `[View Image](https://cdn.thesimpsonsapi.com/500/character/${char.id}.webp)`,
            inline: false
          });
        });

        return embed;
      };

      const guildName = message.guild.name;
      const guildId = message.guild.id;

      console.log(`[🌿] [CHARACTERS] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${message.author.username} used the ?characters command.`);

      const row = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('⬅ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),

          new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('🛑 Stop')
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next ➡')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === pages.length - 1),
        );

      const msg = await message.channel.send({
        embeds: [buildEmbed(page)],
        components: [row()]
      });

      const collector = msg.createMessageComponentCollector({
        time: 60_000
      });

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: '❌ This menu is not for you.',
            ephemeral: true
          });
        }

        if (interaction.customId === 'prev') page--;
        if (interaction.customId === 'next') page++;

        if (interaction.customId === 'stop') {
          collector.stop();
          return interaction.update({
            components: []
          });
        }

        await interaction.update({
          embeds: [buildEmbed(page)],
          components: [row()]
        });
      });

      collector.on('end', async () => {
        if (!msg.editable) return;
        await msg.edit({ components: [] });
      });

    } catch (err) {
      console.error('Simpsons Characters Error:', err);
      message.reply('Something went wrong fetching characters.');
    }
  }
};
