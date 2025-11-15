const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

function loadEvents(client) {

    client.setMaxListeners(20)

    const table = new Table({
        head: ['Events', 'Status'],
        style: { head: ['cyan'], border: ['grey'] },
        wordWrap: true,
        colWidths: [50, 20], // You can tweak these values to your liking
    });

    const eventDir = path.join(__dirname, '..', 'Events'); // Get the path to the Events folder
    const folders = fs.readdirSync(eventDir); // Get all folders in the Events directory
    let successCount = 0;
    let failureCount = 0;
    let hasFailures = false;
    
    for (const folder of folders) {
        const folderPath = path.join(eventDir, folder);
        if (fs.statSync(folderPath).isDirectory()) { // Ensure it's a directory
            const files = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

            if (files.length === 0) {
                if (!hasFailures) {
                    table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                    hasFailures = true;
                }
                failureCount++;
                table.push(['(No .js files found)', '⚠️ Empty']);
                continue;
            }

            for (const file of files) {
                try {
                    const event = require(path.join(folderPath, file)); // Load the event file

                    // Register event based on whether it uses REST or not
                    if (event.rest) {
                        if (event.once)
                            client.rest.once(event.name, (...args) => event.execute(...args, client));
                        else
                            client.rest.on(event.name, (...args) => event.execute(...args, client));
                    } else {
                        if (event.once)
                            client.once(event.name, (...args) => event.execute(...args, client));
                        else
                            client.on(event.name, (...args) => event.execute(...args, client));
                    }

                    successCount++;
                } catch (err) {
                    if (!hasFailures) {
                        table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                        hasFailures = true;
                    }
                    failureCount++;
                    console.error(`Error loading event ${folder}/${file}:`, err);
                    table.push([`└── ${file}`, '❌ Error']);
                }
            }
        }
    }

    // Always print the table if there are failures
    if (hasFailures) {
        console.log('\n' + table.toString());
        console.log(`🌿・Successfully loaded ${successCount} events, but ${failureCount} failed`.bold.white);
    } else {
        console.log(`🌿・Successfully loaded ${successCount} events`.bold.white);
    }
}

module.exports = { loadEvents };
