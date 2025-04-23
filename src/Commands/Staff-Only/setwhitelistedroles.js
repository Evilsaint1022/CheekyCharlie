const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwhitelistedroles')
        .setDescription('Sets the whitelisted roles for the echo command')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to whitelist')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }

        const guildName = interaction.guild.name;
        const guildId = interaction.guild.id;
        const dirPath = path.join(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Whitelisted_Roles/`);
        const rolesFilePath = path.join(dirPath, 'whitelisted_roles.json');
        
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        let WHITELISTED_ROLE_IDS = [];
        if (fs.existsSync(rolesFilePath)) {
            try {
                const data = fs.readFileSync(rolesFilePath, 'utf8');
                WHITELISTED_ROLE_IDS = JSON.parse(data).roles || [];
            } catch (error) {
                console.error('Error reading whitelisted roles file:', error);
            }
        }
        
        const role = interaction.options.getRole('role');
        if (!WHITELISTED_ROLE_IDS.includes(role.id)) {
            WHITELISTED_ROLE_IDS.push(role.id);
            fs.writeFileSync(rolesFilePath, JSON.stringify({ roles: WHITELISTED_ROLE_IDS }, null, 4));
        }
        
        await interaction.reply({ content: `The role <@&${role.id}> has been added to the whitelist.`, flags: 64 });

        // Console Logs
        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the setwhitelistedroles command. Added role <@&${role.id}> to the whitelist.`);
    }
};
