const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-whitelisted-roles')
        .setDescription('Sets the whitelisted roles for the echo command')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to whitelist')
                .setRequired(true)
        ),

    async execute(interaction) {

        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64 // Makes the reply ephemeral
    });
}

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const role = interaction.options.getRole('role');

        // Fetch existing whitelisted roles from the database
        let WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        if (!WHITELISTED_ROLE_IDS.includes(role.id)) {
            WHITELISTED_ROLE_IDS.push(role.id);

            // Update the database with the new list of whitelisted roles
            db.whitelisted.set(`${guildName}_${guildId}.whitelistedRoles`, WHITELISTED_ROLE_IDS);
        }

        await interaction.reply({ content: `The role <@&${role.id}> has been added to the whitelist.`, flags: 64 });

        // Console Logs
        console.log(`[⭐] [SET-WHITELISTED-ROLES] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString()}] ${guildName}_${guildId} ${interaction.user.username} used the set-whitelisted-roles command. Added role <@&${role.id}> to the whitelist.`);
    }
};
