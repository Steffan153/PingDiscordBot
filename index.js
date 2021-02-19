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
  if (interaction.data.name === 'say') {
    const s = interaction.data.options[0].value;
    client.channels.cache
      .get(interaction.channel_id)
      .send(s)
      .then((x) =>
        sayLog.push([interaction.member.user.username + '#' + interaction.member.user.discriminator, x.id])
      );
  }
  if (interaction.data.name === 'cooldowns') {
    if (interaction.data.options[0].name === 'add') {
      const [phrase, time, unit] = interaction.data.options[0].options.map((x) => x.value);
      const id = interaction.member.user.id;
      if (!cooldowns[id]) cooldowns[id] = [];
      cooldowns[id].push({
        phrase,
        time,
        unit,
      });
      updateCooldowns();
      client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
          type: 4,
          data: {
            content: ':white_check_mark:',
            flags: 1 << 6,
          },
        },
      });
    }
    if (interaction.data.options[0].name === 'delete') {
      const id = +interaction.data.options[0].options[0].value;
      const cds = cooldowns[interaction.member.user.id];
      if (cds && id >= 0 && id < cds.length) {
        cds.splice(id, 1);
        updateCooldowns();
        client.api.interactions(interaction.id, interaction.token).callback.post({
          data: {
            type: 4,
            data: {
              content: ':white_check_mark: Removed!',
              flags: 1 << 6,
            },
          },
        });
      } else {
        client.api.interactions(interaction.id, interaction.token).callback.post({
          data: {
            type: 4,
            data: {
              content: ':x: This cooldown does not exist!',
              flags: 1 << 6,
            },
          },
        });
      }
    }
    if (interaction.data.options[0].name === 'list') {
      const cds = cooldowns[interaction.member.user.id];

      if (!cds || cds.length === 0) {
        return client.api.interactions(interaction.id, interaction.token).callback.post({
          data: {
            type: 4,
            data: {
              content: ':x: You do not have any cooldowns setup yet!',
              flags: 1 << 6,
            },
          },
        });
      }
      client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
          type: 4,
          data: {
            embeds: [
              new Discord.MessageEmbed()
                .setColor('#0066ff')
                .setAuthor(
                  `${interaction.member.user.username}#${interaction.member.user.discriminator}`,
                  `https://cdn.discordapp.com/avatars/${interaction.member.user.id}/${interaction.member.user.avatar}.png`
                )
                .setFooter(
                  `commands list | ${interaction.member.user.username}#${interaction.member.user.discriminator}`
                )
                .setDescription(
                  cds.map(
                    (x, i) =>
                      `(ID: ${i}) If starts with \`${x.phrase}\`, remind to rerun in ${x.time} ${x.unit}`
                  ).join`\n`
                )
                .setTimestamp(new Date())
                .toJSON(),
            ],
          },
        },
      });
    }
  }
});

client.login(process.env.TOKEN);

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Uncaught error in`, promise, `\nReason:`, reason);
});
