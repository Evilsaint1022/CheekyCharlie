// ai-search.js
const { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('venting')
        .setDescription('Vent something to the vent channel.')
        .addStringOption(option =>
        option
            .setName('message')
            .setDescription('What do you want to vent?')
            .setRequired(true)
        ),
    
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {

        const confession = interaction.options.getString('message');

        const ventChannelId = await db.settings.get(`${interaction.guild.id}.ventChannelId`);
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
            .setContent("**🫰🏻 __New Anonymous Vent!__**"),
            new TextDisplayBuilder()
            .setContent(confession)
        )

        const confesstionMessage = await ventChannel.send({ components: [confessionContainer], flags: [MessageFlags.IsComponentsV2] })

        await interaction.reply({ content: "✅ **Vent Message successfully sent! Check out:** " + confesstionMessage.url, flags: 64 })

        return;

    },
}
