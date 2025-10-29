const axios = require("axios");
const cheerio = require("cheerio");
const { EmbedBuilder } = require("discord.js");
const db = require("../../Handlers/database");

module.exports = async (client) => {
  const channelId = "1395774255928442880";
  const enableLoop = true;
  const interval = 5000; // 5 seconds

  // Load persistent data safely
  if (typeof db.specials.get("sent", {}) !== "object" || Array.isArray(db.specials.get("sent"))) {
    db.specials.set("sent" || {});
  }

  console.log(`[💾] Loaded ${Object.keys(db.specials.get("sent", {})).length} previously sent specials.`);

  async function scrapeAndPost() {
    try {
      const url = "https://www.foursquare.co.nz/local-specials-and-promotions";
      console.log(`[🌐] Scraping specials from: ${url}`);

      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const $ = cheerio.load(data);
      const specials = [];

      $("main div.fsq\\:relative").each((_, element) => {
        const name = $(element)
          .find("p.fsq\\:text-p3.fsq\\:text-text-default")
          .first()
          .text()
          .trim();

        const img = $(element).find("img.fsq\\:w-\\[160px\\]").attr("src");

        const dollars = $(element)
          .find("div.fsq\\:flex h3.fsq\\:font-brand.fsq\\:text-h1")
          .first()
          .text()
          .trim();

        const cents = $(element)
          .find("div.fsq\\:flex h3.fsq\\:font-brand.fsq\\:text-h3")
          .first()
          .text()
          .trim();

        const unit = $(element)
          .find("p.fsq\\:text-p3.fsq\\:font-bold")
          .first()
          .text()
          .trim();

        const expires = $(element)
          .find(".fsq\\:text-p4.fsq\\:text-text-subtle")
          .first()
          .text()
          .replace("Expires:", "")
          .trim();

        const specialsPrice = $(element)
          .find(".fsq\\:text-p4.fsq\\:text-text-subtle")
          .eq(1)
          .text()
          .trim();

        let price = "";
        if (dollars || cents || unit) {
          price = `$${dollars}${cents ? `.${cents}` : ""} ${unit}`;
        }

        if (name && img) {
          specials.push({ name, img, price, expires, specialsPrice });
        }
      });

      if (specials.length === 0) {
        console.warn("[⚠️] No specials found — site structure may have changed.");
        return;
      }

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        console.error(`[❌] Could not find channel with ID: ${channelId}`);
        return;
      }

      const now = new Date().toISOString();
      let newCount = 0;

      const sentData = db.specials.get("sent") || {};

      for (const item of specials) {
        const nameKey = (item.name || "").trim();
        if (!nameKey) continue;

        // ✅ Skip already known entries
        if (sentData[nameKey]) continue;

        // Send embed for new ones only
        const embed = new EmbedBuilder()
          .setColor(0xffffff)
          .setTitle(`🌿 ${item.name} 🌿`)
          .setDescription(
            [
              item.price ? `- 💰 **Price:** ${item.price}` : null,
              item.specialsPrice,
              item.expires ? `- **Expires:** ${item.expires}` : null,
            ]
              .filter(Boolean)
              .join("\n")
          )
          .setImage(item.img)
          .setFooter({ text: "🛒 Foursquare Local Specials" });

        await channel.send({ embeds: [embed] });
        console.log(`[🌿] Sent new special: ${nameKey}`);

        // ✅ Save only the new one (no rewriting!)
        db.specials.set(`sent.${nameKey}`, {
          sentAt: now,
          img: item.img,
          price: item.price,
        });

        newCount++;

        // avoid spam
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (newCount === 0) {
        console.log("[ℹ️] No new specials to post.");
      } else {
        console.log(`[🎉] Posted ${newCount} new specials.`);
      }

      console.log(`[🗂️] Total tracked: ${Object.keys(db.specials.get("sent") || {}).length}`);
    } catch (err) {
      console.error("[❌] Error scraping Foursquare specials:", err.message);
    }
  }

  // Run once immediately
  await scrapeAndPost();

  // Optional loop
  if (enableLoop) {
    setInterval(scrapeAndPost, interval);
  }
};
