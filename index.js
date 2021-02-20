const Discord = require('discord.js');
const fs = require('fs');

require('dotenv').config();

const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));
app.listen(port);

const cooldowns = require('./cooldowns.json');
const prefixes = require('./prefixes.json');

const adminCommands = Object.fromEntries(
  fs.readdirSync('admin_commands').map((k) => [k.slice(0, -3), require('./admin_commands/' + k)])
);

const commands = Object.fromEntries(
  fs.readdirSync('commands').map((k) => [k.slice(0, -3), require('./commands/' + k)])
);

const slashCommands = Object.fromEntries(
  fs.readdirSync('slash_commands').map((k) => [k.slice(0, -3), require('./slash_commands/' + k)])
);

const client = new Discord.Client();

const millisecondMap = {
  milliseconds: 1,
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

const sayLog = [];

function updateCooldowns() {
  fs.writeFile('./cooldowns.json', JSON.stringify(cooldowns), () => {});
}

function updatePrefixes() {
  fs.writeFile('./prefixes.json', JSON.stringify(prefixes), () => {});
}

client.on('ready', () => {
  client.user.setPresence({
    activity: { type: 'PLAYING', name: 'Type / to see available commands' },
    status: 'online',
  });
  console.log('Bot is on');
});

client.on('message', (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith(process.env.BOT_PREFIX)) {
    const args = message.content.slice(process.env.BOT_PREFIX.length).trim().split(' ');
    const cmdName = args.shift();
    if (cmdName in adminCommands) {
      if (message.author.id !== '677898071212032060') return;
      adminCommands[cmdName]({
        message,
        Discord,
        client,
        env: process.env,
        args,
        eval_: (x) => eval(x),
      });
    }
  }
  const prefix = prefixes[message.guild.id] || process.env.BOT_PREFIX;
  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(' ');
    const cmdName = args.shift();
    if (cmdName in commands) {
      commands[cmdName]({
        message,
        Discord,
        client,
        env: process.env,
        args,
        eval_: (x) => eval(x),
      });
    }
  }
  if (!cooldowns[message.author.id]) return;
  const matching = cooldowns[message.author.id].find((x) =>
    message.content.toLowerCase().startsWith(x.phrase.toLowerCase())
  );
  if (!matching) return;
  setTimeout(() => {
    message.channel.send(`<@${message.author.id}>, your cooldown for \`${matching.phrase}\` is over!`);
  }, matching.time * millisecondMap[matching.unit]);
});

client.ws.on('INTERACTION_CREATE', async (interaction) => {
  if (interaction.data.name in slashCommands) {
    slashCommands[interaction.data.name]({
      interaction,
      client,
      Discord,
      env: process.env,
      cooldowns,
      updateCooldowns,
      sayLog,
    });
  }
});

client.login(process.env.TOKEN);

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Uncaught error in`, promise, `\nReason:`, reason);
});
