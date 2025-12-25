const DotDB = require("dotdatabase").default;

const db = {

    // Owners ID's DataBase -------------------------------------------------------------------------
    owners: new DotDB("./src/Utilities/Storage/Settings/Owners/owners.json"),
    
    // -----------------------------------------------------------------------------------------
    vc: new DotDB("./src/Utilities/Storage/Settings/VoiceChannels/vc.json"),
    vcmembers: new DotDB("./src/Utilities/Storage/Settings/VoiceChannels/vcmembers.json"),
    whitelisted: new DotDB("./src/Utilities/Storage/Settings/Whitelisted/whitelisted.json"),
    wallet: new DotDB("./src/Utilities/Storage/Economy/Balance/balance.json"),
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
    onewordstory: new DotDB("./src/Utilities/Storage/Settings/OneWordStory/onewordstory.json"),
    staff_app_questions: new DotDB("./src/Utilities/Storage/Staff/questions.json"),
    staff_app_applications: new DotDB("./src/Utilities/Storage/Staff/applications.json"),
    ai_deadchat: new DotDB("./src/Utilities/Storage/AI-Deadchat/ai-deadchat.json"),
    giveaways: new DotDB("./src/Utilities/Storage/Giveaways/giveaways.json"),
    giveaway_participants: new DotDB("./src/Utilities/Storage/Giveaways/participants.json"),
    giveaway_settings: new DotDB("./src/Utilities/Storage/Giveaways/settings.json"),
    specials: new DotDB("./src/Utilities/Storage/Settings/Specials/Specials.json"),
    qotd: new DotDB("./src/Utilities/Storage/Settings/Qotd/lastqotd.json"),
    slapgifs: new DotDB("./src/Utilities/Storage/Fallback/slapgifs.json"),
    kissgifs: new DotDB("./src/Utilities/Storage/Fallback/kissgifs.json"),
    kickgifs: new DotDB("./src/Utilities/Storage/Fallback/kickgifs.json"),
    huggifs: new DotDB("./src/Utilities/Storage/Fallback/huggifs.json"),
    ticklegifs: new DotDB("./src/Utilities/Storage/Fallback/ticklegifs.json"),
    fun_counters: new DotDB("./src/Utilities/Storage/Settings/Fun/counters.json"),
    members: new DotDB("./src/Utilities/Storage/Settings/JoinedMembers/joinedmembers.json"),
    bumpcounter: new DotDB("./src/Utilities/Storage/Settings/Bump/bumpcounter.json")
}

module.exports = db;
