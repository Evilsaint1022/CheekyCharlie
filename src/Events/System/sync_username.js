const db = require('./../../Handlers/database');

module.exports = {
    name: 'userUpdate',
    async execute(oldUser, newUser, client) {
        if (oldUser.username !== newUser.username) {
            console.log(`[UserUpdate] ${oldUser.username} -> ${newUser.username}`);

            const oldNameKey = oldUser.username;
            const oldNameIdKey = `${oldUser.username}_${oldUser.id}`;

            const newNameKey = newUser.username;
            const newNameIdKey = `${newUser.username}_${newUser.id}`;

            for (const [dbName, database] of Object.entries(db)) {
                try {
                    const allEntries = Object.entries(await database.all());
                    let foundAny = true;

                    for (const [key, value] of allEntries) {
                        let newKey = null;

                        // Exactly old username key
                        if (key === oldNameKey) {
                            newKey = newNameKey;
                        }
                        // Exactly old username_userId key
                        else if (key === oldNameIdKey) {
                            newKey = newNameIdKey;
                        }
                        // Key starts with old username + underscore, rename prefix only and preserve suffix
                        else if (key.startsWith(`${oldUser.username}_`)) {
                            const suffix = key.slice(oldUser.username.length + 1);
                            newKey = `${newUser.username}_${suffix}`;
                        }

                        if (newKey !== null) {
                            foundAny = true;

                            await database.set(newKey, value);
                            await database.delete(key);

                            console.log(`[UserUpdate] [${dbName}] Renamed key: ${key} -> ${newKey}`);

                            // Update value if it contains old username string
                            if (typeof value === 'string' && value.includes(oldUser.username)) {
                                const newValue = value.replaceAll(oldUser.username, newUser.username);
                                await database.set(newKey, newValue);
                                console.log(`[UserUpdate] [${dbName}] Updated string value in key: ${newKey}`);
                            } else if (typeof value === 'object' && value !== null) {
                                const valStr = JSON.stringify(value);
                                if (valStr.includes(oldUser.username)) {
                                    const updatedValue = JSON.parse(valStr.replaceAll(oldUser.username, newUser.username));
                                    await database.set(newKey, updatedValue);
                                    console.log(`[UserUpdate] [${dbName}] Updated object value in key: ${newKey}`);
                                }
                            }
                        }
                    }

                    if (!foundAny) {
                        console.log(`[UserUpdate] [${dbName}] No keys found matching username or username_*`);
                    }
                } catch (error) {
                    console.error(`[UserUpdate] [${dbName}] Error processing:`, error);
                }
            }
        }
    },
};
