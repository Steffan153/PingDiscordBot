module.exports = ({ message }) => {
  const id = args[0];
  message.channel.messages.fetch(id).then((x) => x.delete());
};
