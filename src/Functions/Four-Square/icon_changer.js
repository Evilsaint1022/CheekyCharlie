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
const CronTime = "0 5 * * *"; // Runs at 5am everyday to check
// -----------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------
// Icons Fetch
const DefaultIcon = path.join(__dirname, `../../Utilities/Four-Square/Icons/foursquare_icon.png`)
const HalloweenIcon = path.join(__dirname,'../../Utilities/Four-Square/Icons/foursquare_halloween_icon.png');

// -----------------------------------------------------------------------------------------------------
// Fetching existing Settings
const settings = db.settings.get(`${GuildId}`) || {};
let DefaultIconUpdated = settings.DefaultIconUpdated || false;
let HalloweenUpdated = settings.HalloweenUpdated || false;
// -----------------------------------------------------------------------------------------------------

async function Icon_Changer(client) {

    const date = new Date().toLocaleDateString('en-NZ', {
        month: '2-digit',
    });

    // -----------------------------------------------------------------------------------------------------
    try {
        guild = await client.guilds.fetch(GuildId);
    if (!guild) {
        console.log('[❌] [SERVER-ICON] Guild not found.');
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
        // console.log(`[✅] [SERVER-ICON] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Has already Ran and changes have already been made.`)
        return;
    }

    // If its October and has not already run...
    if (halloween) try {
        await guild.setIcon(HalloweenIcon);
        await db.settings.set(`${GuildId}.HalloweenUpdated`, true);
        await db.settings.delete(`${GuildId}.DefaultIconUpdated`, false)
        console.log(`[✅] [SERVER-ICON] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Updated icon to the Halloween Themed Icon.`);
        return;
     } catch (error) {
        console.error(
            '[❌] [SERVER-ICON] Failed to update:',
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
    //console.log(`[✅] [SERVER-ICON] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Has already Ran and changes have already been made.`)
    return;
    }

    // Else the Default Icon Gets Set.
    if (!events && DefaultIconUpdated == false ) {
        await guild.setIcon(DefaultIcon);
        await db.settings.delete(`${GuildId}.HalloweenUpdated`, false);
        await db.settings.set(`${GuildId}.DefaultIconUpdated`, true);
        console.log(`[✅] [SERVER-ICON] [${new Date().toLocaleDateString("en-NZ", {timeZone: 'Pacific/Auckland'})}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guild.name} ${guild.id} Updated icon to the Default Icon.`);
        return;
    }
    };
    // -----------------------------------------------------------------------------------------------------
    // Cron Timer & Exporting the Function.
    module.exports = {
        name: 'Icon_Changer',
        execute(client) {
            cron.schedule(
                CronTime,
                () => Icon_Changer(client),
                {
                    timezone: 'Pacific/Auckland'
                }
            );
        }
    };
    // -----------------------------------------------------------------------------------------------------

    // Function Exporting.
    module.exports = Icon_Changer;