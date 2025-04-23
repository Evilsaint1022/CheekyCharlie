const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Repeats your message')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message to echo')
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildName = interaction.guild.name;
        
        // Define the directory path based on Server Name and Guild ID
        const dirPath = path.join(__dirname, `../../Utilities/Servers/${guildName}_${guildId}/Whitelisted_Roles/`);
        const rolesFilePath = path.join(dirPath, 'whitelisted_roles.json');
        
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
        
        // Check if the user has a whitelisted role
        const memberRoles = interaction.member.roles.cache.map(role => role.id);
        const hasPermission = WHITELISTED_ROLE_IDS.some(roleId => memberRoles.includes(roleId));
        
        if (!hasPermission) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
        }
        
        // Get the message content
        const messageContent = interaction.options.getString('message');
        
        // Send the message content in the same channel
        await interaction.channel.send(messageContent);

        // Console Logs
        console.log(`[${new Date().toLocaleTimeString()}] ${guildName} ${guildId} ${interaction.user.username} used the echo command. Message: ${messageContent}`);
        
        // Reply to the user with an ephemeral message confirming the message was sent
        await interaction.reply({ content: 'Your message has been sent!', flags: 64 });
    },
};
