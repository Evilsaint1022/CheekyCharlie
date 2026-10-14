// Halloween.js ---------------------------------------------------------------------------------------------------------------------
// Halloween theme for every command response. Modes: "auto" (Oct 1st - Oct 31st, NZ time), "on" (forced) and "off" (forced).
// Command logic and formats are untouched, only the colours / decorations of the responses are changed.

const db = require('../../Handlers/database');

const COLORS = [0xFF7518, 0x6A0DAD, 0x1B1B1B]; // pumpkin orange, witch purple, midnight black
const EMOJIS = ['🎃', '👻', '🦇', '🕸️', '🕷️', '💀', '🧙‍♀️', '🍬'];
const FOOTERS = [
    '🎃 Happy Halloween!',
    '👻 Boo! Did I scare you?',
    '🦇 Spooky season is here...',
    '🕸️ Trick or treat!',
    '💀 Beware of what lurks in the dark...'
];
const COMPONENTS_V2 = 1 << 15;
const MODES = ['auto', 'on', 'off'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function isOctober() {
    const month = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', month: 'numeric' }).format(new Date());
    return Number(month) === 10;
}

async function getMode() {
    const mode = await db.halloween.get('mode');
    return MODES.includes(mode) ? mode : 'auto';
}

async function setMode(mode) {
    await db.halloween.set('mode', mode);
}

async function isActive() {
    const mode = await getMode();
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return isOctober();
}

// Theming helpers ------------------------------------------------------------------------------------------------------------------

function themeEmbed(embed) {
    if (!embed) return embed;
    const data = typeof embed.toJSON === 'function' ? embed.toJSON() : { ...embed };
    data.color = pick(COLORS.slice(0, 2));
    const decorate = (text) => (text && !EMOJIS.some(e => text.startsWith(e)) ? `${pick(EMOJIS)} ${text}` : text);
    if (data.title) data.title = decorate(data.title).slice(0, 256);
    data.footer = data.footer?.text
        ? { ...data.footer, text: `${data.footer.text} • ${pick(EMOJIS)}`.slice(0, 2048) }
        : { ...(data.footer || {}), text: pick(FOOTERS) };
    return data;
}

function themeOptions(options) {
    if (typeof options === 'string') {
        return options.startsWith('🎃') ? options : `🎃 ${options}`.slice(0, 2000);
    }
    if (!options || typeof options !== 'object' || Array.isArray(options)) return options;
    // Components V2 messages can't contain content / embeds
    if (options.flags !== undefined && options.flags !== null && (Number(options.flags) & COMPONENTS_V2)) return options;

    const themed = { ...options };
    if (Array.isArray(themed.embeds)) {
        themed.embeds = themed.embeds.map(themeEmbed);
    } else if (typeof themed.content === 'string' && themed.content) {
        themed.content = themeOptions(themed.content);
    }
    return themed;
}

// Wraps a method so its first argument is themed while Halloween mode is active
function wrap(target, method) {
    const original = target[method];
    if (typeof original !== 'function') return;
    target[method] = async function (options, ...rest) {
        let themed = options;
        try {
            if (await isActive()) themed = themeOptions(options);
        } catch (err) {
            console.error('[Halloween] Failed to theme response:', err);
        }
        return original.call(this, themed, ...rest);
    };
}

function themeInteraction(interaction) {
    ['reply', 'editReply', 'followUp'].forEach(method => wrap(interaction, method));
}

function themeMessage(message) {
    wrap(message, 'reply');
    const channel = message.channel;
    if (channel && typeof channel.send === 'function') {
        const send = channel.send.bind(channel);
        const proxy = new Proxy(channel, {
            get(t, prop) {
                if (prop === 'send') {
                    return async (options, ...rest) => {
                        let themed = options;
                        try { if (await isActive()) themed = themeOptions(options); } catch { /* ignore */ }
                        return send(themed, ...rest);
                    };
                }
                const value = Reflect.get(t, prop, t);
                return typeof value === 'function' ? value.bind(t) : value;
            }
        });
        Object.defineProperty(message, 'channel', { value: proxy, configurable: true });
    }
}

module.exports = { isActive, getMode, setMode, isOctober, themeInteraction, themeMessage, themeOptions, MODES };
