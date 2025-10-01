const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('counting')
    .setDescription('Shows the current and next expected number for counting.'),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

    //console logs 
    console.log(`[🌿] [COUNTING] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${interaction.guild.name} ${interaction.guild.id} ${interaction.user.username} used the counting command.`);
        
    const guildKey = `${interaction.guild.name}_${interaction.guild.id}`;
    const guildname = interaction.guild.name;
    const ferns = "<:Ferns:1395219665638391818>"

    try {
      // Get the saved counting data
      const countingData = await db.counting.get(guildKey);

      if (!countingData) {
        return interaction.reply({
          content: '⚠️ No counting data found for this server yet.',
          flags: 64 // ephemeral
        });
      }

      // Build a nice embed
      const embed = new EmbedBuilder()
        .setTitle(`🌿 ${guildname} 🌿`)
        .addFields(
          { name: 'Current Number', value: `${countingData.current}`, inline: true },
          { name: 'Next Number', value: `${countingData.expected}`, inline: true }
        )
        .setFooter({ text: `Last counted by user ID: ${countingData.lastUserId}` })
        .setColor('White');

      await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ An error occurred while fetching the counting data.',
        flags: 64
      });
    }
  }
};
