const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('starboard-set-count')
        .setDescription('Set how many reactions are needed to send a message to the starboard')
        .addIntegerOption(option => 
            option.setName('count')
                .setDescription('The number of reactions needed to send a message to the starboard')
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        
        // Define the directory path based on Server Name and Guild ID
        const dirPath = path.join(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Settings/`);
        const rolesFilePath = path.join(dirPath, 'whitelistedroles.json');
        const starboardSettingsPath = path.join(dirPath, 'starboardSettings.json');
        
        // Ensure the directory exists
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Load or create the whitelisted roles file
        let WHITELISTED_ROLE_IDS = [];
        if (fs.existsSync(rolesFilePath)) {
            try {
                const data = fs.readFileSync(rolesFilePath, 'utf8');
                WHITELISTED_ROLE_IDS = JSON.parse(data).roles || [];
            } catch (error) {
                console.error('Error reading whitelisted roles file:', error);
            }
        } else {
            // Create a default file with an empty roles list
            fs.writeFileSync(rolesFilePath, JSON.stringify({ roles: [] }, null, 4));
        }
        
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));
        
        if (!hasPermission && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }

        let starboardData;

        try {

            if (fs.existsSync(starboardSettingsPath)) {
                const data = fs.readFileSync(starboardSettingsPath, 'utf8');
                starboardData = JSON.parse(data);
            } else {
                starboardData = { count: null };
            }

            const count = interaction.options.getInteger('count');

            starboardData.count = count;

            fs.writeFileSync(starboardSettingsPath, JSON.stringify(starboardData, null, 4));

            await interaction.reply({ content: `Starboard count set to ${count}.`, flags: MessageFlags.Ephemeral });

        } catch ( err ) {

            console.error('Error reading starboard settings file:', err);
            starboardData = { count: null };
            
        }

    },
};
