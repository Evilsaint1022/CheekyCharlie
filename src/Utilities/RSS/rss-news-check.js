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

                const rssChannel = await db.rss.get(`${serverName}_${serverId}_rssNewsChannel`);

                if (!rssChannel) continue;

                const newRssItems = await fetchRSS(serverId);

                if (newRssItems.length === 0) continue;

                for (const newItem of newRssItems) {
                const channel = client.channels.cache.get(rssChannel);

                if (!channel) continue;

            await channel.send(`# **__${newItem.title}__**\n${newItem.url}`);

            console.log(`[RSS] Sent RSS link to ${serverName} (${serverId}): ${newItem.url}`);
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
