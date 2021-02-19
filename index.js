const Discord = require('discord.js');
const fs = require('fs');
const math = require('mathjs');

require('dotenv').config();

const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));
app.listen(port);

const cooldowns = require('./cooldowns.json');

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

client.on('ready', () => {
  client.user.setPresence({ activity: { type: 'WATCHING', name: 'people get pinged' }, status: 'online' });
  console.log('Bot is on');
});

client.on('message', (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith(process.env.BOT_PREFIX + 'eval')) {
    const args = message.content.split(' ').slice(1);
    let isClean = false;
    let isAsync = false;
    if (args.includes('-c')) {
      args.splice(args.indexOf('-c'), 1);
      isClean = true;
    }
    if (args.includes('-a')) {
      args.splice(args.indexOf('-a'), 1);
      isAsync = true;
    }
    if (message.author.id !== '677898071212032060') return;
    try {
      const code = args.join(' ');
      let evaled = eval(code);

      const handle = (x) => {
        if (typeof x !== 'string') x = require('util').inspect(x);
        if (!isClean) {
          if (x.length > 2000) {
            message.channel.send('Content too big; sent as file instead.', {
              files: [{ attachment: Buffer.from(x), name: 'evaled.txt' }],
            });
          } else message.channel.send(clean(x), { code: 'xl' });
        }
      };

      if (isAsync) {
        evaled.then(handle);
      } else {
        handle(evaled);
      }
    } catch (err) {
      if (!isClean) message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  }
  if (message.content.startsWith(process.env.BOT_PREFIX + 'reboot')) {
    if (message.author.id !== '677898071212032060') return;
    message.channel
      .send('Rebooting bot now...')
      .then(() => client.destroy())
      .then(() => client.login(process.env.TOKEN));
  }
  if (message.content.startsWith(process.env.BOT_PREFIX + 'delete')) {
    if (message.author.id !== '677898071212032060') return;
    const id = message.content.split(' ')[1];
    message.channel.messages.fetch(id).then(x => x.delete());
  }
  if (message.content.includes('<@!810227401740517396>')) {
    message.channel.send(`<@${message.author.id}>`);
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

const clean = (text) => {
  if (typeof text === 'string')
    return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203));
  else return text;
};

client.ws.on('INTERACTION_CREATE', async (interaction) => {
  if (interaction.data.name === 'say') {
    const s = interaction.data.options[0].value;
    client.channels.cache.get(interaction.channel_id).send(s)
      .then(x => sayLog.push([interaction.member.user.username + '#' + interaction.member.user.discriminator, x.id]));
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
  if (interaction.data.name === 'invite') {
    client.api.interactions(interaction.id, interaction.token).callback.post({
      data: {
        type: 4,
        data: {
          content:
            'Invite this bot to your server with this link: https://discord.com/api/oauth2/authorize?client_id=810227401740517396&permissions=379968&scope=applications.commands%20bot',
        },
      },
    });
  }
  if (interaction.data.name === 'ping') {
    client.api.interactions(interaction.id, interaction.token).callback.post({
      data: {
        type: 4,
        data: {
          content:
            `🏓 API Latency is ${Math.round(client.ws.ping)}ms`,
        },
      },
    });
  }
  if (interaction.data.name === 'math') {
    const s = interaction.data.options[0].value;
    const imgUrl = `https://chart.apis.google.com/chart?cht=tx&chs=50&chf=bg,s,00000000&chco=ffffff&chl=${encodeURIComponent(s)}`;
    try {
      math.evaluate(s);
    } catch {
      client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
          type: 4,
          data: {
            content: ":x: Invalid expression!"
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
                `math | ${interaction.member.user.username}#${interaction.member.user.discriminator}`
              )
              .setDescription(
                math.evaluate(s)
              )
              .setTimestamp(new Date())
              .setImage(imgUrl)
              .toJSON(),
          ],
        },
      },
    });
  }
  if (interaction.data.name === 'snowflake') {
    const s = interaction.data.options[0].value;
    client.api.interactions(interaction.id, interaction.token).callback.post({
      data: {
        type: 4,
        data: {
          content: new Date(+((BigInt(s) >> 22n) + 1420070400000n).toString()).toLocaleString()
        }
      }
    });
  }
});

client.login(process.env.TOKEN);

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Uncaught error in`, promise, `\nReason:`, reason);
});
