const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

// Function to get the path for the noxp.json file
function getNoXpFilePath(guild) {
  return path.resolve(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Economy/NoXp/noxp.json`);
}

// Function to read noxp.json or initialize it if it doesn't exist
function readNoXpData(guild) {
  const filePath = getNoXpFilePath(guild);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    // If not, create the necessary directories and file with an empty array
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Create the file and write an empty array
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }

  // Read the file content
  const data = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(data); // Return parsed data
  } catch (err) {
    console.error('Error parsing noxp.json:', err);
    return [];
  }
}

// Function to save the noxp.json with updated data
function saveNoXpData(guild, data) {
  const filePath = getNoXpFilePath(guild);

  // Ensure the directory exists
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Save the data back to the file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Function to add a user ID to noxp.json
function addUserToNoXp(guild, userId) {
  const noXpData = readNoXpData(guild);

  // Check if the user ID is already in the file
  if (!noXpData.includes(userId)) {
    noXpData.push(userId); // Add the user ID
    saveNoXpData(guild, noXpData); // Save the updated data
    return true; // Successfully added
  }

  return false; // User already in no XP list
}

// Function to remove a user ID from noxp.json
function removeUserFromNoXp(guild, userId) {
  const noXpData = readNoXpData(guild);

  // Check if the user ID exists
  const index = noXpData.indexOf(userId);
  if (index !== -1) {
    noXpData.splice(index, 1); // Remove the user ID
    saveNoXpData(guild, noXpData); // Save the updated data
    return true; // Successfully removed
  }

  return false; // User ID not found
}

// Function to check if the user has admin permissions
function isAdmin(interaction) {
  const member = interaction.guild.members.cache.get(interaction.user.id);
  return member && member.permissions.has('ADMINISTRATOR');
}

// Function to check if the user has a whitelisted role
function isWhitelisted(guild, user) {
  const whitelistedRolesFilePath = path.resolve(__dirname, `../../Utilities/Servers/${guild.name}_${guild.id}/Whitelisted_Roles/whitelisted_roles.json`);

  // Check if the file exists
  if (!fs.existsSync(whitelistedRolesFilePath)) {
    return false;
  }

  const data = fs.readFileSync(whitelistedRolesFilePath, 'utf-8');
  try {
    const whitelistedRoles = JSON.parse(data); // Parse whitelisted roles
    const member = guild.members.cache.get(user.id);

    if (member) {
      // Check if the user has any of the whitelisted roles
      return member.roles.cache.some(role => whitelistedRoles.includes(role.id));
    }
    return false;
  } catch (err) {
    console.error('Error parsing whitelisted_roles.json:', err);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('noxp')
    .setDescription('Adds or removes a user from the no XP list.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to add or remove from the no XP list')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform (add/remove)')
        .setRequired(true)
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' }
        )),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const guild = interaction.guild; // Get the guild info from the interaction
    
    const userId = user.id;

    // Check if the user has admin permissions or is whitelisted
    if (!isAdmin(interaction) && !isWhitelisted(guild, interaction.user)) {
      return interaction.reply('You do not have the required permissions to use this command.');
    }

    if (action === 'add') {
      if (addUserToNoXp(guild, userId)) {
        await interaction.reply(`${user.tag} has been added to no XP.`);
      } else {
        await interaction.reply(`${user.tag} is already in no XP.`);
      }
    } else if (action === 'remove') {
      if (removeUserFromNoXp(guild, userId)) {
        await interaction.reply(`${user.tag} has been removed from no XP.`);
      } else {
        await interaction.reply(`${user.tag} is not in no XP.`);
      }
    }
  },
};
