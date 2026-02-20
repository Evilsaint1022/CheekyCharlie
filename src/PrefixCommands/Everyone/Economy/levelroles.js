const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path

module.exports = {
    name: "levelroles",
    aliases: ["lr"],
    description: "Displays all level roles for this guild",
    async execute(message, args) {
        const guildId = message.guild.id;
        const guildKey = `${guildId}`;

        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;

        try {
            // READ DB the same way as set-level-role
            const levelRoles = await db.levelroles.get(guildKey);

            if (!levelRoles || Object.keys(levelRoles).length === 0) {
                return message.channel.send("❌ No level roles have been set for this server.");
            }

            // Sort levels numerically
            const sortedLevels = Object.keys(levelRoles).sort((a, b) => Number(a) - Number(b));

            // Build embed description
            let description = "";
            for (const level of sortedLevels) {
                const data = levelRoles[level];
                const role = message.guild.roles.cache.get(data.roleId);
                description += `🌿**・Level ${level}** \`->\` ${role ? role : `Role not found`} ㅤ ㅤㅤ ㅤㅤ ㅤㅤ ㅤㅤ**Sticky:** ${data.sticky ? `\`YES\`` : `\`NO\``}\n`;
            }

            console.log(`[🌿] [LEVEL ROLES] [${new Date().toLocaleDateString('en-GB')}] ` + `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` + `${message.guild.name} ${message.guild.id} ` + `${message.author.username} used the levelroles command.`);

            const embed = new EmbedBuilder()
                .setTitle(`**🌿 __${message.guild.name} Level Roles!__ 🌿**\n\n**__Current Level Roles:__**`)
                .setDescription(`${middle}\n` + `${description}` + middle)
                .setThumbnail(message.guild.iconURL())
                .setColor(0x207e37)
                .setFooter({ text: `🌿 Level Roles For ${message.guild.name} 🌿` });

            message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error("Error fetching level roles:", error);
            message.channel.send("❌ An error occurred while fetching level roles.");
        }
    }
};