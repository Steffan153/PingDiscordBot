module.exports = ({ client, interaction, sayLog }) => {
  const s = interaction.data.options[0].value;
  client.channels.cache
    .get(interaction.channel_id)
    .send(s)
    .then((x) =>
      sayLog.push([interaction.member.user.username + '#' + interaction.member.user.discriminator, x.id])
    );
};
