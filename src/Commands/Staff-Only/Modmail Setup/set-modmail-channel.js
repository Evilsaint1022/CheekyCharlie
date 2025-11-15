const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-modmail-channel')
        .setDescription('Set the channel where the modmail will be sent.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to set for modmail messages.')
                .setRequired(true)
        ),
    async execute(interaction) {

        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const key = "CheekyCharlie_Owners";
        const Owners = await db.owners.get(key) || [];

        // Check if the user is an owner
        if (!Owners.includes(userId)) {
        return interaction.reply({ 
            content: 'You do not have permission to set the modmail channel!', flags: 64
        });
    }


        const channel = interaction.options.getChannel('channel');

        if (guildId === "1365657523088134234" || guildId === "1346955021614317619") {
            // Save the modmail channel ID to the database
            db.settings.set(`modmailChannelId`, channel.id);

            // Logging the action
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[⭐] [SET-MODMAIL] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName}_${guildId} ${interaction.user.tag} used the set-modmail-channel command to set the channel ID "${channel.id}"`);

            return interaction.reply({ content: `Modmail will now be sent in <#${channel.id}>.`, flags: 64 });
        }

        await interaction.reply({ content: "Sorry, your server doesn't support this feature yet." });
        return;
    },
};
