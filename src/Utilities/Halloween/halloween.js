// Halloween.js ---------------------------------------------------------------------------------------------------------------------
// Halloween theme for every command response: embeds get spooky colours and their 🌿 become 🎃 in embeds, buttons and dropdowns (except currency). Modes: "auto" (Oct 1st - Oct 31st, NZ time), "on" (forced) and "off" (forced).
// Command logic and formats are untouched, only colours / 🌿 emojis are changed.

const db = require('../../Handlers/database');

const COLORS = [0xFF7518, 0x6A0DAD, 0x1B1B1B]; // pumpkin orange, witch purple, midnight black
const PUMPKIN = '🎃';
const FERN = '🌿';
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

// 🌿 is swapped for 🎃 unless it's acting as currency: right before a number ("🌿 1,000", "🌿`50`") or right after one
// and not attached to a styled word ("50 🌿", "5🌿" are kept, "1 🌿**__Item__**" is decoration and is swapped)
function swap(text) {
    if (typeof text !== 'string' || !text.includes(FERN)) return text;
    return text.replace(/🌿/gu, (match, offset) => {
        const before = text.slice(0, offset);
        const after = text.slice(offset + match.length);
        const beforeNumber = /^[\s`*_~]*[\d$]/u.test(after);
        const afterNumber = /\d[\s`*_~,.]*$/u.test(before) && !/^[*_~`\p{L}]/u.test(after);
        return beforeNumber || afterNumber ? match : PUMPKIN;
    });
}

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

function themeEmoji(emoji) {
    if (typeof emoji === 'string') return emoji === FERN ? PUMPKIN : emoji;
    if (emoji && emoji.name === FERN && !emoji.id) return { ...emoji, name: PUMPKIN };
    return emoji;
}

// Themes buttons and select menus (labels, placeholders, option labels / descriptions / emojis)
function themeComponent(component) {
    const data = typeof component?.toJSON === 'function' ? component.toJSON() : component;
    if (!data || typeof data !== 'object') return component;
    if (Array.isArray(data.components)) return { ...data, components: data.components.map(themeComponent) };

    const themed = { ...data };
    if (themed.label) themed.label = swap(themed.label);
    if (themed.placeholder) themed.placeholder = swap(themed.placeholder);
    if (themed.emoji) themed.emoji = themeEmoji(themed.emoji);
    if (Array.isArray(themed.options)) {
        themed.options = themed.options.map(o => ({
            ...o,
            label: swap(o.label),
            description: swap(o.description),
            emoji: o.emoji ? themeEmoji(o.emoji) : o.emoji
        }));
    }
    return themed;
}

function themeOptions(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) return options;
    // Only plain option objects can be themed (discord.js passes MessagePayload instances from message.reply into channel.send)
    const proto = Object.getPrototypeOf(options);
    if (proto !== Object.prototype && proto !== null) return options;
    // Components V2 messages can't contain embeds
    if (options.flags !== undefined && options.flags !== null && (Number(options.flags) & COMPONENTS_V2)) return options;
    const themed = { ...options };
    if (Array.isArray(themed.embeds)) themed.embeds = themed.embeds.map(themeEmbed);
    if (Array.isArray(themed.components)) themed.components = themed.components.map(themeComponent);
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
