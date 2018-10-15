const SlackBot = require('slackbots');
const bot = new SlackBot({
  token: 'xoxb-455614632803-454972998912-lYfacRjn4WsTdbfmnEGXnUPn',
  name: 'Catch Up Bot'
});

//when bot starts up

bot.on('start', () => {
  const params = {
    icon_emoji: ':smiley:'
  };

  bot.postMessageToChannel('general', 'bot is running', params);
});

//error handler

bot.on('error', err => {
  console.log(err);
});

//message handler

bot.on('message', data => {
  if (data.type !== 'message') {
    return;
  }

  handleMessage(data.text);
});

//responding to data

function handleMessage(message, auth) {
  if (message.includes(' catch me up')) {
    bot.postMessageToUser(
      'leslie.alldridge',
      `You may have missed: @here and @channel's should arrive here`,
      params
    )
  }
}



         
