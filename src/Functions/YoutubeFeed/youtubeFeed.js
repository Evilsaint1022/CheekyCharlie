const cron = require(`node-cron`);
const db = require('../../Handlers/database');

// -----------------------------------------------------------------------------------------------------
// Dev Testing Configuration
// const CHECK_INTERVAL = "*/1 * * * *"; // 1 minute timer
// const INITIAL_VIDEO_LIMIT = 5;
// -----------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------
// Production Configuration
const CHECK_INTERVAL = "*/10 * * * *"; // 10 minute timer
const INITIAL_VIDEO_LIMIT = 5;
// -----------------------------------------------------------------------------------------------------

// Only log a feed error after this many failed checks in a row.
// YouTube's RSS endpoint randomly returns 404/500 for valid channels, so single failures are ignored.
const FAILURE_LOG_THRESHOLD = 6; // 6 checks x 10 minutes = 1 hour

// Cache resolved YouTube handles.
const YouTubeChannelCache = new Map();

// Consecutive failures per feed.
const FeedFailures = new Map();

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

    let ChannelId;

    try {
        ChannelId = await ScrapeYouTubeChannelId(Handle);
    } catch (ScrapeError) {

        // No API key configured, keep the scrape error.
        if (!process.env.YOUTUBE_API_KEY) throw ScrapeError;

        ChannelId = await ResolveYouTubeChannelAPI(Handle);
    }

    // Cache resolved Channel ID.
    YouTubeChannelCache.set(YouTubeHandle, ChannelId);

    // console.log(`[🔴] [YOUTUBE-FEED] Resolved ${Handle} -> ${ChannelId}`);

    return ChannelId;
}

// -----------------------------------------------------------------------------------------------------
// Scrape Channel ID from the YouTube channel page

async function ScrapeYouTubeChannelId(Handle) {

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

    return ChannelId;
}

// -----------------------------------------------------------------------------------------------------
// Resolve Channel ID with the YouTube Data API

async function ResolveYouTubeChannelAPI(Handle) {

    const Params = new URLSearchParams({
        part: 'id',
        forHandle: Handle,
        key: process.env.YOUTUBE_API_KEY
    });

    const Response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${Params}`, {
        signal: AbortSignal.timeout(15000)
    });

    if (!Response.ok) {
        throw new Error(`YouTube API could not resolve ${Handle}: HTTP ${Response.status}`);
    }

    const Data = await Response.json();
    const ChannelId = Data.items?.[0]?.id;

    if (!ChannelId) {
        throw new Error(`YouTube API found no channel for ${Handle}`);
    }

    return ChannelId;
}

// -----------------------------------------------------------------------------------------------------
// Fetch Videos (RSS first, YouTube Data API as fallback)

async function FetchYouTubeVideos(YouTubeHandle) {

    // Resolve handle into Channel ID.
    const ChannelId = await ResolveYouTubeChannel(YouTubeHandle);

    try {
        return await FetchYouTubeRSS(YouTubeHandle, ChannelId);
    } catch (RSSError) {

        // No API key configured, keep the RSS error.
        if (!process.env.YOUTUBE_API_KEY) throw RSSError;

        try {
            return await FetchYouTubeAPI(ChannelId);
        } catch (APIError) {
            throw new Error(`${RSSError.message} | API fallback failed: ${APIError.message}`);
        }
    }
}

// -----------------------------------------------------------------------------------------------------
// Fetch YouTube Data API (uploads playlist)

async function FetchYouTubeAPI(ChannelId) {

    // Every channel's uploads playlist is its Channel ID with "UC" replaced by "UU".
    const PlaylistId = `UU${ChannelId.slice(2)}`;

    const Params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId: PlaylistId,
        maxResults: '15',
        key: process.env.YOUTUBE_API_KEY
    });

    const Response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${Params}`, {
        signal: AbortSignal.timeout(15000)
    });

    if (!Response.ok) {
        const Body = await Response.json().catch(() => null);
        throw new Error(`YouTube API returned HTTP ${Response.status}${Body?.error?.message ? ` (${Body.error.message})` : ''}`);
    }

    const Data = await Response.json();
    const Videos = [];

    for (const Item of Data.items || []) {

        const VideoId = Item.contentDetails?.videoId || Item.snippet?.resourceId?.videoId;

        if (!VideoId) continue;

        Videos.push({
            videoId: VideoId,
            title: Item.snippet?.title || 'New YouTube Video',
            link: `https://www.youtube.com/watch?v=${VideoId}`,
            published: Item.contentDetails?.videoPublishedAt || Item.snippet?.publishedAt || null
        });
    }

    return Videos;
}

