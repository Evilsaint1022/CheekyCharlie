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

        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;
        const space = 'ㅤ';

        try {
            // Get the saved counting data
            const countingData = await db.counting.get(guildKey);

            if (!countingData) {
                return message.reply(`⚠️ No Counting data found for ${guildName}.`);
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

            const CountingLives = await db.lives.get(`${guildKey}.lives`);
          

            // Build embed
            const embed = new EmbedBuilder()
                .setTitle(`🌿 **__${guildName} Counting!__** 🌿`)
                .setDescription(
                    `_This is the current counting info for ${guildName}._\n` +
                    `${middle}\n` +
                    `⭐**__Highest Record__**\n` +
                    `- ㅤㅤㅤㅤ ㅤㅤㅤ ㅤㅤㅤ\`${countingData.record}\`\n` +
                    `🌿**__Current Number__**\n` +
                    `- ㅤㅤㅤ ㅤㅤㅤ ㅤㅤㅤ\`${countingData.current}\`\n` +
                    `🌿**__Next Number__**\n` +
                    `- ㅤㅤㅤ ㅤㅤㅤ ㅤㅤㅤ\`${countingData.expected}\`\n\n` +
                    `❤️ **__Lives:__** \`${CountingLives}\`\n` +
                    `${middle}\n`
                )
                .setThumbnail(message.guild.iconURL())
                .setFooter({ text: `Last Counter: ${lastUser}` })
                .setColor(0x207e37);

            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            await message.reply('❌ An error occurred while fetching the counting data.');
        }
    }
};
