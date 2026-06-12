const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'job-apply',
    aliases: ['job', 'applyjob'],
    description: 'Apply for a job.',

    async execute(message, args) {

        // Prevent DMs
        if (message.channel.isDMBased()) {
            return message.reply({
                content: 'This command cannot be used in DMs.',
                flags: 64
            });
        }

        const userId = message.author.id;
        const guildKey = `${message.guild.id}`;

        // No job provided
        if (!args[0]) {
            return message.reply(
                '❌ Please provide a job ID.\nExample: `?job-apply miner`'
            );
        }

        // Get last cooldown
        await db.lastclaim.get(`${userId}.jobs`);

        // Cooldown check
        const lastClaim = await db.lastclaim.get(`${userId}.jobs`) || 0;
        const now = Date.now();
        const timeLeft = 60 * 60 * 1000 - (now - lastClaim);
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));


        if (now - lastClaim < 60 * 60 * 1000) {
            return message.reply(
                `❌ You can't apply for a job for another ${minutes} minutes.`
            );
        }

        const jobId = args[0].toLowerCase();

        // Fetch jobs from database
        const jobs = await db.joblist.all() || [];

        // Validate jobs
        if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
            return message.reply('❌ No jobs are currently available.');
        }

        // Find selected job
        const selectedJob = jobs.find(
            job => job.id.toLowerCase() === jobId
        );

        // Invalid job
        if (!selectedJob) {

            const availableJobs = jobs
                .map(job => `\`${job.id}\``)
                .join(', ');

            return message.reply(
                `❌ Invalid job ID.\n\nAvailable jobs:\n${availableJobs}`
            );
        }

        // Leve Data Fetch
        const levelsData = await db.levels.get(guildKey);
        const userLevels = levelsData?.[userId];

        if (!userLevels) {
            return message.reply("❌ You don't have any level data yet.");
        }

        const { xp, level } = levelsData[userId];

        // Level requirement check
        if (level < selectedJob.level) {
            return message.reply(
                `❌ You need to be **Level ${selectedJob.level}** to apply for **${selectedJob.name}**.\n` +
                `_You are currently level:_ **${level}**`
            );
        }

        // Get current job
        const currentJob = await db.workers.get(`${userId}.job`);

        // Already has this job
        if (currentJob === selectedJob.id) {
            return message.reply(
                `❌ You already work as a **${selectedJob.name}** ${selectedJob.emoji}`
            );
        }

        // Save selected job
        await db.workers.set(`${userId}.job`, selectedJob.id);

        // Currency icon
        const custom = await db.settings.get(`${message.guild.id}.currencyicon`);
        const ferns = await db.default.get('Default.ferns');

        const currency = custom || ferns;

        // Cooldown in minutes
        const cooldownMinutes = Math.floor(selectedJob.cooldown / 60000);

        // Add cooldown
        await db.lastclaim.set(`${userId}.jobs`, Date.now());

        // Embed
        const embed = new EmbedBuilder()
            .setTitle('**🌿 __Job Applied__ 🌿**')
            .setDescription(
                `\nYou are now working as a ${selectedJob.emoji} **${selectedJob.name}**\n\n` +
                `〉Earnings: ${currency} ${selectedJob.min.toLocaleString()} - ${selectedJob.max.toLocaleString()}\n` +
                `〉Cooldown: ${cooldownMinutes} minute(s)\n` +
                `〉ID: \`${selectedJob.id}\``
            )
            .setColor(0x207e37)
            .setFooter({
                text: `🌿 Thanks for choosing ${selectedJob.id}`,
            })
            .setThumbnail(
                message.guild.iconURL({ dynamic: true })
            );

        await message.reply({
            embeds: [embed]
        });

        console.log(
            `[🌿] [JOB APPLY] ` +
            `[${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", {
                timeZone: "Pacific/Auckland"
            })}] ` +
            `${message.guild.name} ${message.guild.id} ` +
            `${message.author.username} applied for ${selectedJob.name}`
        );
    }
};