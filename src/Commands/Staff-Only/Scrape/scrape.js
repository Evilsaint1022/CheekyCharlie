const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

//
// The command is not yet registered in register-commands.js and is not a full-featured command !!
//

const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://www.foursquare.co.nz/local-specials-and-promotions';

async function fetchHtml(url) {
    const res = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SalesScraper/1.0;)'
        },
        timeout: 10000
    });
    return res.data;
}

function parseSales(html) {
    const $ = cheerio.load(html);
    const items = [];

    const containerDiv = $(".fsq\\:grid.fsq\\:grid-cols-1.fsq\\:sm\\:grid-cols-2.fsq\\:md\\:grid-cols-3.fsq\\:lg\\:grid-cols-4.fsq\\:gap-24.fsq\\:w-full")

    containerDiv.children('div').each((index, element) => {
        const item = $(element);

        const itemImage = item.find('img').attr('src');
        const itemName = item.find('.fsq\\:text-p3.fsq\\:text-text-default.fsq\\:line-clamp-3.fsq\\:min-h-\\[48px\\]').text();
        const itemPriceOne = item.find('.fsq\\:font-brand.fsq\\:text-h1.fsq\\:leading-\\[41px\\]').text();
        const itemPriceTwo = item.find('.fsq\\:font-brand.fsq\\:text-h3.fsq\\:leading-\\[25px\\]').text();
        const itemType = item.find('.fsq\\:text-p3.fsq\\:font-bold').text();

        items.push({ image: itemImage, name: itemName, price: itemPriceOne + "." + itemPriceTwo, type: itemType });
    });


  return items;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scrape')
        .setDescription('Scrape the Four-Square Specials Page'),

    async execute(interaction) {

        try {

            const html = await fetchHtml(URL);
            const items = parseSales(html);
            console.log('Found', items.length, 'items');

            for (const item of items) {
                console.log(item)
            }

            await interaction.reply({ content: "Scraped! Check console." })

        } catch (err) {
            console.error('Error:', err.message);
        }

    },
};
