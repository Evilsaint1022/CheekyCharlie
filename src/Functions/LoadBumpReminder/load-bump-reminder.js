// @ts-check
const { Client, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../../Handlers/database');

/**
 * @param {Client} client
 */
async function loadBumpReminder(client) {

    const testtimer = 10 * 1000; // --> 10 seconds for testing
    const reminderDelay = 2 * 60 * 60 * 1000;
    
    const guildIds = Array.from(await client.guilds.cache.keys());

    for ( const guildId of guildIds ) {
        const bumpSettings = await db.bump.get(guildId)
        if ( !bumpSettings || !bumpSettings.channelId ) return;

        const lastBumpTimestamp = await db.lastbump.get(guildId + ".timestamp");
        const now = Date.now();

        if (lastBumpTimestamp && (now - lastBumpTimestamp > reminderDelay)) {
            const channel = await client.channels.cache.get(bumpSettings.channelId);

            if (channel && channel.type === ChannelType.GuildText) {

                const guild = await client.guilds.fetch(guildId);
                const bumpInfo = await db.lastbump.get(guildId);

                const mention = bumpSettings.roleId ? `<@&${bumpSettings.roleId}>` : `<@${bumpInfo.userId}>`;

                const guildName = guild?.name || "Unknown Guild";    

                console.log(`[⬆️] [BUMP REMINDER] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} - Bump Has been Sent in ${channel.name} ${channel.id}`);
                
                const bumpreminder = new EmbedBuilder()
                    .setDescription(`## 🌿 **__It's Time to Bump!__** 🌿\n**_Its been 2 hours and its time to bump again!_**\n- **_\`You can bump by using the /bump command\`_**\nㅤ\n**_Just a Friendly Reminder ${mention}_** ❤️`)
                    .setColor(0x207e37)
                    .setThumbnail(guild.iconURL())

                await channel.send({ content: mention, embeds: [bumpreminder] });

            }
        }

    }

}

/**
 * @param {Client} client
 */
module.exports = async (client) => {
    setTimeout(() => {
        loadBumpReminder(client);
    }, 1500);
};
