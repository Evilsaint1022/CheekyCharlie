// counting.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path if needed

module.exports = {
    name: "counting",
    description: "Shows the current, next expected and record number for counting.",

    async execute(message, args) {

        if (message.channel.isDMBased()) {
            return message.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        // Console log
        console.log(
            `[🌿] [COUNTING] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${message.guild.name} ${message.guild.id} ${message.author.username} used the counting command.`
        );

        const guildKey = `${message.guild.id}`;
        const guildName = message.guild.name;

        try {
            // Get the saved counting data
            const countingData = await db.counting.get(guildKey);

            if (!countingData) {
                return message.reply('⚠️ No counting data found for this server yet.');
            }

            let lastUser = 'Unknown User';

            if (countingData.lastUserId) {
                try {
                    const user = await message.client.users.fetch(countingData.lastUserId);
                    lastUser = user.username; // or user.tag if you want username#1234
                } catch (err) {
                    console.error('Failed to fetch user:', err);
                }
            }

            // Build embed
            const embed = new EmbedBuilder()
                .setTitle(`🌿 ${guildName} 🌿`)
                .addFields(
                    { name: 'Current Number', value: `${countingData.current}`, inline: true },
                    { name: 'Next Number', value: `${countingData.expected}`, inline: true },
                    { name: 'Record', value: `${countingData.record}`, inline: true },
                )
                .setFooter({ text: `Last counted by ${lastUser}` })
                .setColor(0x207e37);

            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            await message.reply('❌ An error occurred while fetching the counting data.');
        }
    }
};
