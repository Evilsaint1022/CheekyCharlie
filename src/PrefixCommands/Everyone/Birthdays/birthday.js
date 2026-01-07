const db = require('../../../Handlers/database');

module.exports = {
  name: 'birthday',
  aliases: ['bday'],

  async execute(message, args) {
    // ?birthday set 25/12
    if (!args[0] || args[0] !== 'set') {
      return message.reply(
        'Usage: `?birthday set DD/MM`\nExample: `?birthday set 25/12`'
      );
    }

    if (!args[1]) {
      return message.reply('Please provide a date like `DD/MM`.');
    }

    const [day, month] = args[1].split('/').map(Number);

    // Basic validation
    if (
      !day || !month ||
      day < 1 || day > 31 ||
      month < 1 || month > 12
    ) {
      return message.reply('Invalid date. Use `DD/MM` (e.g. `25/12`).');
    }

    const guildKey = `${message.guild.id}`;
    const author = `${message.author.id}`;

    const birthdaykey = ({
      day,
      month
    })

    // Save to database
    await db.birthdays.set(`${guildKey}.${author}`, birthdaykey);

    message.reply(
      `🎉 Your birthday has been set to **${day}/${month}**`
    );
  }
};
