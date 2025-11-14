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
    let successCount = 0;
    let failureCount = 0;
    let hasFailures = false;

    // Loop through each folder and load commands
    for (const folder of commandFolders) {
        const commandsFolder = path.join(__dirname, `../Commands/${folder}`);
        const addedTopics = new Set(); // Track which topics have been added to the table

        try {
            const folderContents = await fs.readdir(commandsFolder, { withFileTypes: true });

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
                        successCount++;
                    } else {
                        if (!hasFailures) {
                            table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                            hasFailures = true;
                        }
                        failureCount++;
                        table.push([`└── ${file}`, '❌ Missing command data']);
                    }
                } catch (error) {
                    if (!hasFailures) {
                        table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                        hasFailures = true;
                    }
                    failureCount++;
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

                    for (const file of topicJsFiles) {
                        try {
                            const command = require(path.join(topicFolder, file));

                            if (command.data && command.data.name) {
                                client.commands.set(command.data.name, {
                                    ...command,
                                    folder,
                                    topic
                                });
                                successCount++;
                            } else {
                                if (!hasFailures) {
                                    table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                                    hasFailures = true;
                                }
                                if (!addedTopics.has(topic)) {
                                    table.push([`  📁 ${topic}`, '']);
                                    addedTopics.add(topic);
                                }
                                failureCount++;
                                table.push([`    └── ${file}`, '❌ Missing command data']);
                            }
                        } catch (error) {
                            if (!hasFailures) {
                                table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                                hasFailures = true;
                            }
                            if (!addedTopics.has(topic)) {
                                table.push([`  📁 ${topic}`, '']);
                                addedTopics.add(topic);
                            }
                            failureCount++;
                            console.error(`Error loading command ${file} from topic ${topic}:`, error);
                            table.push([`    └── ${file}`, '❌ Error']);
                        }
                    }
                } catch (error) {
                    if (!hasFailures) {
                        table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                        hasFailures = true;
                    }
                    if (!addedTopics.has(topic)) {
                        table.push([`  📁 ${topic}`, '']);
                        addedTopics.add(topic);
                    }
                    failureCount++;
                    console.error(`Error reading topic folder ${topic}:`, error);
                    table.push([`    └── (folder error)`, '❌ Error']);
                }
            }

        } catch (error) {
            console.error(`Error reading the ${folder} folder:`, error);
        }
    }

    // Always print the table if there are failures
    if (hasFailures) {
        console.log('\n' + table.toString());
        console.log(`🌿・Successfully loaded ${successCount} commands, but ${failureCount} failed`.bold.white);
    } else {
        console.log(`🌿・Successfully loaded ${successCount} commands`.bold.white);
    }
};
