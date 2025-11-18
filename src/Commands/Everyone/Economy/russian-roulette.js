// file: commands/fun/russian_roulette.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

const db = require('../../../Handlers/database');

const CHAMBER_SIZE = 6;
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

    // -----------------------------
    // 🌐 GLOBAL COOLDOWN CHECK
    // -----------------------------
    const lastUsed = await db.cooldowns.get(GLOBAL_COOLDOWN_KEY);
    const now = Date.now();

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);

      return interaction.reply({
        content: `⏳ The /russian_roulette command is on global cooldown. Please wait ${remaining} more seconds.`,
        flags: 64,
      });
    }

    await db.cooldowns.set(GLOBAL_COOLDOWN_KEY, now);

    const user = interaction.user;
    const opponent = interaction.options.getUser('target');
    const bet = interaction.options.getInteger('bet');

    if (opponent.bot || opponent.id === user.id) {
      return interaction.reply({ content: `❌ You can't challenge bots or yourself.`, flags: 64 });
    }

    if (bet <= 0) {
      return interaction.reply({ content: `❌ Bet must be greater than 0.`, flags: 64 });
    }

    await interaction.deferReply();

    try {
      // ============================================
      // 1️⃣ MIGRATION — Convert old username keys → ID keys
      // ============================================

      const oldChallengerKey = `${user.username.replace(/\./g, '_')}_${user.id}`;
      const oldOpponentKey = `${opponent.username.replace(/\./g, '_')}_${opponent.id}`;

      const newChallengerKey = `${user.id}`;
      const newOpponentKey = `${opponent.id}`;

      // Challenger migration
      const oldChallengerObj = await db.wallet.get(oldChallengerKey);
      if (oldChallengerObj !== undefined) {
        await db.wallet.set(newChallengerKey, oldChallengerObj);
        await db.wallet.delete(oldChallengerKey);
      }

      // Opponent migration
      const oldOpponentObj = await db.wallet.get(oldOpponentKey);
      if (oldOpponentObj !== undefined) {
        await db.wallet.set(newOpponentKey, oldOpponentObj);
        await db.wallet.delete(oldOpponentKey);
      }

      // ============================================
      // 2️⃣ Load balances using NEW ID-ONLY keys
      // ============================================

      const challengerData = await db.wallet.get(newChallengerKey) ?? { balance: 0 };
      const opponentData = await db.wallet.get(newOpponentKey) ?? { balance: 0 };

      const challengerBal = challengerData.balance ?? 0;
      const opponentBal = opponentData.balance ?? 0;

      if (challengerBal < bet)
        return interaction.editReply(`❌ ${user.username} doesn’t have enough balance.`);
      if (opponentBal < bet)
        return interaction.editReply(`❌ ${opponent.username} doesn’t have enough balance.`);

      // ============================================
      // 3️⃣ Deduct starting bets
      // ============================================

      await db.wallet.set(newChallengerKey, { balance: challengerBal - bet });
      await db.wallet.set(newOpponentKey, { balance: opponentBal - bet });

      const pot = bet * 2;

      let currentShooter = { user, id: newChallengerKey };
      let other = { user: opponent, id: newOpponentKey };
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
        .setDescription(`👉 It’s **${currentShooter.user.username}**’s turn.`)
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

      // ============================================
      // 4️⃣ Game Loop Handler
      // ============================================

      const collector = gameMsg.createMessageComponentCollector({
        time: 5 * 60 * 1000,
      });

      collector.on('collect', async btnInt => {
        if (btnInt.user.id !== currentShooter.user.id) {
          return btnInt.reply({ content: `❌ It’s not your turn!`, flags: 64 });
        }

        await btnInt.deferUpdate();

        const roll = Math.floor(Math.random() * CHAMBER_SIZE) + 1;

        if (roll === 1) {
          // 💥 someone dies
          killed = currentShooter;

          const winner = other.user;
          const winnerKey = other.id;

          const winnerBal = (await db.wallet.get(winnerKey))?.balance ?? 0;
          await db.wallet.set(winnerKey, { balance: winnerBal + pot });

          const resultEmbed = new EmbedBuilder()
            .setTitle('💥 Russian Roulette — Result')
            .setDescription(`💀 ${killed.user.username} got shot!\n🏆 ${winner.username} wins **${pot}**!`)
            .setColor(0x00ff00);

          await gameMsg.edit({ embeds: [startEmbed, resultEmbed], components: [] });
          collector.stop();
        } else {
          // Survived
          round++;

          const surviveEmbed = new EmbedBuilder()
            .setTitle(`Round ${round - 1}`)
            .setDescription(`🔫 ${currentShooter.user.username} survived!`)
            .setColor(0xffff00);

          // Swap shooters
          [currentShooter, other] = [other, currentShooter];

          const turnEmbed = new EmbedBuilder()
            .setTitle(`Round ${round}`)
            .setDescription(`👉 It’s **${currentShooter.user.username}**’s turn.`)
            .setColor(0xffff00);

          await gameMsg.edit({
            embeds: [startEmbed, surviveEmbed, turnEmbed],
            components: [row],
          });
        }
      });

      collector.on('end', async (_c, reason) => {
        if (!killed && reason !== 'messageDelete') {
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
