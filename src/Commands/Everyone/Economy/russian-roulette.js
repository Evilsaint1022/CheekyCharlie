// file: commands/fun/russian_roulette.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const db = require('../../../Handlers/database'); // adjust path
const CHAMBER_SIZE = 6; // 1/6 chance per trigger pull

const COOLDOWN_TIME = 60 * 1000; // 1 minute
const GLOBAL_COOLDOWN_KEY = `russian_roulette`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('russian-roulette')
    .setDescription('Challenge another member to Russian Roulette. Winner takes the pot.')
    .addUserOption(opt =>
      opt.setName('target').setDescription('Member to challenge').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount to bet').setRequired(true)
    ),

  async execute(interaction, client) {

    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;

    // 🌐 GLOBAL COOLDOWN CHECK
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();
    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      console.log(`[RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} Command blocked for ${interaction.user.username}, ${remaining}s remaining`);
      return interaction.reply({
        content: `⏳ The /russian_roulette command is on global cooldown. Please wait ${remaining} more seconds.`,
        flags: 64,
      });
    }
    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    const user = interaction.user;
    const opponent = interaction.options.getUser('target');
    const bet = interaction.options.getInteger('bet');

    console.log(`[RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${user.username} challenged ${opponent.username} with bet ${bet}`);

    if (opponent.bot || opponent.id === user.id) {
      console.log(`[RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${user.username} tried to challenge invalid target`);
      return interaction.reply({ content: `❌ You can't challenge bots or yourself.`, flags: 64 });
    }
    if (bet <= 0) {
      console.log(`[RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${user.username} tried to bet ${bet}`);
      return interaction.reply({ content: `❌ Bet must be greater than 0.`, flags: 64 });
    }

    await interaction.deferReply();

    try {
      // ✅ Sanitize usernames
      const safeChallenger = user.username.replace(/\./g, '_');
      const safeOpponent = opponent.username.replace(/\./g, '_');
      const balanceKeyChallenger = `${safeChallenger}_${user.id}.balance`;
      const balanceKeyOpponent = `${safeOpponent}_${opponent.id}.balance`;

      // Fetch balances
      const challengerBal = Number((await db.wallet.get(balanceKeyChallenger)) ?? 0);
      const opponentBal = Number((await db.wallet.get(balanceKeyOpponent)) ?? 0);
      console.log(`[RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${user.username}: ${challengerBal}, ${opponent.username}: ${opponentBal}`);

      if (challengerBal < bet)
        return interaction.editReply(`❌ ${user.username} doesn’t have enough balance.`);
      if (opponentBal < bet)
        return interaction.editReply(`❌ ${opponent.username} doesn’t have enough balance.`);

      // Deduct bets up front
      await db.wallet.set(balanceKeyChallenger, challengerBal - bet);
      await db.wallet.set(balanceKeyOpponent, opponentBal - bet);
      console.log(`[RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${user.username} and ${opponent.username} both put in ${bet}`);

      const pot = bet * 2;

      // Game state
      let currentShooter = { user, key: balanceKeyChallenger };
      let other = { user: opponent, key: balanceKeyOpponent };
      let round = 1;
      let killed = null;

      const startEmbed = new EmbedBuilder()
        .setTitle('🔫 Russian Roulette — Duel Started')
        .setDescription(
          `${user.username} challenged ${opponent.username}!\nEach bet **${bet}**.\n🌿 Pot: **${pot}**`
        )
        .setColor(0xff0000)
        .setTimestamp();

      const turnEmbed = new EmbedBuilder()
        .setTitle(`Round ${round}`)
        .setDescription(`👉 It’s **${currentShooter.user.username}**’s turn. Press the button to pull the trigger.`)
        .setColor(0xffff00);

      const shootButton = new ButtonBuilder()
        .setCustomId('shoot')
        .setLabel('🔫 Shoot')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(shootButton);

      const gameMsg = await interaction.editReply({
        embeds: [startEmbed, turnEmbed],
        components: [row],
      });

      const collector = gameMsg.createMessageComponentCollector({
        time: 5 * 60 * 1000, // 5 minutes max
      });

      collector.on('collect', async btnInt => {
        if (btnInt.user.id !== currentShooter.user.id) {
          console.log(`[🌿] [RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${btnInt.user.username} tried to shoot on ${currentShooter.user.username}'s turn`);
          return btnInt.reply({ content: `❌ It’s not your turn!`, flags: 64 });
        }

        await btnInt.deferUpdate();

        const roll = Math.floor(Math.random() * CHAMBER_SIZE) + 1;
        console.log(`[🌿] [RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} [Round ${round}] ${currentShooter.user.username} pulled the trigger (roll: ${roll})`);

        if (roll === 1) {
          killed = currentShooter;

          const loser = killed.user;
          const winner = other.user;
          const winnerKey =
            winner.id === user.id ? balanceKeyChallenger : balanceKeyOpponent;

          // Pay out pot
          const winnerBal = Number((await db.wallet.get(winnerKey)) ?? 0);
          await db.wallet.set(winnerKey, winnerBal + pot);

          console.log(`[🌿] [RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${loser.username} died. ${winner.username} won ${pot}`);

          const resultEmbed = new EmbedBuilder()
            .setTitle('💥 Russian Roulette — Result')
            .setDescription(
              `💀 ${loser.username} got shot!\n🏆 ${winner.username} wins the **${pot}** pot!`
            )
            .setColor(0x00ff00);

          await gameMsg.edit({ embeds: [startEmbed, resultEmbed], components: [] });
          collector.stop();
        } else {
          console.log(`[🌿] [RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} ${currentShooter.user.username} survived round ${round}`);

          round++;
          const surviveEmbed = new EmbedBuilder()
            .setTitle(`Round ${round - 1}`)
            .setDescription(`🔫 ${currentShooter.user.username} pulls the trigger... survived!`)
            .setColor(0xffff00);

          // Swap turns
          [currentShooter, other] = [other, currentShooter];

          const turnEmbed = new EmbedBuilder()
            .setTitle(`Round ${round}`)
            .setDescription(
              `👉 It’s **${currentShooter.user.username}**’s turn. Press the button to pull the trigger.`
            )
            .setColor(0xffff00);

          await gameMsg.edit({
            embeds: [startEmbed, surviveEmbed, turnEmbed],
            components: [row],
          });
        }
      });

      collector.on('end', async (_c, reason) => {
        if (!killed && reason !== 'messageDelete') {
          console.log(`[🌿] [RUSSIAN ROULETTE] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ${guildName} ${guildId} Duel expired due to inactivity`);
          await gameMsg.edit({
            content: '⌛ Game ended due to inactivity.',
            components: [],
          });
        }
      });
    } catch (err) {
      console.error('Error in russian_roulette command:', err);
      try {
        await interaction.followUp({
          content: '⚠️ An error occurred while running the command.',
          flags: 64,
        });
      } catch {}
    }
  },
};
