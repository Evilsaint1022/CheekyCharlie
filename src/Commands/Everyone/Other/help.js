const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../../Handlers/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands'),

  async execute(interaction) {

    // Prevent command usage in DMs
    if (interaction.channel.isDMBased()) {
      return interaction.reply({
        content: "This command cannot be used in DMs.",
        flags: 64
      });
    }

    const guildId = interaction.guild.id;

    // Get whitelisted roles from DB
    const WHITELISTED_ROLE_IDS =
      (await db.whitelisted.get(`${guildId}.whitelistedRoles`)) || [];

    // Get user's role IDs
    const memberRoles = interaction.member.roles.cache.map(role => role.id);

    // Check permission
    const hasPermission = WHITELISTED_ROLE_IDS.some(roleId =>
      memberRoles.includes(roleId)
    );

    // Public commands
    const publicCommands = [
      '- `?leaderboard` — Check the wallet/bank/money/level leaderboard. `?leaderboard money`',
      '- `?balance` — Check your ferns balance or check another users by using `?balance @user`',
      '- `?deposit` — Deposit ferns into your bank using `?deposit all` or `?deposit 100`',
      '- `?withdraw` — Withdraw ferns from your bank using `?withdraw all` or `?withdraw 100`',
      '- `?level` — Check your current level or check another users by using `?level @user`',
      '- `?daily` — Daily ferns collect.',
      '- `?pick` - Picks ferns when the drop party`s drops.',
      '- `?pay` - Pay other members Ferns by using `?pay @user`',
      '- `?counting` — View the current and next expected number for the guilds counting.'
    ];

    // Whitelisted-only commands
    const whitelistedCommands = [
    '`Whitelisted Prefix Commands Comming Soon...`'
    ];

    const embed = new EmbedBuilder()
      .setTitle('🌿 **__CheekyCharlie Help Menu__** 🌿')
      .setColor('#de4949')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setDescription('_Here are the available prefix commands:_')
      .addFields({
        name: '🌿 **__Everyone Prefix Commands__** 🌿',
        value: publicCommands.join('\n')
      })
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    // Only show whitelisted commands if user has permission
    if (hasPermission) {
      embed.addFields({
        name: '🌿 **__Whitelisted Prefix Commands__** 🌿',
        value: whitelistedCommands.join('\n')
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
