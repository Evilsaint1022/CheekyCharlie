const Table = require('cli-table3');

module.exports = (client) => {
    const table = new Table({
        head: ['Server Name', 'Server ID', 'MemberCount'],
        style: { head: ['cyan'], border: ['grey'] },
        wordWrap: true,
        colWidths: [30, 25, 15],
    });

    client.guilds.cache.forEach(guild => {
        table.push([guild.name, guild.id, guild.memberCount]);
    });

    console.log(table.toString());
};
