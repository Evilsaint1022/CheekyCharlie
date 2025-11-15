const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-whitelisted-roles')
        .setDescription('Removes a role from the whitelisted roles for using certain commands')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to remove from whitelist')
                .setRequired(true)
        ),

    async execute(interaction) {

        // Prevent command usage in DMs
        if (interaction.channel.isDMBased()) {
        return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: MessageFlags.Ephemeral // Makes the reply ephemeral
    });
}


        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        let WHITELISTED_ROLE_IDS = await db.whitelisted.get(`${guildName}_${guildId}.whitelistedRoles`) || [];

        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));

        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have the required whitelisted role to use this command.', flags: MessageFlags.Ephemeral });
        }

        const role = interaction.options.getRole('role');

        if (!WHITELISTED_ROLE_IDS.includes(role.id)) {
            return interaction.reply({ content: `The role <@&${role.id}> is not in the whitelist.`, flags: MessageFlags.Ephemeral });
        }

        // Remove the role from the array
        WHITELISTED_ROLE_IDS = WHITELISTED_ROLE_IDS.filter(id => id !== role.id);

        // Update the database with the new list of whitelisted roles
        db.whitelisted.set(`${guildName}_${guildId}.whitelistedRoles`, WHITELISTED_ROLE_IDS);

        await interaction.reply({ content: `The role <@&${role.id}> has been removed from the whitelist.`, flags: MessageFlags.Ephemeral });

        // Console Logs
        console.log(`[⭐] [REMOVE-WHITELISTED-ROLES] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName}_${guildId} ${interaction.user.username} used the remove-whitelisted-roles command. Removed role <@&${role.id}> from the whitelist.`);
    }
};
