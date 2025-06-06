const db = require('./../../Handlers/database');

module.exports = {
    name: 'guildUpdate',
    async execute(oldGuild, newGuild, client) {
        if (oldGuild.name !== newGuild.name) {
            console.log(`[GuildUpdate] ${oldGuild.name} -> ${newGuild.name}`);

            const oldNameKey = oldGuild.name;
            const oldNameIdKey = `${oldGuild.name}_${oldGuild.id}`;

            const newNameKey = newGuild.name;
            const newNameIdKey = `${newGuild.name}_${newGuild.id}`;

            // Loop over all DotDB databases:
            for (const [dbName, database] of Object.entries(db)) {
                try {
                    const allEntries = Object.entries(await database.all());
                    let foundAny = true;

                    for (const [key, value] of allEntries) {
                        let newKey = null;

                        // If key is exactly oldGuild.name
                        if (key === oldNameKey) {
                            newKey = newNameKey;
                        }
                        // If key is exactly oldGuild.name_guildId
                        else if (key === oldNameIdKey) {
                            newKey = newNameIdKey;
                        }
                        // If key starts with oldGuild.name + "_" but has any suffix (maybe an old variant)
                        else if (key.startsWith(`${oldGuild.name}_`)) {
                            const suffix = key.substring(`${oldGuild.name}_`.length);
                            newKey = `${newGuild.name}_${suffix}`;
                        }

                        if (newKey !== null) {
                            foundAny = true;

                            // Rename key:
                            await database.set(newKey, value);
                            await database.delete(key);

                            // Optional: Update value if it contains oldGuild.name
                            if (typeof value === 'string' && value.includes(oldGuild.name)) {
                                const newValue = value.replaceAll(oldGuild.name, newGuild.name);
                                await database.set(newKey, newValue);
                                console.log(`[GuildUpdate] [${dbName}] Updated string value in key: ${newKey}`);
                            } else if (typeof value === 'object' && value !== null) {
                                const valueStr = JSON.stringify(value);
                                if (valueStr.includes(oldGuild.name)) {
                                    const updatedValue = JSON.parse(valueStr.replaceAll(oldGuild.name, newGuild.name));
                                    await database.set(newKey, updatedValue);
                                    console.log(`[GuildUpdate] [${dbName}] Updated object value in key: ${newKey}`);
                                }
                            }
                        }
                    }

                    if (!foundAny) {
                        console.log(`[GuildUpdate] [${dbName}] No keys found matching guildName or guildName_*`);
                    }
                } catch (err) {
                    console.error(`[GuildUpdate] [${dbName}] Error processing:`, err);
                }
            }
        }
    },
};
