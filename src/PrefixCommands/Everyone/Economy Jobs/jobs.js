const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');

const db = require('../../../Handlers/database');

module.exports = {
    name: 'jobs',
    aliases: ['joblist', 'careers'],
    description: 'Displays all available jobs.',

    async execute(message) {

        // Block DMs
        if (message.channel.isDMBased()) {
            return message.reply({
                content: 'This command cannot be used in DMs.',
                flags: 64
            });
        }

        // Fetch jobs
        const jobs = await db.joblist.all() || [];

        // Validate jobs
        if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
            return message.reply('❌ No jobs were found.');
        }

        // Currency
        const custom = await db.settings.get(`${message.guild.id}.currencyicon`);
        const ferns = await db.default.get("Default.ferns");

        const bar = `**─────────────────────────────────**`;

        // Jobs per page
        const JOBS_PER_PAGE = 10;

        // Split into pages
        const pages = [];

        for (let i = 0; i < jobs.length; i += JOBS_PER_PAGE) {

            const currentJobs = jobs.slice(i, i + JOBS_PER_PAGE);

            const description = currentJobs.map(job => {

                const cooldownMinutes = Math.floor(job.cooldown / 60000);

                return (
                    `\n${job.emoji} **${job.name}**\n` +
                    `〉**ID:** \`${job.id}\`\n` +
                    `〉**Earnings:** ${custom || ferns} ${job.min.toLocaleString()} - ${job.max.toLocaleString()}\n` +
                    `〉**Cooldown:** ${cooldownMinutes} minute(s)`
                );

            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle('**╭─── 🌿__Available Jobs__🌿 ───╮**')
                .setDescription(description + `\n\n**╰───────── Page ${pages.length + 1}/${Math.ceil(jobs.length / JOBS_PER_PAGE)} ──────────╯**`)
                .setColor(0x207e37)
                .setThumbnail(message.guild.iconURL())

            pages.push(embed);
        }

        // Buttons
        const backButton = new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary);

        const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger);

        const nextButton = new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(
            backButton,
            stopButton,
            nextButton
        );

        let page = 0;

        const msg = await message.reply({
            embeds: [pages[page]],
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async interaction => {

            // Only command author can use buttons
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: '❌ You cannot use these buttons.',
                    flags: 64
                });
            }

            // Back button
            if (interaction.customId === 'previous') {

                page--;

                if (page < 0) {
                    page = pages.length - 1;
                }

                await interaction.update({
                    embeds: [pages[page]],
                    components: [row]
                });
            }

            // Next button
            else if (interaction.customId === 'next') {

                page++;

                if (page >= pages.length) {
                    page = 0;
                }

                await interaction.update({
                    embeds: [pages[page]],
                    components: [row]
                });
            }

            // Stop button
            else if (interaction.customId === 'stop') {

                collector.stop();

                const disabledRow = new ActionRowBuilder().addComponents(
                    backButton.setDisabled(true),
                    stopButton.setDisabled(true),
                    nextButton.setDisabled(true)
                );

                await interaction.update({
                    embeds: [pages[page]],
                    components: [disabledRow]
                });
            }
        });

        collector.on('end', async () => {

            const disabledRow = new ActionRowBuilder().addComponents(
                backButton.setDisabled(true),
                stopButton.setDisabled(true),
                nextButton.setDisabled(true)
            );

            await msg.edit({
                components: [disabledRow]
            }).catch(() => {});
        });

        console.log(
            `[🌿] [JOBS] ` +
            `[${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", {
                timeZone: "Pacific/Auckland"
            })}] ` +
            `${message.guild.name} ${message.guild.id} ` +
            `${message.author.username} viewed the jobs list.`
        );
    }
};