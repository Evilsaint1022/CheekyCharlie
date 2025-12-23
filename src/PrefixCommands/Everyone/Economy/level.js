// level.js (PREFIX COMMAND)
const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: "level",
    aliases: ["lvl"],
    description: "Check your current level or another user's level.",

    async execute(message, args) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply("This command cannot be used in DMs.");
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
                .setTitle(`**${targetUser.username}'s Level**`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Level', value: `${level.toLocaleString()}`, inline: true },
                    {
                        name: 'XP',
                        value: `${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()}`,
                        inline: true
                    }
                )
                .setFooter({ text: 'Keep earning XP to level up!' });

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error accessing level data:', error);
            return message.reply(
                'There was an error accessing level data. Please try again later.'
            );
        }
    },
};
