const db = require('./../../Handlers/database');

module.exports = {
    name: 'userUpdate',
    async execute(oldUser, newUser, client) {
        // Only proceed if username changed
        if (oldUser.username !== newUser.username) {
            // Sanitize usernames by replacing dots with underscores
            const oldUsernameRaw = oldUser.username;
            const newUsernameRaw = newUser.username;

            const oldUsername = oldUsernameRaw.replace(/\./g, '_');
            const newUsername = newUsernameRaw.replace(/\./g, '_');

            console.log(`[UserUpdate] ${oldUsernameRaw} -> ${newUsernameRaw} (sanitized: ${oldUsername} -> ${newUsername})`);

            const oldKeyBase = `${oldUsername}_${oldUser.id}`;
            const newKeyBase = `${newUsername}_${newUser.id}`;

            // Iterate through all DB namespaces like bank, balance, etc.
            for (const [dbName, database] of Object.entries(db)) {
                try {
                    const allData = await database.all();

                    for (const [guildKey, guildData] of Object.entries(allData)) {
                        if (!guildData || typeof guildData !== 'object') continue;

                        let updated = true;
                        const newGuildData = { ...guildData };

                        for (const [userKey, userValue] of Object.entries(guildData)) {
                            let newUserKey = null;

                            // Sanitize userKey for comparison by replacing dots with underscores in the username part before underscore
                            const underscoreIndex = userKey.lastIndexOf('_');
                            if (underscoreIndex === -1) continue;

                            const userKeyUsernamePart = userKey.substring(0, underscoreIndex).replace(/\./g, '_');
                            const userKeyIdPart = userKey.substring(underscoreIndex + 1);

                            // Rebuild sanitized userKey for comparison
                            const sanitizedUserKey = `${userKeyUsernamePart}_${userKeyIdPart}`;

                            // Check if userKey matches old username pattern (sanitized)
                            if (sanitizedUserKey === oldUsername) {
                                newUserKey = newUsername;
                            } else if (sanitizedUserKey === oldKeyBase) {
                                newUserKey = newKeyBase;
                            } else if (userKeyUsernamePart === oldUsername && userKey.startsWith(`${oldUsername}_`)) {
                                // Key starts with old username sanitized
                                const suffix = userKey.slice(oldUsername.length + 1);
                                newUserKey = `${newUsername}_${suffix}`;
                            }

                            if (newUserKey !== null) {
                                updated = true;

                                // Transfer value to new key, also update username mentions inside strings or objects
                                let newValue = userValue;

                                if (typeof userValue === 'string' && userValue.includes(oldUsernameRaw)) {
                                    newValue = userValue.replaceAll(oldUsernameRaw, newUsernameRaw);
                                } else if (typeof userValue === 'object' && userValue !== null) {
                                    const valueStr = JSON.stringify(userValue);
                                    if (valueStr.includes(oldUsernameRaw)) {
                                        newValue = JSON.parse(valueStr.replaceAll(oldUsernameRaw, newUsernameRaw));
                                    }
                                }

                                newGuildData[newUserKey] = newValue;
                                delete newGuildData[userKey];

                                console.log(`[UserUpdate] [${dbName}] Updated key in ${guildKey}: ${userKey} → ${newUserKey}`);
                            }
                        }

                        if (updated) {
                            await database.set(guildKey, newGuildData);
                            console.log(`[UserUpdate] [${dbName}] Guild data updated: ${guildKey}`);
                        }
                    }
                } catch (err) {
                    console.error(`[UserUpdate] [${dbName}] Error:`, err);
                }
            }
        }
    },
};
