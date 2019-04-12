let botkit = require('botkit');
require('dotenv').config();

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, userName, userEmail) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    return callback(oAuth2Client, userName, userEmail);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1FfWDvj-CRx2qdE8vP7peITS39AcsRJ17bRrQdCVTjCQ/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '1FfWDvj-CRx2qdE8vP7peITS39AcsRJ17bRrQdCVTjCQ',
    range: 'A1',

  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Name, Major:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
}

function insertOrderer(auth, userName, userEmail) {
    const sheets = google.sheets({version: 'v4', auth});

    sheets.spreadsheets.values.update({
        spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
        valueInputOption: 'USER_ENTERED',
        range: 'Validation!B6:C6',
        resource: {
            values: [
                [userName, userEmail]
            ],
        }
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log('Name, Major:');
            // Print columns A and E, which correspond to indices 0 and 4.
            rows.map((row) => {
            console.log(`${row[0]}, ${row[4]}`);
            });
        } else {
            console.log('No data found.');
        }
    });

    sheets.spreadsheets.values.update({
        spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
        valueInputOption: 'USER_ENTERED',
        range: 'Validation!B7:C7',
        resource: {
            values: [
                [userName, userEmail]
            ],
        }
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log('Name, Major:');
            // Print columns A and E, which correspond to indices 0 and 4.
            rows.map((row) => {
            console.log(`${row[0]}, ${row[4]}`);
            });
        } else {
            console.log('No data found.');
        }
    });
  }

function readBubbleTeaPlaces(auth) {
    const sheets = google.sheets({version: 'v4', auth});

    sheets.spreadsheets.values.get({
        spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
        range: 'Validation!E2:E4',
        majorDimension: 'ROWS',
        valueRenderOption: 'FORMATTED_VALUE',
        fields: 'values',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        return res.data.values;
    });
}

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
} else {
    console.log('Good job, you have the variables!')
}

let controller = botkit.slackbot({
    json_file_store: './db_slackbutton_slash_command/',
    debug: true,
    clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
})

controller.configureSlackApp({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,
    scopes: ['commands', 'bot'],
});

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);
    controller.createOauthEndpoints(controller.webserver,
        function (err, req, res) {
            if (err) {
                res.status(500).send('ERROR: ' + err);
            } else {
                res.send('Success!');
            }
        });
});

let bot = controller.spawn({
    token: process.env.BOT_TOKEN,
    incoming_webhook: {
        url: 'WE_WILL_GET_TO_THIS'
    }
}).startRTM();

controller.hears('hi', 'direct_message', function (bot, message) {
    bot.reply(message, 'Hello.');
});

controller.hears('start', ['direct_mention', 'mention', 'direct_message'], function (bot, message) {
    var currentUser;
    bot.reply(message, "<@" + message.user+ "> started the order.");
    bot.api.users.info({user: message.user},function(err,response) {
        if(err) {
            bot.say("ERROR :(");
        }
        else {
            currentUser = response["user"];
            userName = currentUser.profile.real_name;
            userEmail = currentUser.profile.email;
            // Load client secrets from a local file.
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                // Authorize a client with credentials, then call the Google Sheets API.
                authorize(JSON.parse(content), insertOrderer, userName, userEmail);
                let bubbleTeaPlaces = authorize(JSON.parse(content), readBubbleTeaPlaces);
                console.log(bubbleTeaPlaces);
            });

        }
    });

    // bot.startConversation({
    //     user: message.user,
    //     channel: message.channel,
    //     text: ' started the order.'
    // }, function(err, convo) {
    //     convo.ask({
    //         channel: message.user,
    //         text: 'The order is started!'
    //     }, function(res, convo) {
    //         convo.say(res.text + ' is not a good enough answer.')
    //         convo.next()
    //     }
    //   )
    // });
});

controller.on('slash_command', function (bot, message) {
    bot.replyAcknowledge()
    switch (message.command) {
        case '/echo':
            bot.reply(message, 'heard ya!')
            break;
        default:
            bot.reply(message, 'Did not recognize that command, sorry!')
    }
});