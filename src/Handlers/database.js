const DotDB = require("dotdatabase").default;

const db = {

    // Owners ID's DataBase -------------------------------------------------------------------------
    owners: new DotDB("./src/Utilities/Storage/Settings/Owners/owners.json"),
    
    // -----------------------------------------------------------------------------------------
    vc: new DotDB("./src/Utilities/Storage/Settings/VoiceChannels/vc.json"),
    whitelisted: new DotDB("./src/Utilities/Storage/Settings/Whitelisted/whitelisted.json"),
    balance: new DotDB("./src/Utilities/Storage/Economy/Balance/balance.json"),
    bank: new DotDB("./src/Utilities/Storage/Economy/Bank/bank.json"),
    levels: new DotDB("./src/Utilities/Storage/Economy/Levels/levels.json"),
    levelroles: new DotDB("./src/Utilities/Storage/Settings/LevelRoles/levelroles.json"),
    settings: new DotDB(`./src/Utilities/Storage/Settings/settings.json`),
    starboard: new DotDB("./src/Utilities/Storage/Settings/Starboard/starboardsettings.json"),
    starboardids: new DotDB("./src/Utilities/Storage/Settings/Starboard/Starboard_Ids.json"),
    lastclaim: new DotDB("./src/Utilities/Storage/Settings/LastClaim/lastclaim.json"),
    bump: new DotDB("./src/Utilities/Storage/Settings/Bump/bumpsettings.json"),
    lastbump: new DotDB("./src/Utilities/Storage/Settings/Bump/lastbump.json"),
    ai_history: new DotDB("./src/Utilities/Storage/Settings/AI/ai_history.json"),
    ai_nsfw_training: new DotDB("./src/Utilities/Storage/Settings/AI/ai_nsfw_training.json"),
    shop: new DotDB("./src/Utilities/Storage/Economy/Shop/shop.json"),
    inventory: new DotDB("./src/Utilities/Storage/Economy/Inventory/inventory.json"),
    rss: new DotDB("./src/Utilities/Storage/Settings/Rss/rss.json"),
    counting: new DotDB("./src/Utilities/Storage/Settings/Counting/counting.json"),
    countingemojis: new DotDB("./src/Utilities/Storage/Settings/Counting/countingemojis.json"),
    github: new DotDB("./src/Utilities/Storage/Settings/Github/github.json"),
    coloroftheweek: new DotDB("./src/Utilities/Storage/Settings/ColoroftheWeek/cotw.json"),
    cooldowns: new DotDB("./src/Utilities/Storage/Settings/Cooldowns/cooldowns.json"),
    lastban: new DotDB("./src/Utilities/Storage/Settings/BanCount/lastban.json"),
    
}

module.exports = db;