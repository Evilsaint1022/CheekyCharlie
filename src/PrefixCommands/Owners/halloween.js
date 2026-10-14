const db = require('../../Handlers/database');
const halloween = require('../../Utilities/Themes/Halloween/halloween');

module.exports = {
    name: "halloween",
    aliases: ["spooky"],
    description: "Toggle Halloween mode (on / off / auto / status). Auto enables it Oct 1st - Oct 31st.",

    async execute(message, args) {
        const owners = await db.owners.get('CheekyCharlie_Owners');

        if (!Array.isArray(owners)) {
            console.error('Owners is not an array:', owners);
            return message.reply('⚠️ Owner list is broken. Check the database.');
        }

        if (!owners.includes(message.author.id)) {
            return message.reply('🚫 You do not have permission to use this command!');
        }

        const choice = (args[0] || 'status').toLowerCase();

        if (halloween.MODES.includes(choice)) {
            await halloween.setMode(choice);
        } else if (choice !== 'status') {
            return message.reply('Usage: `halloween <on|off|auto|status>`');
        }

        const mode = await halloween.getMode();
        const active = await halloween.isActive();
        const prefix = (await db.settings.get(message.guild?.id))?.prefix || message.client.defaultPrefix;

        return message.reply(
            `🎃 Halloween mode is **${active ? 'ACTIVE' : 'inactive'}** (setting: \`${mode}\`).\n` +
            `Use \`${prefix}halloween <on|off|auto>\` to change it. \`auto\` runs Oct 1st - Oct 31st (NZ time).`
        );
    }
};
