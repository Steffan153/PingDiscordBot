const clean = (text) => {
  if (typeof text === 'string')
    return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203));
  else return text;
};

module.exports = ({ message, eval_ }) => {
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
  try {
    const code = args.join(' ');
    let evaled = eval_(code);

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
};
