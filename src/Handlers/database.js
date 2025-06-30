const DotDB = require("dotdatabase").default;

const db = {

    // Owners ID's DataBase -------------------------------------------------------------------------
    owners: new DotDB("./src/Utilities/Owners/owners.json"),
    
    // -----------------------------------------------------------------------------------------
    vc: new DotDB("./src/Utilities/Storage/Settings/VoiceChannels/vc.json"),
    whitelisted: new DotDB("./src/Utilities/Storage/Settings/Whitelisted/whitelisted.json"),
    balance: new DotDB("./src/Utilities/Storage/Global/Economy/Balance/balance.json"),
    bank: new DotDB("./src/Utilities/Storage/Global/Economy/Bank/bank.json"),
    levels: new DotDB("./src/Utilities/Storage/Levels/levels.json"),
    levelroles: new DotDB("./src/Utilities/Storage/Levels/levelroles.json"),
    settings: new DotDB(`./src/Utilities/Storage/Settings/settings.json`),
    starboard: new DotDB("./src/Utilities/Storage/Settings/Starboard/starboardsettings.json"),
    starboardids: new DotDB("./src/Utilities/Storage/Settings/Starboard/Starboard_Ids.json"),
    lastclaim: new DotDB("./src/Utilities/Storage/Settings/LastClaim/lastclaim.json"),
    bump: new DotDB("./src/Utilities/Storage/Settings/Bump/bumpsettings.json"),
    bumpcooldown: new DotDB("./src/Utilities/Storage/Settings/Bump/bumpcooldown.json"),
    lastbump: new DotDB("./src/Utilities/Storage/Settings/Bump/lastbump.json"),
    ai_history: new DotDB("./src/Utilities/Storage/Settings/AI/ai_history.json"),
    ai_nsfw_training: new DotDB("./src/Utilities/Storage/Settings/AI/ai_nsfw_training.json"),
    shop: new DotDB("./src/Utilities/Storage/Shop/shop.json"),
    inventory: new DotDB("./src/Utilities/Storage/Inventory/inventory.json"),
}

module.exports = db;