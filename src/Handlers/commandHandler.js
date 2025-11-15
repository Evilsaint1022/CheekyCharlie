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
            const folderContents = await fs.readdir(commandsFolder, { withFileTypes: true });

            // Add the folder name as a title row
            table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);

            // Check for direct .js files in the main folder (backward compatibility)
            const directJsFiles = folderContents
                .filter(item => item.isFile() && item.name.endsWith('.js'))
                .map(item => item.name);

            // Load direct .js files
            for (const file of directJsFiles) {
                try {
                    const command = require(path.join(commandsFolder, file));

                    if (command.data && command.data.name) {
                        client.commands.set(command.data.name, {
                            ...command,
                            folder,
                            topic: 'general'
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

            // Get topic subdirectories
            const topicDirs = folderContents
                .filter(item => item.isDirectory())
                .map(item => item.name);

            // Load commands from topic subdirectories
            for (const topic of topicDirs) {
                const topicFolder = path.join(commandsFolder, topic);

                try {
                    const topicFiles = await fs.readdir(topicFolder);
                    const topicJsFiles = topicFiles.filter(file => file.endsWith('.js'));

                    if (topicJsFiles.length > 0) {
                        table.push([`  📁 ${topic}`, '']);
                    }

                    for (const file of topicJsFiles) {
                        try {
                            const command = require(path.join(topicFolder, file));

                            if (command.data && command.data.name) {
                                client.commands.set(command.data.name, {
                                    ...command,
                                    folder,
                                    topic
                                });
                                table.push([`    └── ${command.data.name}`, '✅ Loaded']);
                            } else {
                                table.push([`    └── ${file}`, '❌ Missing command data']);
                            }
                        } catch (error) {
                            console.error(`Error loading command ${file} from topic ${topic}:`, error);
                            table.push([`    └── ${file}`, '❌ Error']);
                        }
                    }
                } catch (error) {
                    console.error(`Error reading topic folder ${topic}:`, error);
                    table.push([`  📁 ${topic}`, '❌ Error']);
                }
            }

            // If no files or directories found
            if (directJsFiles.length === 0 && topicDirs.length === 0) {
                table.push(['(No commands found)', '⚠️ Empty']);
            }

        } catch (error) {
            console.error(`Error reading the ${folder} folder:`, error);
        }
    }

    // Print the table of commands and a success message
    console.log(table.toString());
    console.log('\x1b[37m%s\x1b[0m', '(✅・Successfully loaded commands)'.bold.green); // .bold.white equivalent
};
