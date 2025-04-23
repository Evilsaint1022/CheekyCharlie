const { table } = require('table');  // Import the table package

module.exports = async function loadServers(client) {
  try {
    // Create an array of server data
    const serverData = [
      ['Server Name', 'Server ID']  // Table headers
    ];

    // Loop through the guilds (servers) the bot is in and add them to the table
    client.guilds.cache.forEach((guild) => {
      serverData.push([guild.name, guild.id]);  // Add server name and ID to the table
    });

    // Convert the serverData into an ASCII table
    const asciiTable = table(serverData);
    
    // Display the table in the console
    console.log(asciiTable);
    
  } catch (error) {
    console.error('Error loading servers:', error);
  }
};
