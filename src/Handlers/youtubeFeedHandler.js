const db = require('./database');

// -----------------------------------------------------------------------------------------------------
// Production Configuration
const CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes.
const INITIAL_VIDEO_LIMIT = 5;

// Dev Testing Configuration
// const CHECK_INTERVAL = 1 * 60 * 1000; // Check every 1 minutes.
// const INITIAL_VIDEO_LIMIT = 5;

// Cache resolved YouTube handles.
const YouTubeChannelCache = new Map();

// -----------------------------------------------------------------------------------------------------
// Resolve YouTube Handle into Channel ID

async function ResolveYouTubeChannel(YouTubeHandle) {

    // Already a Channel ID.
    if (/^UC[\w-]{22}$/.test(YouTubeHandle)) {
        return YouTubeHandle;
    }

    // Check cache.
    if (YouTubeChannelCache.has(YouTubeHandle)) {
        return YouTubeChannelCache.get(YouTubeHandle);
    }

    const Handle = YouTubeHandle.startsWith('@')
        ? YouTubeHandle
        : `@${YouTubeHandle}`;

    const ChannelURL = `https://www.youtube.com/${Handle}`;

    const Response = await fetch(ChannelURL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(15000)
    });

    if (!Response.ok) {
        throw new Error(
            `Failed to resolve YouTube handle ${Handle}: HTTP ${Response.status}`
        );
    }

    const HTML = await Response.text();

    // Extract the actual YouTube Channel ID.
    const ChannelId =
        HTML.match(/<meta[^>]+itemprop="channelId"[^>]+content="(UC[\w-]{22})"/)?.[1] ||
        HTML.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/)?.[1] ||
        HTML.match(/"channelId"\s*:\s*"(UC[\w-]{22})"/)?.[1] ||
        HTML.match(/\/channel\/(UC[\w-]{22})/)?.[1];

    if (!ChannelId) {
        throw new Error(`Could not find Channel ID for ${Handle}`);
    }

    // Cache resolved Channel ID.
    YouTubeChannelCache.set(YouTubeHandle, ChannelId);

    // console.log(`[YOUTUBE-FEED] Resolved ${Handle} -> ${ChannelId}`);

    return ChannelId;
}

// -----------------------------------------------------------------------------------------------------
// Fetch YouTube RSS Feed

async function FetchYouTubeVideos(YouTubeHandle) {

    // Resolve handle into Channel ID.
    const ChannelId = await ResolveYouTubeChannel(YouTubeHandle);

    const FeedURL = `https://www.youtube.com/feeds/videos.xml?channel_id=${ChannelId}`;

    const Response = await fetch(FeedURL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CheekyCharlie/1.0)',
            'Accept': 'application/atom+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(15000)
    });

    if (!Response.ok) {
        throw new Error(
            `YouTube RSS returned HTTP ${Response.status} for ${YouTubeHandle} (${ChannelId})`
        );
    }

    const XML = await Response.text();

    // Dev Testing ----------------------------------------------------------------------
    // console.log('[YOUTUBE-FEED] RSS response received.');
    // console.log('[YOUTUBE-FEED] RSS contains entries:', XML.includes('<entry>'));
    // console.log('[YOUTUBE-FEED] RSS response length:', XML.length);
    // -----------------------------------------------------------------------------------

    const Videos = [];
    const Entries = XML.match(/<entry>[\s\S]*?<\/entry>/g) || [];

    for (const Entry of Entries) {

        const VideoId = Entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];

        if (!VideoId) continue;

        Videos.push({
            videoId: VideoId,
            title: Entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || 'New YouTube Video',
            link: `https://www.youtube.com/watch?v=${VideoId}`,
            published: Entry.match(/<published>(.*?)<\/published>/)?.[1] || null
        });
    }

    return Videos;
}

// -----------------------------------------------------------------------------------------------------
// Check YouTube Feeds

