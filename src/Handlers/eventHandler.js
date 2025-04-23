const Table = require('ascii-table');  // Updated to use 'Table' instead of 'ascii'
const fs = require('fs');
const path = require('path');

function loadEvents(client) {
    const table = new Table().setHeading("Events", "Status");  // Using Table to set headings

    const eventDir = path.join(__dirname, '..', 'Events'); // Get the path to the Events folder
    const folders = fs.readdirSync(eventDir); // Get all folders in the Events directory
    
    for (const folder of folders) {
        const folderPath = path.join(eventDir, folder);
        if (fs.statSync(folderPath).isDirectory()) { // Ensure it's a directory
            table.addRow(folder, ""); // Add folder name as a title row

            const files = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"));
            for (const file of files) {
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

                // Add the event file under the respective folder title
                table.addRow(`  ${file}`, "Loaded");
            }
        }
    }

    // Print the table of events and a success message
    console.log(table.toString());
    console.log("(✅│Successfully Loaded Events)".bold.white);
}

module.exports = { loadEvents };
