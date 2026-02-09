const db = require('./../../Handlers/database');

module.exports = {
    name: 'guildUpdate',
    async execute(oldGuild, newGuild, client) {
        if (oldGuild.name !== newGuild.name) {
            console.log(`[⚙️] [GUILD UPDATE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${oldGuild.name} -> ${newGuild.name}`);
        }
    }
};