// -----------------------------------------------------------------------------------------------------
// Fetch YouTube RSS Feed

async function FetchYouTubeRSS(YouTubeHandle, ChannelId) {

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
    // console.log('[🔴] [YOUTUBE-FEED] RSS response received.');
    // console.log('[🔴] [YOUTUBE-FEED] RSS contains entries:', XML.includes('<entry>'));
    // console.log('[🔴] [YOUTUBE-FEED] RSS response length:', XML.length);
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

                const FailureKey = `${GuildId}.${Feed.youtubeChannelId}.${Feed.discordChannelId}`;

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

                    // Feed recovered after being reported as failing.
                    if ((FeedFailures.get(FailureKey) || 0) >= FAILURE_LOG_THRESHOLD) {
                        console.log(`[🔴] [YOUTUBE-FEED] Feed for ${youtubeChannelId} in guild ${GuildId} is working again.`);
                    }

                    FeedFailures.delete(FailureKey);

                    // console log for testing.
                    // console.log(`[🔴] [YOUTUBE-FEED] Retrieved ${Videos.length} videos for ${youtubeChannelId}.`);

                    if (!Videos.length) continue;

                    // Database key for this guild and YouTube channel.
                    const DatabaseKey = `${GuildId}.${youtubeChannelId}`;

                    // Retrieve previously sent video links.
                    let SentVideos = await db.youtubesent.get(DatabaseKey);

                    // Dev Testing Section ----------------------------------------------
                    // console.log('[🔴] [YOUTUBE-FEED] Database key:', DatabaseKey);
                    // console.log('[🔴] [YOUTUBE-FEED] Existing history:', SentVideos);
                    // console.log('[🔴] [YOUTUBE-FEED] History type:', typeof SentVideos);
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

                    console.log(`[🔴] [YOUTUBE-FEED] Found ${VideosToSend.length} new videos for ${youtubeChannelId}.`);

                    // Send videos to Discord.
                    for (const Video of VideosToSend) {

                        try {

                            await DiscordChannel.send({
                                content: Video.link
                            });

                            // Save the sent video link.
                            SentVideos.push(Video.link);

                            await db.youtubesent.set(DatabaseKey, SentVideos);

                            console.log(`[🔴] [YOUTUBE-FEED] Sent video: ${Video.link}`);

                        } catch (Error) {

                            console.error(`[🔴] [YOUTUBE-FEED] Failed to send video: ${Video.link}`, Error.message);

                            // Don't mark an unsuccessful send as sent.
                            break;
                        }
                    }

                } catch (Error) {

                    const Failures = (FeedFailures.get(FailureKey) || 0) + 1;

                    FeedFailures.set(FailureKey, Failures);

                    // Log once when the threshold is reached, not on every failed check.
                    if (Failures === FAILURE_LOG_THRESHOLD) {
                        console.error(`[🔴] [YOUTUBE-FEED] Feed for ${Feed.youtubeChannelId} in guild ${GuildId} failed ${Failures} checks in a row:`, Error.message);
                    }
                }
            }
        }

    } catch (Error) {

        console.error('[🔴] [YOUTUBE-FEED] Database error:', Error.message);
    }

    // console.log('[🔴] [YOUTUBE-FEED] Feed check completed.');
}

// -----------------------------------------------------------------------------------------------------
// Start YouTube Feed Checker

let FeedInterval = null;
let IsChecking = false;

async function StartYouTubeFeed(client) {

    if (FeedInterval) return;

    const RunCheck = async (client) => {

        if (IsChecking) return;

        IsChecking = true;

        try {
            await CheckYouTubeFeeds(client);
        } finally {
            IsChecking = false;
        }
    };

    // Continue checking every 5 minutes.
    FeedInterval = cron.schedule(CHECK_INTERVAL, () => {
    RunCheck(client)
    });

    // console.log('[🔴] [YOUTUBE-FEED] Automatic checker started.');
}

// -----------------------------------------------------------------------------------------------------

module.exports =
    StartYouTubeFeed,
    CheckYouTubeFeeds,
    ResolveYouTubeChannel,
    FetchYouTubeVideos
;

// -----------------------------------------------------------------------------------------------------
