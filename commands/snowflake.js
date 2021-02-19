module.exports = ({ message, args, Discord }) => {
  if (!args.length || !args[0]) {
    return message.channel.send(':x: Give me a snowflake to analyze!');
  }
  if (!/^\d{18}$/.test(args[0])) {
    return message.channel.send(':x: Invalid snowflake!');
  }
  message.channel.send(Discord.SnowflakeUtil.deconstruct(args[0]).date.toLocaleString());
};
