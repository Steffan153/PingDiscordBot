module.exports = ({ interaction, client, cooldowns, updateCooldowns, Discord }) => {
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
};
