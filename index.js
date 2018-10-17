// We're using the slack-client library
let SlackClient = require('slack-client');

// Automatically reconnect after an error response from Slack.
let autoReconnect = true;

// Put your bot API token here
let token = 'YOUR TOKEN HERE';

// Put your slack team name here
// We'll use this when piecing together our API call
let team = 'YOUR TEAM HERE';

let slackClient = new SlackClient(token, autoReconnect);

// Track bot user, for detecting the bot's own messages
let bot;

// We'll define our own custom API call to get channel history
// See the note for step 10 above
let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

let getChannelHistory = function() {
  this.get = function(family, value, callback) {
    let xhr = new XMLHttpRequest();
    // This builds the actual structure of the API call using our provided variables
    let url =
      'https://' +
      team +
      '.slack.com/api/' +
      family +
      '.history?token=' +
      token +
      '&channel=' +
      value;
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200) callback(xhr.responseText);
    };
    xhr.open('GET', url, true);
    xhr.send();
  };
};

// Tell us when the app is running
slackClient.on('loggedIn', function(user, team) {
  bot = user;
  console.log(
    'Logged in as ' + user.name + ' of ' + team.name + ', but not yet connected'
  );
});

slackClient.on('open', function() {
  // Find out which public channels the bot is a member of
  let botChannels = Object.keys(slackClient.channels)
    .map(function(k) {
      return slackClient.channels[k];
    })
    .filter(function(c) {
      return c.is_member;
    })
    .map(function(c) {
      return c.name;
    });

  // Find out which private channels the bot is a member of
  let botGroups = Object.keys(slackClient.groups)
    .map(function(k) {
      return slackClient.groups[k];
    })
    .filter(function(g) {
      return g.is_open && !g.is_archived;
    })
    .map(function(g) {
      return g.name;
    });

  // Tell us when the bot is connected
  console.log(
    'Connected as ' + slackClient.self.name + ' of ' + slackClient.team.name
  );

  // Print our list of channels and groups
  // that we found above in the console
  if (botChannels.length > 0) {
    console.log('You are in these public channels: ' + botChannels.join(', '));
  } else {
    console.log('You are not in any public channels.');
  }

  if (botGroups.length > 0) {
    console.log('You are in these private channels: ' + botGroups.join(', '));
  } else {
    console.log('You are not in any private channels.');
  }
});

// What to do when a message is posted
// to one of the bot's channels--
// This is the real meat of our app
slackClient.on('message', function(message) {
  // Ignore the bot's own messages
  if (message.user == bot.id) return;

  // Get the current channel,
  // so we know where to post messages to later
  let channel = slackClient.getChannelGroupOrDMByID(message.channel);

  // We're wrapping our functionality in an IF statement
  // to only respond to messages directed at this bot
  if (
    message.type === 'message' &&
    message.text.length >= 0 &&
    message.text.indexOf(slackClient.self.id) > -1
  ) {
    // Take the message that was sent to the bot
    // And split off just the relevant bit
    // See the note for step 5 above
    searchString = message.text.split(' ').pop();

    // Print out the name of the channel the bot is analyzing
    console.log('Attempting to query channel: ' + searchString);

    // Retrieve the requested channel object
    // using functions from the slack-client library
    let myChannel = slackClient.getChannelGroupOrDMByName(searchString);

    // Check to verify if we've returned a valid channel
    if (typeof myChannel != 'undefined') {
      // Get the channel ID from the channel object
      let myChannelID = myChannel['id'];

      // Determine whether this is a public
      // or private channel (i.e., group)
      // by looking at the data in the channel object
      if (myChannel.getType() == 'Group') {
        family = 'groups';
      } else {
        family = 'channels';
      }

      // Get the message history for the channel
      // using our custom API call
      history = new getChannelHistory();
      history.get(family, myChannelID, function(response) {
        // Now that we have our messages,
        // let's parse them to make them readable
        json = JSON.parse(response);

        // The history object had a few children,
        // so we're just pulling out the "messages" child
        mymessages = json['messages'];

        // Create an array to hold our filtered list of messages
        let unresolved = [];

        // Filter for messages that don't have reactions
        for (let i = 0; mymessages.length > i; i++) {
          // For each message, get the reactions (if any)
          let msgStatus = mymessages[i]['reactions'];

          // If the message has no reactions...
          if (typeof msgStatus == 'undefined') {
            // ...add the message to our array
            unresolved.push(mymessages[i].text);
          }
        }

        // Once we've finished looping through all the messages
        // count how many didn't have reactions, for logging
        let myCount = unresolved.length;

        // Combine our array of unresolved messages into one line
        // so the bot can send just one message to slack
        let list = unresolved.join('\n');

        // Print out our final, single message to slack
        channel.send('Your Unresolved Items: \n' + list);

        // Print to the console that the query was successful,
        // and how many unresolved messages were found
        console.log('Query successful! Returned ' + myCount + ' items');
      });

      // If the message to the bot is formatted wrong, then do this:
    } else {
      // Tell the user how to format their request correctly
      channel.send(
        "I'm sorry, I don't understand. I need you to end your sentence with a valid channel name of which I am a member."
      );

      // Also print to the console that the query failed, and give some helpful pointers
      console.log('Query FAILED.');
      console.log('Did your sentence end with a valid channel name?');
      console.log(
        'Have you invited Catchup Bot to join the requested channel?'
      );
    }
  }
});

slackClient.login();
