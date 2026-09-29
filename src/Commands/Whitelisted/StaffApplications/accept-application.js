const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('accept-application')
        .setDescription('Accept a staff application (use in application thread).'),

    async execute(interaction) {

        if (interaction.channel.isDMBased()) {
            return interaction.reply({
                content: "This command cannot be used in DMs.",
                flags: 64
            });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        if (!interaction.channel.isThread()) {
            return interaction.reply({
                content: '❌ This command can only be used in a staff application thread.',
                flags: 64
            });
        }

        const threadId = interaction.channel.id;

        const applications = await db.staff_app_applications.get('applications') || [];
        const applicationIndex = applications.findIndex(app => app.threadId === threadId);

        if (applicationIndex === -1) {
            return interaction.reply({
                content: '❌ Could not find the application associated with this thread.',
                flags: 64
            });
        }

        const application = applications[applicationIndex];

        applications.splice(applicationIndex, 1);
        await db.staff_app_applications.set('applications', applications);

        let applicant;

        try {
            applicant = await interaction.client.users.fetch(application.userId);

            const acceptedContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("**🎉 Application accepted!**")
            )

            await applicant.send({ components: [acceptedContainer], flags: [MessageFlags.IsComponentsV2] });

        } catch (error) {
            console.error('Error DMing applicant:', error);
        }

        await interaction.channel.send({
            components: [
                new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**✅ Application accepted.**\n-# Accepted by " + interaction.user.displayName)
                )
            ],
            flags: [MessageFlags.IsComponentsV2]
        })

        console.log(`[⭐] [ACCEPT-APPLICATION] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${interaction.user.username} accepted staff application for user ${application.userId}`);

        await interaction.reply({
            content: '✅ Application accepted successfully!',
            flags: 64
        });

        await interaction.channel.setName("[✅] " + applicant.username)
        await interaction.channel.setLocked(true);
        await interaction.channel.setArchived(true);

    },
};