async function CheckYouTubeFeeds(client) {

    // console.log('[🔴] [YOUTUBE-FEED] Checking YouTube feeds...');

    try {

        // Get all guilds the bot is currently in.
        for (const Guild of client.guilds.cache.values()) {

            const GuildId = Guild.id;

            // Retrieve this guild's YouTube feeds.
            const YouTubeChannels = await db.youtube.get(GuildId);

            if (!Array.isArray(YouTubeChannels)) continue;

            for (const Feed of YouTubeChannels) {

                try {

                    const {
                        youtubeChannelId,
                        discordChannelId
                    } = Feed;

                    if (!youtubeChannelId || !discordChannelId) continue;

                    // Find Discord destination channel.
                    const DiscordChannel = await client.channels.fetch(discordChannelId)
                        .catch(() => null);

                    if (
                        !DiscordChannel ||
                        !DiscordChannel.isTextBased() ||
                        typeof DiscordChannel.send !== 'function'
                    ) {
                        // console.log(`[🔴] [YOUTUBE-FEED] Invalid Discord channel: ${discordChannelId}`);
                        continue;
                    }

                    // Retrieve YouTube videos.
                    const Videos = await FetchYouTubeVideos(youtubeChannelId);

                    // console log for testing.
                    // console.log(`[🔴] [YOUTUBE-FEED] Retrieved ${Videos.length} videos for ${youtubeChannelId}.`);

                    if (!Videos.length) continue;

                    // Database key for this guild and YouTube channel.
                    const DatabaseKey = `${GuildId}.${youtubeChannelId}`;

                    // Retrieve previously sent video links.
                    let SentVideos = await db.youtubesent.get(DatabaseKey);

                    // Dev Testing Section ----------------------------------------------
                    // console.log('[YOUTUBE-FEED] Database key:', DatabaseKey);
                    // console.log('[YOUTUBE-FEED] Existing history:', SentVideos);
                    // console.log('[YOUTUBE-FEED] History type:', typeof SentVideos);
                    // -------------------------------------------------------------------

                    if (!Array.isArray(SentVideos)) {
                        SentVideos = [];
                    }

                    // Sort videos by publication date (newest first).
                    const SortedVideos = [...Videos].sort((a, b) => {
                        return new Date(b.published || 0) - new Date(a.published || 0);
                    });

                    // Only consider the 5 latest videos overall.
                    const LatestVideos = SortedVideos.slice(0, INITIAL_VIDEO_LIMIT);

                    // Identify which of the latest 5 haven't already been sent.
                    let VideosToSend = LatestVideos.filter(
                        Video => !SentVideos.includes(Video.link)
                    );

                    // Return if all latest 5 videos have already been sent.
                    if (VideosToSend.length === 0) {
                        continue;
                    }

                    // Send oldest videos first.
                    VideosToSend.reverse();

                    // console.log(`[🔴] [YOUTUBE-FEED] Found ${VideosToSend.length} new videos for ${youtubeChannelId}.`);

                    // Send videos to Discord.
                    for (const Video of VideosToSend) {

                        try {

                            await DiscordChannel.send({
                                content: Video.link
                            });

                            // Save the sent video link.
                            SentVideos.push(Video.link);

                            await db.youtubesent.set(DatabaseKey, SentVideos);

                            // console.log(`[🔴] [YOUTUBE-FEED] Sent video: ${Video.link}`);

                        } catch (Error) {

                            console.error(`[🔴] [YOUTUBE-FEED] Failed to send video: ${Video.link}`, Error);

                            // Don't mark an unsuccessful send as sent.
                            break;
                        }
                    }

                } catch (Error) {

                    console.error(`[🔴] [YOUTUBE-FEED] Error checking channel for guild ${GuildId}:`, Error);
                }
            }
        }

    } catch (Error) {

        console.error('[🔴] [YOUTUBE-FEED] Database error:', Error);
    }

    // console.log('[🔴] [YOUTUBE-FEED] Feed check completed.');
}

// -----------------------------------------------------------------------------------------------------
// Start YouTube Feed Checker

let FeedInterval = null;
let IsChecking = false;

async function StartYouTubeFeed(client) {

    if (FeedInterval) return;

    const RunCheck = async () => {

        if (IsChecking) return;

        IsChecking = true;

        try {
            await CheckYouTubeFeeds(client);
        } finally {
            IsChecking = false;
        }
    };

    // Check immediately when started.
    await RunCheck();

    // Continue checking every 5 minutes.
    FeedInterval = setInterval(RunCheck, CHECK_INTERVAL);

    // console.log('[🔴] [YOUTUBE-FEED] Automatic checker started.');
}

// -----------------------------------------------------------------------------------------------------

module.exports = {
    StartYouTubeFeed,
    CheckYouTubeFeeds,
    ResolveYouTubeChannel,
    FetchYouTubeVideos
};

// -----------------------------------------------------------------------------------------------------
