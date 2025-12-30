// level.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: "level",
    aliases: ["lvl"],
    description: "Check your current level or another user's level.",

    async execute(message, args) {

        if (message.channel.isDMBased()) {
      return message.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

        const guild = message.guild;
        const author = message.author;

        // Resolve target user:
        // !level           -> self
        // !level @user     -> mentioned user
        // !level userID    -> ID lookup
        const targetUser =
            message.mentions.users.first() ||
            (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
            author;

        const guildKey = `${guild.id}`;
        const userKey = `${targetUser.id}`;

        const top = `**──── 🌿${targetUser.username}'s Level ────**`;
        const middle = `· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`;
        const bottom = `**───────────────────────────────**`;

        console.log(
            `[🌿] [LEVEL] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guild.name} ${guild.id} ${author.username} used the level command to get ${targetUser.username}'s level.`
        );

        try {
            const levelsData = await db.levels.get(guildKey);

            if (!levelsData || !levelsData[userKey]) {
                return message.reply(
                    `${targetUser.username} hasn't gained any XP yet. ` +
                    `They need to participate to earn XP!`
                );
            }

            const { xp, level } = levelsData[userKey];
            const nextLevelXp = level * 350 + 350;

            const embed = new EmbedBuilder()
                .setColor('#de4949')
                .setTitle(top)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `_You are viewing ${targetUser.username}'s level._\n` +
                `ㅤㅤㅤ${middle}\n` +
                `ㅤㅤㅤ• **Level:** ${level.toLocaleString()}\n` +
                `ㅤㅤㅤ• **XP:** ${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()}\n` +
                `ㅤㅤㅤ${middle}\n`
            )
            .setFooter({ text: '🌿Keep up the good work!' })
            .setTimestamp()

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error accessing level data:', error);
            return message.reply(
                'There was an error accessing level data. Please try again later.'
            );
        }
    },
};
