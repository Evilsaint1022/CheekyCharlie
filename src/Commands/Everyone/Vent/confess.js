// ai-search.js
const { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confess')
        .setDescription('Confess something to the vent channel.')
        .addStringOption(option =>
        option
            .setName('confession')
            .setDescription('What do you want to confess?')
            .setRequired(true)
        ),
    
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {

        const confession = interaction.options.getString('confession');

        const ventChannelId = await db.settings.get(`${interaction.guild.name}_${interaction.guild.id}.ventChannelId`);
        const ventChannel = await interaction.guild.channels.fetch(ventChannelId).catch(async (e) => {
            if ( !interaction.replied ) {
                await interaction.reply({
                    content: "❌ **There is currently no vent channel set!**",
                    flags: 64
                });
                return;
            }
            return;
        })

        if ( !ventChannelId || !ventChannel ) {
            if ( !interaction.replied ) {
                await interaction.reply({
                    content: "❌ **There is currently no vent channel set!**",
                    flags: 64
                });
                return;
            }
            return;
        }

        const confessionContainer = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
            .setContent("**New confession!**"),
            new TextDisplayBuilder()
            .setContent(confession)
        )

        const confesstionMessage = await ventChannel.send({ components: [confessionContainer], flags: [MessageFlags.IsComponentsV2] })

        await interaction.reply({ content: "✅ **Cofession sent! Check out:** " + confesstionMessage.url, flags: 64 })

        return;

    },
}
