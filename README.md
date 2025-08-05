▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

# 4️⃣ CheekyCharlie Discord Bot

[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-44cc11)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hosted By](https://img.shields.io/badge/Hosted%20By-Bisecthosting.com-blue)](https://bisecthosting.com)

Welcome to **CheekyCharlie** — a modular Discord bot built as a fun hobby project!  
This bot is completely open-source to promote transparency and inspire others to create their own bots.

**Created by Evilsaint1022 (Owner, Developer) and NZ-Linix (Developer)**  
  
(This project uses dotdatabase made by NZ-Linix)  
https://github.com/NZ-Linix/dotdatabase

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

# ✨ Features

```
-> Full Economy System  
    ╰─> Bank and Wallet  
    ╰─> Daily Commands and Drop Events
    ╰─> Inventory
    ╰─> Shop
-> Economy Games 
    ╰─> Blackjack
    ╰─> Slots
-> Level System
    ╰─> Level Roles (stickyRoles)
-> Leaderboards
    ╰─> Balance
    ╰─> Levels
-> Voice Channels
    ╰─>Join-to-create
-> Custom Starboard
-> Bump Reminder  
-> Custom AI Chat
    ╰─> Ability to Deactivate the AI in specific channels
-> AI NSFW Content Filtering
    ╰─> Ability to train the AI
-> RSS Feed news
    ╰─> Choose from our library, or add own ones (self-host)
-> Color-of-the-Week ( updates every week )
-> Entertainment
    ╰─> Counting (includes custom emojis)
    ╰─> Ban-Count (^banned)
    ╰─> One-Word-Story
```

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

# 🎮 Application Commands

# **Available for Everyone:**

**Economy - Commands**
- `/leaderboard` — Balance/Level Leaderboard.
- `/balance` — Check your Ferns balance.
- `/deposit` — Deposit Ferns into your Bank.
- `/withdraw` — Withdraw Ferns from your Bank.
- `/level` — Check Current Level.
- `/daily` — Daily Currency Collect.
- `/pick` - Picks Ferns when the dropparty's drops.
- `/pay` - Pay other members Ferns.

**Economy Games - Commands**
- `/blackjack` - Starts a game of blackjack.
- `/slots` - Starts a game of slots.

**Shop - Commands**
- `/shop` - checks the server shop.
- `/buy` - buys a item from the shop.
- `/use` - uses the item bought from from the shop.
- `/refund` - refunds the item from the shop.
- `/inventory` - checks the items in the users inventory.

**Join-to-Create VC - Commands**
- `/lock-vc` - locks the join-to-create vc channel.
- `/unlock-vc` - unlocks the join-to-create vc channel.

**Fun - Commands**
- `/avatar` — View your's or someone elses avatar.
- `/ping` — Check Bots Latency.
- `/cat` — Generates a random picture of a cat.
- `/dog` — Generates a random picture of a dog.

**Other - Commands**
- `/github` — Github link to CheeckyCharlies Repo.
- `/invite` — Generates a random invite link.

**One-Word-Story - Commands**
- `/view-one-word-story` - view the current story in the server

# **Staff-Only Commands:** (`Administrator permissions required`)

**Set-Whitelisted-Role**
- `/set-whitelisted-roles` — Set whitelisted Roles.
- `/remove-whitelisted-roles` — Remove whitelisted Roles.

**Echo - Command** ( WhitelistedRole permission required )
- `/echo` — Echo Messages

**Levels - Commands** ( WhitelistedRole permission required )
- `/toggle-levels` - Toggles Levels On & Off
- `/set-level-channel` — Set Level Notification Channel.
- `/remove-level-channel` — Remove Level Notifcation Channel.

**Drop Party - Commands** ( WhitelistedRole permission required )
- `/set-drop-party-channel` — Set Drop Party Channel.
- `/remove-drop-party-channel` — Remove Drop Party Channel.

**Starboard - Commands** ( WhitelistedRole permission required )
- `/set-starboard-channel` - Sets Starboard Channel.
- `/set-starboard-count` - Sets Amount of emojis needed for Starboard.
- `/set-starboard-emoji` - Sets sets Starboard Emoji.

**Verified Role - Commands** ( WhitelistedRole permission required )
- `/set-verified-role` - Sets a verified role for the auto_kick event.
- `/remove-verified-role` - Removes the verified role that has been set.

**BumpReminder - Commands** ( WhitelistedRole permission required )
- `/set-bump-channel` - Sets a channel for the bump reminder.
- `/set-bump-role` - Sets a bump role for the bump reminder.

**NSFW Filter - Commands** ( WhitelistedRole permission required )
- `/toggle-nsfw-filter` - toggles the AI nsfw filter.
- `/set-nsfw-logs-channel` - sets a nsfw logs channel.
- `/remove-nsfw-logs-channel` - removes the set nsfw logs channel.

**AI RESPONSE - Commands** ( WhitelistedRole permission required )
- `/set-ignored-ai-channel` - Add a channel or category to the deactivated AI channels.
- `/remove-ignored-ai-channel` - Remove a channel or category from the deactivated AI channels.

**Shop - Commands** ( WhitelistedRole permission required )
- `/add-shop-item` - Adds items to the servers shop.
- `/remove-shop-item` - Removes Shop items by name.
- `/edit-shop-item` - Edits Items in the server shop.

**RSS FEED - Commands** ( WhitelistedRole permission required )
- `/set-rss-channel` - Lets you set a channel where new RSS feed news will be send.
- `/set-rss-topics` - Choose which topics you'd like to receive in your channel.
- `/remove-rss-channel` - Removes the RSS feed news channel.

**Counting - Commands** ( WhitelistedRole permission required )
- `/set-counting-channel` - Sets the counting entertainment channel.
- `/set-counting-emojis` - Sets custom emojis for reactions.
- `/remove-counting-channel` - Removes the set counting channel.
- `/remove-counting-emojis` - Removes custom emoji reactions for counting.

**Color of the Week - Commands** ( WhitelistedRole permission required )
- `/set-color-of-the-week` - Sets a role for color of the week
- `/remove-color-of-the-week` - Removes role set for color of the week

**BanCount - Commands** ( WhitelistedRole permission required )
- `/set-ban-channel` - Sets the ^banned channel.
- `/remove-ban-channel` - Removes the ^banned channel.

**One-Word-Story - Commands** ( WhitelistedRole permission required )
- `/set-story-channel` - Sets the channel for the one-word story game.
- `/remove-story-channel` - Removes the currently set one-word story channel.
- `/reset-one-word-story` - Resets the current one-word story in the server.

**Boosters Role - Commands** ( WhitelistedRole permission required )
- `/set-boosters-role` - Sets the servers boosters role Id.
- `/remove-boosters-role` - Removes the servers boosters role Id.

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

# 🐞 Bugs
- [Check the Bugs Forums](https://discord.com/channels/1346955021614317619/1390129457070866593)

If you need help with the bot or the code or want to report a bug, feel free to DM us on Discord:  
`@evilsaint1022` `@linix_red`

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

# 🌐 CheekyCharlie Support Server

[Join our Support Server](https://discord.gg/W3ZRZukZmS)

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

- **This code is free to use.**  
- **Hosted by [Bisecthosting.com](https://bisecthosting.com)**

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
