const fs = require('fs');
const path = require('path');
const AsciiTable = require('ascii-table');

module.exports = (client) => {
  const functionsPath = path.join(__dirname, '../Functions');
  const table = new AsciiTable('');
  table.setHeading('Functions', 'Status');

  fs.readdirSync(functionsPath).forEach((file) => {
    if (file.endsWith('.js')) {
      try {
        const func = require(path.join(functionsPath, file));
        if (typeof func === 'function') {
          func(client);
          table.addRow(file, 'Loaded');
        } else {
          table.addRow(file, '❌ Not a function');
        }
      } catch (err) {
        table.addRow(file, '❌ Error');
        console.error(`Error loading function ${file}:`, err);
      }
    }
  });

  console.log(table.toString());
};
