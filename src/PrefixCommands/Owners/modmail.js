const db = require("../../Handlers/database");

module.exports = {
name: "modmail",
aliases: [],
description: "Set the channel where the modmail will be sent.",

async execute(message, args) {

    // Prevent command usage in DMs
    if (message.channel.isDMBased()) {
        return message.reply({
            content: "This command cannot be used in DMs."
        });
    }

    const guildName = message.guild.name;
    const guildId = message.guild.id;
    const userId = message.author.id;

    const key = "CheekyCharlie_Owners";
    const Owners = await db.owners.get(key) || [];

    // Check if the user is an owner
    if (!Owners.includes(userId)) {
        return message.reply({
            content: "You do not have permission to set the modmail channel!"
        });
    }

    // Get the channel from the command arguments
    const channel = message.mentions.channels.first();

    if (!channel) {
        return message.reply({
            content: "Please specify a channel.\nExample: `?modmail #modmail`"
        });
    }

        // Save the modmail channel ID to the database
        db.settings.set(`modmailChannelId`, channel.id);

        // Logging the action
        console.log(
            `[⭐] [MODMAIL] [${new Date().toLocaleDateString("en-NZ", {
                timeZone: "Pacific/Auckland"
            })}] [${new Date().toLocaleTimeString("en-NZ", {
                timeZone: "Pacific/Auckland"
            })}] ${message.author.tag} used the modmail command to set the channel ID "${channel.id}"`
        );

        return message.reply({
            content: `📫 Modmail will now be sent in <#${channel.id}>.`
        });
    }
};
