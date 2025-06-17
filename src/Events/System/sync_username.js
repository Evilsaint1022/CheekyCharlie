const db = require('./../../Handlers/database');

module.exports = {
    name: 'userUpdate',
    async execute(oldUser, newUser, client) {
        // Only proceed if username changed
        if (oldUser.username !== newUser.username) {
            const oldUsernameRaw = oldUser.username;
            const newUsernameRaw = newUser.username;

            const oldUsername = oldUsernameRaw.replace(/\./g, '_');
            const newUsername = newUsernameRaw.replace(/\./g, '_');

            console.log(`[UserUpdate] ${oldUsernameRaw} -> ${newUsernameRaw} (sanitized: ${oldUsername} -> ${newUsername})`);

            const oldKeyBase = `${oldUsername}_${oldUser.id}`;
            const newKeyBase = `${newUsername}_${newUser.id}`;

            for (const [dbName, database] of Object.entries(db)) {
                try {
                    const allData = await database.all();

                    for (const [guildKey, guildData] of Object.entries(allData)) {
                        if (!guildData || typeof guildData !== 'object') continue;

                        let changesMade = false;
                        const newGuildData = { ...guildData };

                        for (const [userKey, userValue] of Object.entries(guildData)) {
                            let newUserKey = null;

                            const underscoreIndex = userKey.lastIndexOf('_');
                            if (underscoreIndex === -1) continue;

                            const userKeyUsernamePart = userKey.substring(0, underscoreIndex).replace(/\./g, '_');
                            const userKeyIdPart = userKey.substring(underscoreIndex + 1);
                            const sanitizedUserKey = `${userKeyUsernamePart}_${userKeyIdPart}`;

                            // Match top-level keys
                            if (sanitizedUserKey === oldKeyBase || userKey === oldUsername || userKey === oldKeyBase) {
                                if (userKey === oldUsername) {
                                    newUserKey = newUsername;
                                } else if (userKey === oldKeyBase || sanitizedUserKey === oldKeyBase) {
                                    newUserKey = newKeyBase;
                                }

                                if (newUserKey !== null && newUserKey !== userKey) {
                                    changesMade = true;

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

                            // ✅ NEW: Look inside nested objects for username keys
                            if (typeof userValue === 'object' && userValue !== null) {
                                const newInnerData = { ...userValue };
                                let innerChanges = false;

                                for (const [innerKey, innerVal] of Object.entries(userValue)) {
                                    const innerUnderscoreIndex = innerKey.lastIndexOf('_');
                                    if (innerUnderscoreIndex === -1) continue;

                                    const innerUsernamePart = innerKey.substring(0, innerUnderscoreIndex).replace(/\./g, '_');
                                    const innerIdPart = innerKey.substring(innerUnderscoreIndex + 1);
                                    const innerSanitizedKey = `${innerUsernamePart}_${innerIdPart}`;

                                    if (innerSanitizedKey === oldKeyBase || innerKey === oldUsername || innerKey === oldKeyBase) {
                                        const newInnerKey = (innerKey === oldUsername) ? newUsername : newKeyBase;

                                        let newInnerVal = innerVal;

                                        if (typeof innerVal === 'string' && innerVal.includes(oldUsernameRaw)) {
                                            newInnerVal = innerVal.replaceAll(oldUsernameRaw, newUsernameRaw);
                                        } else if (typeof innerVal === 'object' && innerVal !== null) {
                                            const valStr = JSON.stringify(innerVal);
                                            if (valStr.includes(oldUsernameRaw)) {
                                                newInnerVal = JSON.parse(valStr.replaceAll(oldUsernameRaw, newUsernameRaw));
                                            }
                                        }

                                        newInnerData[newInnerKey] = newInnerVal;
                                        delete newInnerData[innerKey];
                                        innerChanges = true;

                                        console.log(`[UserUpdate] [${dbName}] Updated nested key in ${guildKey}/${userKey}: ${innerKey} → ${newInnerKey}`);
                                    }
                                }

                                if (innerChanges) {
                                    newGuildData[userKey] = newInnerData;
                                    changesMade = true;
                                }
                            }
                        }

                        if (changesMade) {
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
