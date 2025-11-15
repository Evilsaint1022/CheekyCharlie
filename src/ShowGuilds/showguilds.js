const Table = require('cli-table3');

module.exports = (client) => {
    const table = new Table({
        head: ['Server Name', 'Server ID', 'MemberCount'],
        style: {
            head: ['green'],
            border: [], // no border color
        },
        chars: {
            'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
            'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
            'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
            'right': '' , 'right-mid': '' , 'middle': ' '
        }
    });

    client.guilds.cache.forEach(guild => {
        table.push([guild.name, guild.id, guild.memberCount]);
    });

    console.log(table.toString());
};
