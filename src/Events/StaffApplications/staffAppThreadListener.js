const { Events, ContainerBuilder, TextDisplayBuilder, MessageFlags, Message, Client } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = {
name: Events.MessageCreate,

/**
 * @param {Message} message
 * @param {Client} client
 */
async execute(message, client) {
    if (message.author.bot) return;

    if (!message.channel.isThread()) return;

    const threadId = message.channel.id;
    const guildId = message.guild.id;

    const applications = await db.staff_app_applications.get('applications') || [];
    const application = applications.find(app => app.threadId === threadId && app.guildId === guildId);

    if (!application) return;

    if (!(message.content.startsWith(">"))) return;

    try {

        message.content = message.content.replace(">", "")

        const applicant = await client.users.fetch(application.userId);

        const staffEmbed = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${message.content || "*No content*"}\n-# ${message.author.displayName}`)
        )

        await applicant.send({
            components: [staffEmbed],
            flags: [MessageFlags.IsComponentsV2]
        });

        await message.react('✅');

    } catch (error) {

        console.error('Error forwarding staff message to applicant:', error);

        await message.reply({
        content: '❌ Could not send message to applicant. They may have DMs disabled.',
        flags: 64
        });

    }
}};
