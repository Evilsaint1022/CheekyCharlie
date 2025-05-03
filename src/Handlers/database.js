const DotDB = require("dotdatabase").default;

const db = {
    vc: new DotDB("./src/Utilities/Storage/Settings/VoiceChannels/vc.json"),
    whitelisted: new DotDB("./src/Utilities/Storage/Settings/Whitelisted/whitelisted.json"),
    balance: new DotDB("./src/Utilities/Storage/Global/Economy/Balance/balance.json"),
    bank: new DotDB("./src/Utilities/Storage/Global/Economy/Bank/bank.json"),
    levels: new DotDB("./src/Utilities/Storage/Levels/levels.json"),
    settings: new DotDB(`./src/Utilities/Storage/Settings/settings.json`),
    starboard: new DotDB("./src/Utilities/Storage/Settings/Starboard/starboardsettings.json"),
    lastclaim: new DotDB("./src/Utilities/Storage/Settings/LastClaim/lastclaim.json"),
}   

module.exports = db;