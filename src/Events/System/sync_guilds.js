const db = require('./../../Handlers/database');

module.exports = {
    name: 'guildUpdate',
    async execute(oldGuild, newGuild, client) {
        if (oldGuild.name !== newGuild.name) {
            console.log(`[GuildUpdate] ${oldGuild.name} -> ${newGuild.name}`);
        }
    }
};
