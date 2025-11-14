const fs = require('fs').promises;
const path = require('path');
const { Collection } = require('discord.js');
const Table = require('cli-table3');

module.exports = async (client) => {

    const table = new Table({
        head: ['Buttons', 'Status'],
        style: { head: ['cyan'], border: ['grey'] },
        wordWrap: true,
        colWidths: [50, 20],
    });

    client.buttons = new Collection();
    let successCount = 0;
    let failureCount = 0;
    let hasFailures = false;

    const buttonsFolder = path.join(__dirname, '../buttons');

    try {
        const files = await fs.readdir(buttonsFolder);
        const jsFiles = files.filter(file => file.endsWith('.js'));

        if (jsFiles.length === 0) {
            console.log(`🌿・No buttons found to load`.bold.white);
            return;
        }

        for (const file of jsFiles) {
            try {
                const button = require(path.join(buttonsFolder, file));

                if (button.customId && typeof button.execute === 'function') {
                    client.buttons.set(button.customId, button);
                    successCount++;
                } else {
                    hasFailures = true;
                    failureCount++;
                    if (!button.customId && typeof button.execute !== 'function') {
                        table.push([file, '❌ Missing customId and execute']);
                    } else if (!button.customId) {
                        table.push([file, '❌ Missing customId']);
                    } else {
                        table.push([file, '❌ Missing execute function']);
                    }
                }
            } catch (error) {
                hasFailures = true;
                failureCount++;
                console.error(`Error loading button ${file}:`, error);
                table.push([file, '❌ Error']);
            }
        }

    } catch (error) {
        console.error(`Error reading the buttons folder:`, error);
    }

    // Always print the table if there are failures
    if (hasFailures) {
        console.log('\n' + table.toString());
        console.log(`🌿・Successfully loaded ${successCount} buttons, but ${failureCount} failed`.bold.white);
    } else {
        if (successCount > 0) {
            console.log(`🌿・Successfully loaded ${successCount} buttons`.bold.white);
        }
    }
};

