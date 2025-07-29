const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('../../Handlers/database'); // Import the database module

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view-one-word-story')
    .setDescription('View the current one-word story.'),

  async execute(interaction) {

    // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

    const guild = interaction.guild;

    const guildKey = `${guild.name}_${guild.id}`;

    const currentStory = await db.onewordstory.get(guildKey + ".story") || [];

    function joinStory(words) {
      let story = "";
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if ([",", ".", "?", "!", ";", ":", "(", ")", "[", "]", "{", "}", "\"", "'", "..."].includes(word)) {
          story += word;
        } else {
          if (story.length > 0) story += " ";
            story += word;
        }
      }
      return story;
    }

    if ( currentStory.length === 0 ) {
      return interaction.reply({
        content: "The one-word story is currently empty.",
        flags: 64
      });
    }

    const storyText = joinStory(currentStory);

    return interaction.reply({
      content: `**Current One-Word Story:**\n\n${storyText}`,
      flags: 64
    });

  }
};
