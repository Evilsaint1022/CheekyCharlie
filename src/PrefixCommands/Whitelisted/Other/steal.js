const { PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'steal',
    description: 'Steal an emoji and add it to this server',
    async execute(message, args, client) {

        // Prevent command usage in DMs
        if (!message.guild) {
            return message.reply("This command cannot be used in DMs.");
        }

        const guildId = message.guild.id;
        const guildName = message.guild.name;

        // Check whitelisted roles
        const WHITELISTED_ROLE_IDS =
            await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = message.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId =>
            memberRoles.includes(roleId)
        );

        if (!hasPermission) {
            return message.reply(
                'You do not have the required whitelisted role to use this command.'
            );
        }

        // Check Discord permission
        if (!message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            return message.reply("❌ You need **Manage Emojis and Stickers** permission.");
        }

        // Arguments
        const emojiInput = args[0];
        const customName = args[1]; // optional

        if (!emojiInput) {
            return message.reply("❌ You need to provide an emoji to steal.");
        }

        // Match custom emoji format <:name:id> or <a:name:id>
        const emojiRegex = /<(a?):(\w+):(\d+)>/;
        const match = emojiInput.match(emojiRegex);

        if (!match) {
            return message.reply("❌ That doesn't look like a custom emoji.");
        }

        const animated = match[1] === "a";
        const emojiName = match[2];
        const emojiId = match[3];

        // Use provided name OR original emoji name
        const finalName = customName ?? emojiName;

        // Emoji image URL
        const emojiURL = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}`;

        try {
            const emoji = await message.guild.emojis.create({
                attachment: emojiURL,
                name: finalName
            });

            await message.reply(`✅ Emoji added! ${emoji} **:${emoji.name}:**`);

            console.log(
                `[⭐] [STEAL] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
                `${guildName} ${guildId} ${message.author.tag} used the steal command ` +
                `to steal ${emojiName} ${emojiId}`
            );

        } catch (error) {
            console.error(error);
            message.reply(
                "❌ Failed to add emoji. Make sure I have permission and the server has space."
            );
        }
    },
};
