const db = require('./../../Handlers/database');

module.exports = {
  name: 'userUpdate',
  async execute(oldUser, newUser, client) {
    if (oldUser.username === newUser.username) return;

    const oldUsernameRaw = oldUser.username;
    const newUsernameRaw = newUser.username;

    const oldUsername = oldUsernameRaw.replace(/\./g, '_');
    const newUsername = newUsernameRaw.replace(/\./g, '_');

    const oldKeyBase = `${oldUsername}_${oldUser.id}`;
    const newKeyBase = `${newUsername}_${newUser.id}`;

    // Skip databases that shouldnt sync usernames
    const excludedDatabases = ['starboard', 'starboardids', 'staff_app_questions', 'staff_app_applications'];

    for (const [dbName, database] of Object.entries(db)) {
      if (excludedDatabases.includes(dbName)) {
        console.log(`[UserUpdate] [${dbName}] Skipping (excluded from username sync)`);
        continue;
      }

      try {
        
        const allData = await database.all();

        for (const [guildKey, guildData] of Object.entries(allData)) {
          let dataModified = false;
          let newGuildData = { ...guildData };

          // ✳️ Handle top-level keys that are user keys (Balances/Bank)
          if (guildKey === oldKeyBase || guildKey === oldUsername) {
            const updatedValue = (typeof guildData === 'object')
              ? JSON.parse(JSON.stringify(guildData).replaceAll(oldUsernameRaw, newUsernameRaw))
              : guildData;

            const newTopKey = guildKey === oldUsername ? newUsername : newKeyBase;

            if (JSON.stringify(guildData) !== JSON.stringify(updatedValue)) {
              await database.delete(guildKey);
              await database.set(newTopKey, updatedValue);
              console.log(`[UserUpdate] [${dbName}] Renamed key: ${guildKey} → ${newTopKey}`);
            }

            continue;
          }

          // ✳️ Handle Starboard-style composite keys: Guild_Username_ID
          if (guildKey.includes(oldUsername)) {
            const newKey = guildKey.replaceAll(oldUsername, newUsername);
            const newValue = typeof guildData === 'string'
              ? guildData.replaceAll(oldUsernameRaw, newUsernameRaw)
              : guildData;

            if (guildKey !== newKey || JSON.stringify(guildData) !== JSON.stringify(newValue)) {
              await database.delete(guildKey);
              await database.set(newKey, newValue);
              console.log(`[UserUpdate] [${dbName}] Updated composite key: ${guildKey} → ${newKey}`);
            }

            continue;
          }

          // ✳️ Handle nested keys like Levels
          for (const [userKey, userValue] of Object.entries(guildData)) {
            let hasChange = false;
            let newUserKey = userKey;
            let updatedUserValue = userValue;

            // Check if the userKey matches the old pattern
            const underscoreIdx = userKey.lastIndexOf('_');
            if (underscoreIdx !== -1) {
              const namePart = userKey.substring(0, underscoreIdx).replace(/\./g, '_');
              const idPart = userKey.substring(underscoreIdx + 1);

              if (`${namePart}_${idPart}` === oldKeyBase) {
                newUserKey = newKeyBase;
                hasChange = true;
              }
            }

            // Check inside the value for username mentions
            const valueStr = JSON.stringify(userValue);
            if (valueStr.includes(oldUsernameRaw)) {
              updatedUserValue = JSON.parse(valueStr.replaceAll(oldUsernameRaw, newUsernameRaw));
              hasChange = true;
            }

            if (hasChange) {
              if (newUserKey !== userKey) delete newGuildData[userKey];
              newGuildData[newUserKey] = updatedUserValue;
              dataModified = true;

              console.log(`[UserUpdate] [${dbName}] Updated ${userKey} → ${newUserKey}`);
            }
          }

          if (dataModified) {
            await database.set(guildKey, newGuildData);
            console.log(`[UserUpdate] [${dbName}] Saved modified data for ${guildKey}`);
          }
        }
      } catch (err) {
        console.error(`[UserUpdate] [${dbName}] Error:`, err);
      }
    }
  },
};
