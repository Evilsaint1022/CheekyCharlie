const { MessageFlags } = require('discord.js');

module.exports = {
    customId: 'example_button',

    async execute(interaction) {
        // Example: Respond to the button click
        await interaction.reply({
            content: `Hello ${interaction.user.username}! You clicked the example button! 🎉`,
            flags: MessageFlags.Ephemeral
        });
    }
};

