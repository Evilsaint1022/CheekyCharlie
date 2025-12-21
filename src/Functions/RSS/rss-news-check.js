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

            if (working) return;

            working = true;

            const clientGuilds = await client.guilds.cache.map(guild => ({ name: guild.name, id: guild.id }));

            for (const guild of clientGuilds) {

                const serverName = guild.name;
                const serverId   = guild.id;

                const rssChannel = await db.settings.get(`${serverId}.rssNewsChannel`);

                if (!rssChannel) continue;

                const rssTopics = await db.settings.get(`${serverId}.rssTopics`);
                if (  !rssTopics || !Array.isArray(rssTopics) || rssTopics.length === 0 ) continue;

                for ( const topic of rssTopics ) {
                    if ( !topic || !topic.url || !topic.name || typeof topic.url !== 'string' ) {
                        console.error(`[RSS] Invalid topic or URL for server: ${serverName} (${serverId})`);
                        continue;
                    }

                    const newRssItems = await fetchRSS(serverId, serverName, topic.url);

                    if ( !Array.isArray(newRssItems) || newRssItems.length === 0 ) continue;

                    for (const newItem of newRssItems) {
                        const channel = client.channels.cache.get(rssChannel);

                        if (!channel) {
                            console.error(`[RSS] Invalid channel for server: ${serverName} (${serverId})`);
                            continue;
                        }

                        await channel.send(`# **[${newItem.title}](${newItem.url})**`);

                        console.log(`[RSS] Sent RSS link to ${serverName} (${serverId}): ${newItem.url}`);
                    }
                }

            }

            working = false;

        } catch (error) {
            console.error('Error checking RSS feeds:', error);
            working = false;
        }

    }, 1000);

}

module.exports = runRSSNews;
