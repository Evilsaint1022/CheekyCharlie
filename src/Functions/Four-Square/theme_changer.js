const path = require('path');
const cron = require('node-cron');
const db = require("../../Handlers/database");

// -----------------------------------------------------------------------------------------------------
// Testing Code Section:
// const GuildId = "1502175645801906216";
// const CronTime = "*/1 * * * *"; // Every minute
// -----------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------
// Production Code:
const GuildId = "1495254374971084961";
const CronTime = "0 * * * *"; // Runs every hour to check if its active or not.
// -----------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------
// CheekyCharlie Icons Fetch
const DefaultBotIcon = path.join(__dirname, `../../Utilities/CheekyCharlie/Icons/cheekycharlie.png`)
const HalloweenBotIcon = path.join (__dirname, `../../Utilities/CheekyCharlie/Icons/cheekycharlie_halloween.png`)
// -----------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------
// CheekyCharlie Banner Fetch
const DefaultBotBanner = path.join(__dirname, `../../Utilities/CheekyCharlie/Banners/defaultbanner.png`)
const HalloweenBotBanner = path.join(__dirname, `../../Utilities/CheekyCharlie/Banners/halloweenbanner.png`)
// -----------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------
// Support Server Icons Fetch
const DefaultIcon = path.join(__dirname, `../../Utilities/Four-Square/Icons/foursquare_icon.png`)
const HalloweenIcon = path.join(__dirname,'../../Utilities/Four-Square/Icons/foursquare_halloween_icon.png');
// -----------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------
// Fetching existing Settings
const settings = db.settings.get(`${GuildId}`) || {};
let DefaultIconUpdated = settings.DefaultIconUpdated || false;
let HalloweenUpdated = settings.HalloweenUpdated || false;
// -----------------------------------------------------------------------------------------------------

async function Theme_Changer(client) {

    const date = new Date().toLocaleDateString('en-NZ', {
        month: '2-digit',
    });

    // -----------------------------------------------------------------------------------------------------
    try {
        guild = await client.guilds.fetch(GuildId);
    if (!guild) {
        console.log('[❌] [THEME-CHANGER] Guild not found.');
        return;
    };
    } catch (error) {
        return;
    };
    // -----------------------------------------------------------------------------------------------------

    // -----------------------------------------------------------------------------------------------------
    // Declared Dates for the Events
    const halloween = await (date == `10`);
    // -----------------------------------------------------------------------------------------------------

    // -----------------------------------------------------------------------------------------------------
    let events = halloween
    // -----------------------------------------------------------------------------------------------------

    // -----------------------------------------------------------------------------------------------------
    // Checks if halloween has already Run.
    if (halloween && HalloweenUpdated == true) {
        // console.log(`[✅] [THEME-CHANGER] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Has already Ran and changes have already been made.`)
        return;
    }

    // If its October and has not already run...
    if (halloween) try {
        await guild.setIcon(HalloweenIcon);
        await client.user.setAvatar(HalloweenBotIcon);
        await client.user.setBanner(HalloweenBotBanner);
        await db.settings.set(`${GuildId}.HalloweenUpdated`, true);
        await db.settings.delete(`${GuildId}.DefaultIconUpdated`, false)
        console.log(`[✅] [THEME-CHANGER] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Updated to the Halloween Themed.`);
        return;
     } catch (error) {
        console.error(
            '[❌] [THEME-CHANGER] Failed to update:',
            error
        );
    }
    // -----------------------------------------------------------------------------------------------------
    //
    // ELSE RESORTS TO SETTING THE ICON BACK TO NORMAL AGAIN!!!
    //
    // -----------------------------------------------------------------------------------------------------
    // Checks if DefaulIcon has already Ran.
    if (!events && DefaultIconUpdated == true) {
    //console.log(`[✅] [THEME-CHANGER] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Has already Ran and changes have already been made.`)
    return;
    }

    // Else the Default Icon Gets Set.
    if (!events && DefaultIconUpdated == false ) {
        await guild.setIcon(DefaultIcon);
        await client.user.setAvatar(DefaultBotIcon);
        await client.user.setBanner(DefaultBotBanner);
        await db.settings.delete(`${GuildId}.HalloweenUpdated`, false);
        await db.settings.set(`${GuildId}.DefaultIconUpdated`, true);
        console.log(`[✅] [THEME-CHANGER] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Updated to the Default Theme.`);
        return;
    }
    };
    // -----------------------------------------------------------------------------------------------------
    // Cron Timer & Exporting the Function.
    module.exports = {
        name: 'Theme_Changer',
        execute(client) {
            cron.schedule(
                CronTime,
                () => Theme_Changer(client),
                {
                    timezone: 'Pacific/Auckland'
                }
            );
        }
    };
    // -----------------------------------------------------------------------------------------------------

    // Function Exporting.
    module.exports = Theme_Changer;