// Halloween.js ---------------------------------------------------------------------------------------------------------------------
// Halloween theme for every command response: embeds get spooky colours and their 🌿 become 🎃 (except currency). Modes: "auto" (Oct 1st - Oct 31st, NZ time), "on" (forced) and "off" (forced).
// Command logic and formats are untouched, only embed colours / 🌿 emojis are changed.

const db = require('../../Handlers/database');

const COLORS = [0xFF7518, 0x6A0DAD, 0x1B1B1B]; // pumpkin orange, witch purple, midnight black
const PUMPKIN = '🎃';
// 🌿 is swapped for 🎃 except when it's acting as currency (next to / right after a number, e.g. "🌿 1,000" or "50 🌿")
const FERN = /(?<!\d[\s`*_~,.]*)🌿(?![\s`*_~]*[\d$])/gu;
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

const swap = (text) => (typeof text === 'string' ? text.replace(FERN, PUMPKIN) : text);

function themeEmbed(embed) {
    if (!embed) return embed;
    const data = typeof embed.toJSON === 'function' ? embed.toJSON() : { ...embed };
    data.color = pick(COLORS.slice(0, 2));
    data.title = swap(data.title);
    data.description = swap(data.description);
    if (data.footer) data.footer = { ...data.footer, text: swap(data.footer.text) };
    if (data.author) data.author = { ...data.author, name: swap(data.author.name) };
    if (Array.isArray(data.fields)) {
        data.fields = data.fields.map(f => ({ ...f, name: swap(f.name), value: swap(f.value) }));
    }
    return data;
}

function themeOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) return options;
    // Components V2 messages can't contain embeds
    if (options.flags !== undefined && options.flags !== null && (Number(options.flags) & COMPONENTS_V2)) return options;
    if (!Array.isArray(options.embeds)) return options;
    return { ...options, embeds: options.embeds.map(themeEmbed) };
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
