const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removewhitelistedroles')
        .setDescription('Removes a role from the whitelisted roles from using certain commands')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to remove from whitelist')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }

        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        const dirPath = path.join(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Whitelisted_Roles/`);
        const rolesFilePath = path.join(dirPath, 'whitelisted_roles.json');

        if (!fs.existsSync(rolesFilePath)) {
            return interaction.reply({ content: 'No whitelisted roles have been set.', flags: 64 });
        }

        let WHITELISTED_ROLE_IDS = [];
        try {
            const data = fs.readFileSync(rolesFilePath, 'utf8');
            WHITELISTED_ROLE_IDS = JSON.parse(data).roles || [];
        } catch (error) {
            console.error('Error reading whitelisted roles file:', error);
            return interaction.reply({ content: 'An error occurred while reading the whitelist file.', flags: 64 });
        }

        const role = interaction.options.getRole('role');
        if (!WHITELISTED_ROLE_IDS.includes(role.id)) {
            return interaction.reply({ content: `The role <@&${role.id}> is not in the whitelist.`, flags: 64 });
        }

        // Remove the role from the array
        WHITELISTED_ROLE_IDS = WHITELISTED_ROLE_IDS.filter(id => id !== role.id);

        // If the whitelist is now empty, delete the file
        if (WHITELISTED_ROLE_IDS.length === 0) {
            fs.unlinkSync(rolesFilePath);
            return interaction.reply({ content: `The role <@&${role.id}> has been removed from the whitelist. No whitelisted roles remain, so the file has been deleted.`, flags: 64 });
        }

        // Otherwise, update the file
        fs.writeFileSync(rolesFilePath, JSON.stringify({ roles: WHITELISTED_ROLE_IDS }, null, 4));

        await interaction.reply({ content: `The role <@&${role.id}> has been removed from the whitelist.`, flags: 64 });

        // Console Logs
        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the removewhitelistedroles command. Removed role <@&${role.id}> from the whitelist.`);
    }
};
