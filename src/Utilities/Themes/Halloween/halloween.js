// Halloween.js ---------------------------------------------------------------------------------------------------------------------
// Halloween theme for every command response: embeds get spooky colours and their 🌿 become 🎃 in embeds, buttons and dropdowns (except currency). Modes: "auto" (Oct 1st - Oct 31st, NZ time), "on" (forced) and "off" (forced).
// Command logic and formats are untouched, only colours / 🌿 emojis are changed.

const db = require('../../../Handlers/database');

const COLOR = 0xFF7518; // pumpkin orange
const PUMPKIN = '🎃';
const FERN = '🌿';
const MODES = ['auto', 'on', 'off'];

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

// 🌿 is swapped for 🎃 unless it's acting as currency: directly followed by a number that isn't followed by a word
// ("🌿 1,000", "🌿`50`", "🌿**10**" are kept, "🌿 5 minutes", "🌿 Item" and "1 🌿**Item**" are swapped)
function swap(text) {
    if (typeof text !== 'string' || !text.includes(FERN)) return text;
    return text.replace(/🌿/gu, (match, offset) => {
        const after = text.slice(offset + match.length);
        const isCurrency = /^[\s`*_~]*\$?\d[\d,.]*(?![\d,.]|\s+\p{L})/u.test(after);
        return isCurrency ? match : PUMPKIN;
    });
}

function themeEmbed(embed) {
    if (!embed) return embed;
    const data = typeof embed.toJSON === 'function' ? embed.toJSON() : { ...embed };
    data.color = COLOR;
    data.title = swap(data.title);
    data.description = swap(data.description);
    if (data.footer) data.footer = { ...data.footer, text: swap(data.footer.text) };
    if (data.author) data.author = { ...data.author, name: swap(data.author.name) };
    if (Array.isArray(data.fields)) {
        data.fields = data.fields.map(f => ({ ...f, name: swap(f.name), value: swap(f.value) }));
    }
    return data;
}

function themeEmoji(emoji) {
    if (typeof emoji === 'string') return emoji === FERN ? PUMPKIN : emoji;
    if (emoji && emoji.name === FERN && !emoji.id) return { ...emoji, name: PUMPKIN };
    return emoji;
}

const TEXT_KEYS = ['content', 'label', 'placeholder', 'description'];

// Themes buttons, select menus and Components V2 layouts (text displays, sections, containers...)
function themeComponent(component) {
    const data = typeof component?.toJSON === 'function' ? component.toJSON() : component;
    if (Array.isArray(data)) return data.map(themeComponent);
    if (!data || typeof data !== 'object') return data;

    const themed = {};
    for (const [key, value] of Object.entries(data)) {
        if (TEXT_KEYS.includes(key) && typeof value === 'string') themed[key] = swap(value);
        else if (key === 'emoji') themed[key] = themeEmoji(value);
        else if (['components', 'options', 'accessory'].includes(key)) themed[key] = themeComponent(value);
        else themed[key] = value;
    }
    if (themed.type === 17 && themed.accent_color !== undefined) themed.accent_color = COLOR; // Container
    return themed;
}

function themeOptions(options) {
    if (typeof options === 'string') return swap(options);
    if (!options || typeof options !== 'object' || Array.isArray(options)) return options;
    // Only plain option objects can be themed (discord.js passes MessagePayload instances from message.reply into channel.send)
    const proto = Object.getPrototypeOf(options);
    if (proto !== Object.prototype && proto !== null) return options;
    const themed = { ...options };
    if (typeof themed.content === 'string') themed.content = swap(themed.content);
    if (Array.isArray(themed.embeds)) themed.embeds = themed.embeds.map(themeEmbed);
    if (Array.isArray(themed.components)) themed.components = themed.components.map(themeComponent);
    return themed;
}

// Wraps a method so its first argument is themed while Halloween mode is active.
// Messages returned from it get their own edit() / reply() wrapped so later edits stay themed.
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
        const result = await original.call(this, themed, ...rest);
        themeSentMessage(result);
        return result;
    };
}

const PATCHED = Symbol('halloween');

function themeSentMessage(message) {
    const msg = message?.resource?.message ?? message;
    if (!msg || typeof msg.edit !== 'function' || msg[PATCHED]) return;
    msg[PATCHED] = true;
    wrap(msg, 'edit');
    wrap(msg, 'reply');
}

function themeInteraction(interaction) {
    ['reply', 'editReply', 'followUp', 'update'].forEach(method => wrap(interaction, method));
    // Button / dropdown interactions edit the message they came from
    if (interaction.message) themeSentMessage(interaction.message);
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
                        const result = await send(themed, ...rest);
                        themeSentMessage(result);
                        return result;
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
