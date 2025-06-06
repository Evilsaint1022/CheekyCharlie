const fs = require('fs').promises;
const path = require('path');
const { Collection } = require('discord.js');
const Table = require('cli-table3');

module.exports = async (client) => {

    const commandFolders = ["Everyone", "Staff-Only"]; // Folders to load commands from
    const table = new Table({
        head: ['Commands', 'Status'],
        style: { head: ['cyan'], border: ['grey'] },
        wordWrap: true,
        colWidths: [50, 20], // You can adjust these values if needed
    });

    client.commands = new Collection();

    // Loop through each folder and load commands
    for (const folder of commandFolders) {
        const commandsFolder = path.join(__dirname, `../Commands/${folder}`);

        try {
            const commandFiles = await fs.readdir(commandsFolder);

            // Add the folder name as a title row
            table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);

            const jsFiles = commandFiles.filter(file => file.endsWith('.js'));

            if (jsFiles.length === 0) {
                table.push(['(No .js files found)', '⚠️ Empty']);
                continue;
            }

            for (const file of jsFiles) {
                try {
                    const command = require(path.join(commandsFolder, file));

                    // Ensure the command has a 'data' property with 'name'
                    if (command.data && command.data.name) {
                        client.commands.set(command.data.name, {
                            ...command,
                            folder // Add the folder info to the command object
                        });
                        table.push([`└── ${command.data.name}`, '✅ Loaded']);
                    } else {
                        table.push([`└── ${file}`, '❌ Missing command data']);
                    }
                } catch (error) {
                    console.error(`Error loading command ${file}:`, error);
                    table.push([`└── ${file}`, '❌ Error']);
                }
            }
        } catch (error) {
            console.error(`Error reading the ${folder} folder:`, error);
        }
    }

    // Print the table of commands and a success message
    console.log(table.toString());
    console.log('\x1b[37m%s\x1b[0m', '(✅・Successfully loaded commands)'.bold.green); // .bold.white equivalent
};
