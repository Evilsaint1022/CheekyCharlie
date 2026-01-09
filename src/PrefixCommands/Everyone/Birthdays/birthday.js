const db = require('../../../Handlers/database');

module.exports = {
  name: 'birthday',
  aliases: ['bday'],

  async execute(message, args) {
    // ?birthday set 25/12/2000
    if (!args[0] || args[0] !== 'set') {
      return message.reply(
        'Usage: `?birthday set DD/MM/YYYY`\nExample: `?birthday set 25/12/2000`'
      );
    }

    if (!args[1]) {
      return message.reply('Please provide a date like `DD/MM/YYYY`.');
    }

    const [day, month, year] = args[1].split('/').map(Number);

    // Basic validation
    if (
      !day || !month || !year ||
      day < 1 || day > 31 ||
      month < 1 || month > 12 ||
      year < 1900 || year > new Date().getFullYear()
    ) {
      return message.reply(
        'Invalid date. Use `DD/MM/YYYY` (e.g. `25/12/2000`).'
      );
    }

    const guildKey = message.guild.id;
    const author = message.author.id;
    const guildName = message.guild.name
    const guildId = message.guild.id

    const birthdayKey = {
      day,
      month,
      year
    };

    // Save to database
    await db.birthdays.set(`${guildKey}.${author}`, birthdayKey);

            console.log(
            `[🌿] [BIRTHDAY] [${new Date().toLocaleDateString('en-GB')}] ` +
            `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
            `${guildName} ${guildId} ${message.author.username} used the ?bithday command to set their birthday ${day}/${month}/${year}`
        );

    message.reply(
      `🎉 Your birthday has been set to **${day}/${month}/${year}**`
    );
  }
};
