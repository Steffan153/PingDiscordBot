module.exports = ({ message, client, env }) => {
  message.channel
    .send('Rebooting bot now...')
    .then(() => client.destroy())
    .then(() => client.login(env.TOKEN));
};
