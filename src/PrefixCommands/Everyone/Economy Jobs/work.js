const { EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    name: 'work',
    description: 'Work your current job and earn money.',

    async execute(message) {

        // Prevent DMs
        if (message.channel.isDMBased()) {
            return message.reply({
                content: 'This command cannot be used in DMs.',
                flags: 64
            });
        }

        const userId = message.author.id;
        const username = message.author.username;

        // Currency
        const custom = await db.settings.get(`${message.guild.id}.currencyicon`);
        const ferns = await db.default.get('Default.ferns');

        const customname = await db.settings.get(`${message.guild.id}.currencyname`);
        const fernsname = await db.default.get('Default.name');

        const middle = `· · - ┈┈━━━━━━ ˚ . 🌿 . ˚ ━━━━━━┈┈ - · ·`;

        const currency = custom || ferns;

        const Taxlastpayed = await db.tax.get(`${userId}.lastpayed`) || 0;

        const now = Date.now();

        // 1 week
        const week = 7 * 24 * 60 * 60 * 1000;

        if (now - Taxlastpayed >= week) {

            const timePassed = now - Taxlastpayed;

            const days = Math.floor(timePassed / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timePassed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            return message.reply(
                `💰 You must pay your taxes before working again.\n` +
                `Last paid: **${days}d ${hours}h ago**.`
            );
        }

        // Get selected job
        const selectedJobId = await db.workers.get(`${userId}.job`);

        // No job selected
        if (!selectedJobId) {
            return message.reply(
                '❌ You do not currently have a job.\nUse `?jobs` to view available jobs.'
            );
        }

        // Fetch jobs list
        const jobs = await db.joblist.all() || [];

        // Validate jobs
        if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
            return message.reply('❌ No jobs are currently available.');
        }

        // Find selected job
        const selectedJob = jobs.find(
            job => job.id === selectedJobId
        );

        // Job missing
        if (!selectedJob) {
            return message.reply(
                '❌ Your current job no longer exists.'
            );
        }

        // Cooldown check
        const lastWork = await db.lastclaim.get(`${userId}.work`) || 0;

        if (now - lastWork < selectedJob.cooldown) {

            const timeLeft = selectedJob.cooldown - (now - lastWork);
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);

            return message.reply(
                `⏳ You are still tired from working.\n` +
                `Come back in **${hours}h ${minutes}m ${seconds}s**.`
            );
        }

        // Get user tax
        const userTax = await db.tax.get(`${userId}.tax`) || 0;

        // Check if tax already exists
        if (!userTax) {
            await db.tax.set(`${userId}.lastpayed`, now);
        };

        // Random reward
        const reward =
            Math.floor(
                Math.random() *
                (selectedJob.max - selectedJob.min + 1)
            ) + selectedJob.min;
        
        // Get The Job Tax
        const jobTax = selectedJob.tax;

        // Calculate the tax
        const tax = Math.floor(reward * (jobTax / 100));
        db.tax.set(`${userId}.tax`, userTax + tax);




        // Get balance
        let balance = await db.wallet.get(`${userId}.balance`) || 0;
        let bank = await db.bank.get(`${userId}.bank`) || 0;

        // Add reward
        balance += reward;

        // Save balance
        await db.wallet.set(`${userId}.balance`, balance);

        // Save cooldown
        await db.lastclaim.set(`${userId}.work`, now);

        // Random work phrases
        const phrases = [
            `You worked as a ${selectedJob.name} and earned`,
            `Your shift as a ${selectedJob.name} paid you`,
            `You finished working as a ${selectedJob.name} and received`,
            `After a long day working as a ${selectedJob.name}, you earned`,
            `You completed your ${selectedJob.name} shift and made`
        ];

        const phrase =
            phrases[Math.floor(Math.random() * phrases.length)];

        // Embed
        const embed = new EmbedBuilder()
            .setTitle(`**🌿 __${username} Worked!__ 🌿**`)
            .setDescription(
                `${selectedJob.emoji} ${phrase} **${currency} ${reward.toLocaleString()}**\n` +
                `${middle}\n` +
                `ㅤ **💰__Wallet__**     ㅤ**🏦__Bank__**\n` +
                `ㅤ ${custom || ferns}・${balance.toLocaleString()}      ${custom || ferns}・${bank.toLocaleString()}\n` +
                `${middle}\n\n`
            )
            .setColor(0x207e37)
            .setFooter({
                text: `🌿 Current Job: ${selectedJob.name}`
            })
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        await message.reply({
            embeds: [embed]
        });

        console.log(
            `[🌿] [WORK] ` +
            `[${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", {
                timeZone: "Pacific/Auckland"
            })}] ` +
            `${message.guild.name} ${message.guild.id} ` +
            `${username} worked as ${selectedJob.name} and earned ${reward.toLocaleString()} ${customname || fernsname}`
        );
    }
};