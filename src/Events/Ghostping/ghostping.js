const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const db = require('../../Handlers/database');

module.exports = {
    name: Events.MessageDelete,

    /**
     * @param {import('discord.js').Message} message
     */
    async execute(message) {

        // Ignore DMs / bots
        if (!message.guild || message.author?.bot) return;

        // Ignore if no mentions
        if (message.mentions.users.size === 0) return;

        // Ignore bot mentions
        if (message.mentions.users.some(user => user.bot)) return;

        // Ignore self ping
        if (message.mentions.users.has(message.author.id)) return;

        const settings = await db.settings.get(message.guild.id);

        if (!settings?.ghostping) return;

        // ------------------------------------------------------
        // Check audit logs to see WHO deleted the message
        // ------------------------------------------------------

        try {

            // Check if bot can view audit logs
            if (
                !message.guild.members.me.permissions.has(
                    PermissionFlagsBits.ViewAuditLog
                )
            ) return;

            const fetchedLogs = await message.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageDelete
            });

            const deletionLog = fetchedLogs.entries.first();

            // If a mod/staff deleted it recently
            if (deletionLog) {

                const { executor, target, createdTimestamp } = deletionLog;

                // Ignore bot deletions
                if (executor?.bot) return;

                const isRecent =
                    Date.now() - createdTimestamp < 5000;

                const isSameUser =
                    target?.id === message.author.id;

                // Someone else deleted the message
                if (
                    isRecent &&
                    isSameUser &&
                    executor?.id !== message.author.id
                ) {

                    // Fetch the executor member
                    const executorMember = await message.guild.members
                        .fetch(executor.id)
                        .catch(() => null);

                    if (!executorMember) return;

                    const guildId = message.guild.id;

                    const WHITELISTED_ROLE_IDS =
                        await db.whitelisted.get(
                            `${guildId}.whitelistedRoles`
                        ) || [];

                    const memberRoles =
                        executorMember.roles.cache.map(role => role.id);

                    const hasPermission =
                        WHITELISTED_ROLE_IDS.some(roleId =>
                            memberRoles.includes(roleId)
                        );

                    // Ignore deletion if executor has whitelisted role
                    if (hasPermission) return;
                }
            }

        } catch (err) {
            console.error('Audit log check failed:', err);
        }

        // ------------------------------------------------------
        // Ghost ping detected
        // ------------------------------------------------------

        const pingedUsers = message.mentions.users
            .map(u => `<@${u.id}>`)
            .join(', ');

        const usernames = message.mentions.users
            .map(u => u.username)
            .join(', ');

        console.log(
            `[👻] [GHOST PING] ${message.guild.name} ${message.guild.id} - ${message.author.username} pinged ${usernames}`
        );

        message.channel.send({
            content:
                `# 👻 **__Ghost Ping Alert!__**\n` +
                `**${message.author} pinged ${pingedUsers} and deleted the message.**`
        });
    }
};