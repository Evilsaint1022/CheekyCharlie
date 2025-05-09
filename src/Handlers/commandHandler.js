const fs = require('fs').promises;
const path = require('path');
const { Collection } = require('discord.js');
const Table = require('ascii-table');

module.exports = async (client) => {

    const commandFolders = ["Everyone","Staff-Only"]; // Folders to load commands from
    const table = new Table();
    table.setHeading("Commands", "Status");

    // Loop through each folder and load commands
    for (const folder of commandFolders) {
        const commandsFolder = path.join(__dirname, `../Commands/${folder}`);

        try {
            const commandFiles = await fs.readdir(commandsFolder);

            if (commandFiles.length === 0) {
            }

            // Add the folder name as a title row
            table.addRow(folder, "");

            for (const file of commandFiles) {
                if (file.endsWith('.js')) {
                    try {
                        const command = require(path.join(commandsFolder, file));

                        // Ensure the command has a 'data' property with 'name'
                        if (command.data && command.data.name) {
                            client.commands.set(command.data.name, {
                                ...command,
                                folder // Add the folder info to the command object
                            });
                            table.addRow(`    ${command.data.name} `,'Loaded'); // Indent command name for better readability
                        } else {
                            table.addRow(`${file}`, 'Error: Missing command data'); // Indent error row
                        }
                    } catch (error) {
                        console.error(`Error loading command ${file}: ${error}`);
                        table.addRow(`  ${file}`, 'Error'); // Indent error row
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading the ${folder} folder:`, error);
        }
    }

    // Print the table of commands and a success message
    console.log(table.toString());
    console.log("(✅│Successfully Loaded Commands)".bold.white);
};