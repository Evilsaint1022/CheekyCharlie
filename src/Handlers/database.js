const DotDB = require("dotdatabase").default;

const db = {
    whitelisted: new DotDB("./src/Utilities/Storage/Settings/whitelisted.json"),
    economy: new DotDB("./src/Utilities/Storage/Global/Economy/economy.json"),
    levels: new DotDB("./src/Utilities/Storage/Global/Economy/levels.json"),
    settings: new DotDB(`./src/Utilities/Storage/Settings/settings.json`),
    starboard: new DotDB("./src/Utilities/Storage/Settings/starboardsettings.json"),
}   

module.exports = db;