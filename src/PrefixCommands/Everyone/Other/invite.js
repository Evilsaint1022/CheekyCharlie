module.exports = {
  name: 'invite',
  aliases: [`i`],

  async execute(message, args) {

    // Prevent command usage in DMs
    if (!message.guild) {
      return message.reply('This command cannot be used in DMs.');
    }

    const { guild, channel, author } = message;

    try {
      // Create a temporary invite link for 1 hour (3600 seconds)
      const invite = await guild.invites.create(channel.id, {
        maxAge: 3600, // 1 hour
        maxUses: 0,   // Unlimited uses
        unique: true, // Ensure the invite is unique
      });

      // Send the generated invite link
      await message.channel.send(
        `Here is your temporary invite link: ${invite.url}`
      );

      // Console Log
      console.log(
        `[🌿] [INVITE] [${new Date().toLocaleDateString('en-GB')}] ` +
        `[${new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}] ` +
        `${guild.name} ${guild.id} ${author.username} used the invite command.`
      );

    } catch (error) {
      console.error('Error creating invite link:', error);
      await message.reply(
        'An error occurred while creating the invite link. Please try again later.'
      );
    }
  },
};
