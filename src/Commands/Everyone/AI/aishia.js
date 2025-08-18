// /Commands/AI/aishia.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aishia')
    .setDescription('Talk to AISHIA, your AI companion.')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('What do you want to say to AISHIA?')
        .setRequired(true)
    ),

  async execute(interaction) {

const prompt = interaction.options.getString('prompt');
await interaction.deferReply();

try {
  
  const response = await fetch('https://aishia.onrender.com/api/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AISHIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
  name: "Karbs", // Will be handled as your discord username so AISHIA can refer to you by your name
  messages: [
    { role: 'user', content: prompt }
  ]
    })
  });

  const data = await response.json();

  const aiMessage = data.response;

  // This is the time in seconds AISHIA needs to respond, you can use this, but dont need to
  const aiDuration = data.duration;

  const embed = new EmbedBuilder()
    .setColor('Purple')
    .setTitle('💜 AISHIA Responds')
    .addFields(
      { name: 'You said', value: prompt },
      { name: 'AISHIA said', value: aiMessage }
    )
    .setFooter({ text: 'Powered by AI API' });

  await interaction.editReply({ embeds: [embed] });

} catch (err) {
  console.error(err);
  await interaction.editReply('❌ AISHIA had trouble responding. Try again later.');
}
}
};
