const math = require('mathjs');

module.exports = ({ message, args, Discord }) => {
  if (!args.length || !args[0]) {
    return message.channel.send(':x: Give me an expression to evaluate!');
  }
  const s = args[0];
  const imgUrl = `https://chart.apis.google.com/chart?cht=tx&chs=50&chf=bg,s,00000000&chco=ffffff&chl=${encodeURIComponent(
    s
  )}`;
  try {
    math.evaluate(s);
  } catch {
    return message.channel.send(':x: Invalid expression!');
  }
  message.channel.send(
    new Discord.MessageEmbed()
      .setColor('#0066ff')
      .setTitle('Result')
      .setFooter(`math | ${message.author.tag}`)
      .setDescription(math.evaluate(s))
      .setTimestamp(new Date())
      .setImage(imgUrl)
  );
};
