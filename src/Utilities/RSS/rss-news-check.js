const db       = require("../../Handlers/database");
const fetchRSS = require("./fetch-rss-feed");
const { Client } = require("discord.js");

/**
 * 
 * @param {Client} client 
 */
async function runRSSNews(client) {

    let working = false;
    
    setInterval(async () => {

        try {

            if ( working == true ) {
                console.log("[RSS] Already working on fetching RSS feeds. Skipping this cycle.");
                return;
            }

            working = true;

            const clientGuilds = await client.guilds.cache.map(guild => ({ name: guild.name, id: guild.id }));

            for ( const guild of clientGuilds ) {

                const serverName = guild.name;
                const serverId   = guild.id;

                const rssChannel = await db.rss.get(`${serverName}_${serverId}_rssNewsChannel`);

                if ( !rssChannel ) {
                    console.log(`[RSS] No RSS channel set for ${serverName} (${serverId}). Skipping...`);
                    continue;
                }

                const newRssItems = await fetchRSS(serverId);

                if ( newRssItems.length === 0 ) {

                    console.log(`[RSS] No new RSS items found for ${serverName} (${serverId}). Skipping...`);

                }

                for ( const newItem of newRssItems ) {

                    const channel = client.channels.cache.get(rssChannel);

                    if ( !channel ) {
                        console.log(`[RSS] Channel ${rssChannel} not found in ${serverName} (${serverId}). Skipping...`);
                        continue;
                    }

                    await channel.send({
                        embeds: [{
                            title: newItem.title,
                            url: newItem.link,
                            description: newItem.desc || "`No description available.`",
                            timestamp: newItem.time,
                        }]
                    });

                    console.log(`[RSS] Sent RSS item to ${serverName} (${serverId}): ${newItem.title}`);

                }

            }

            working = false;

        } catch (error) {
            console.error('Error checking RSS feeds:', error);
        }

    }, 1000);

}

module.exports = runRSSNews;