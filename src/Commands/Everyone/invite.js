const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Invite your friends!'),
    async execute(interaction) {
        const { channel, user, guild } = interaction;

        try {
            // Create a temporary invite link for 1 hour (maxAge = 3600 seconds)
            const invite = await guild.invites.create(channel.id, {
                maxAge: 3600, // Expiration time in seconds (1 hour)
                maxUses: 0,   // Optional: Max number of uses, you can change this if needed
                unique: true, // Ensures the invite is unique
            });

            // Reply with the generated invite link
            await interaction.reply({ content: `Here is your temporary invite link: ${invite.url}` });

            // Console Log
            console.log(`[${new Date().toLocaleTimeString()}] ${guild.name} ${guild.id} ${user.username} used the invite command.`);

        } catch (error) {
            console.error('Error creating invite link:', error);
            await interaction.reply({ content: 'An error occurred while creating the invite link. Please try again later.' });
        }
    },
};
