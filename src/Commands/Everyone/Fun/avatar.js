const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Displays the avatar of a specified user or your own.")
        .addUserOption(option => 
            option.setName('user')
                .setDescription("The user whose avatar you want to see")
                .setRequired(false)
        ),

    async execute(interaction) {

        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

        // Get the specified user, or default to the interaction user if none is specified
        const user = interaction.options.getUser('user') || interaction.user;
        const timestamp = new Date().toLocaleTimeString();
        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;

        // Fetch avatar URL with high resolution
        const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });

        // Create an embed to display the avatar
        const avatarEmbed = new EmbedBuilder()
            .setTitle(`${user.username}'s Avatar`)
            .setImage(avatarUrl)
            .setColor(0xFF0000)
            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // Reply with the embed
        await interaction.reply({ embeds: [avatarEmbed] });

        // Console Logs
        console.log(`[🌿] [AVATAR] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} used the avatar command for ${user.username}'s avatar.`);
    }
};
