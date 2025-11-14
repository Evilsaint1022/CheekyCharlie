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
    let successCount = 0;
    let failureCount = 0;
    let hasFailures = false;

    for (const folder of folders) {
        const folderPath = path.join(functionsDir, folder);
        if (fs.statSync(folderPath).isDirectory()) { // Ensure it's a directory
            const files = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"));

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

                const fileContent = fs.readFileSync(path.join(folderPath, file), 'utf-8');

                if ( fileContent.includes('// EXCLUDE') ) continue;

                try {
                    const func = require(path.join(folderPath, file)); // Load the function file

                    // If it's a function, execute it with the client
                    if (typeof func === 'function') {
                        func(client);
                        successCount++;
                    } else {
                        if (!hasFailures) {
                            table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                            hasFailures = true;
                        }
                        failureCount++;
                        table.push([`└── ${file}`, '❌ Not a function']);
                    }
                } catch (err) {
                    if (!hasFailures) {
                        table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: 'left' }]);
                        hasFailures = true;
                    }
                    failureCount++;
                    table.push([`└── ${file}`, '❌ Error']);
                    console.error(`Error loading function ${folder}/${file}:`, err);
                }
            }
        }
    }

    // Always print the table if there are failures
    if (hasFailures) {
        console.log('\n' + table.toString());
        console.log(`🌿・Successfully loaded ${successCount} functions, but ${failureCount} failed`.bold.white);
    } else {
        console.log(`🌿・Successfully loaded ${successCount} functions`.bold.white);
    }
}

module.exports = { loadFunctions };
