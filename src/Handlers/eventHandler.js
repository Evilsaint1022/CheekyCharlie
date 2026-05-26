const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

function loadEvents(client) {

    client.setMaxListeners(100)

    const table = new Table({
        head: ['Events', 'Status'],
        style: { head: ['cyan'], border: ['grey'] },
        wordWrap: true,
        colWidths: [50, 20], // You can tweak these values to your liking
    });

    const eventDir = path.join(__dirname, '..', 'Events'); // Get the path to the Events folder
    const folders = fs.readdirSync(eventDir); // Get all folders in the Events directory
    
    for (const folder of folders) {
        const folderPath = path.join(eventDir, folder);
        if (fs.statSync(folderPath).isDirectory()) { // Ensure it's a directory
            table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]); // Folder title row

            const files = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

            if (files.length === 0) {
                table.push(['(No .js files found)', '⚠️ Empty']);
                continue;
            }

            for (const file of files) {
                try {
                    const event = require(path.join(folderPath, file)); // Load the event file

                    const safeExecute = (...args) =>
                        Promise.resolve(event.execute(...args, client)).catch(err =>
                            console.error(`[Event Error] ${folder}/${file}:`, err)
                        );

                    // Register event based on whether it uses REST or not
                    if (event.rest) {
                        if (event.once)
                            client.rest.once(event.name, safeExecute);
                        else
                            client.rest.on(event.name, safeExecute);
                    } else {
                        if (event.once)
                            client.once(event.name, safeExecute);
                        else
                            client.on(event.name, safeExecute);
                    }

                    table.push([`└── ${file}`, '✅ Loaded']);
                } catch (err) {
                    console.error(`Error loading event ${folder}/${file}:`, err);
                    table.push([`└── ${file}`, '❌ Error']);
                }
            }
        }
    }

    // Print the table of events and a success message
    console.log(table.toString());
    console.log('\x1b[37m%s\x1b[0m', '(✅・Successfully Loaded Events)'.bold.green); // .bold.white equivalent
}

module.exports = { loadEvents };
