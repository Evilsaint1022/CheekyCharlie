const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

function loadFunctions(client) {
    const table = new Table({
        head: ['Functions', 'Status'],
        style: { head: ['cyan'], border: ['grey'] },
        wordWrap: true,
        colWidths: [50, 20], // You can tweak these values to your liking
    });

    const functionsDir = path.join(__dirname, '..', 'Functions'); // Path to Functions directory
    const folders = fs.readdirSync(functionsDir); // Get all folders in Functions directory

    for (const folder of folders) {
        const folderPath = path.join(functionsDir, folder);
        if (fs.statSync(folderPath).isDirectory()) { // Ensure it's a directory
            table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]); // Add folder name as a title row

            const files = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"));

            if (files.length === 0) {
                table.push(['(No .js files found)', '⚠️ Empty']);
                continue;
            }

            for (const file of files) {

                const fileContent = fs.readFileSync(path.join(folderPath, file), 'utf-8');

                if ( fileContent.includes('// EXCLUDE') ) continue;

                try {
                    const func = require(path.join(folderPath, file)); // Load the function file

                    // If it's a function, execute it with the client
                    if (typeof func === 'function') {
                        func(client);
                        table.push([`└── ${file}`, '✅ Loaded']);
                    } else {
                        table.push([`└── ${file}`, '❌ Not a function']);
                    }
                } catch (err) {
                    table.push([`└── ${file}`, '❌ Error']);
                    console.error(`Error loading function ${folder}/${file}:`, err);
                }
            }
        }
    }

    // Print the table of functions and success message
    console.log(table.toString());
    console.log('\x1b[37m%s\x1b[0m', '(✅・Successfully Loaded Functions)'.bold.green); // .bold.white equivalent
}

module.exports = { loadFunctions };
