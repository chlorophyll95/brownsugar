let botkit = require('botkit');
const moment = require('moment');
const axios = require('axios');
const schedule = require('node-schedule');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
let newSheetTitle = "New";
require('dotenv').config();
var app = express();
console.log(app);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
});

var urlencodedParser = bodyParser.urlencoded({ extended: false });

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

app.post('/interactions', urlencodedParser, (req, res) => {
	res.status(200).end() // best practice to respond with 200 status
	var actionJSONPayload = JSON.parse(req.body.payload) // parse URL-encoded payload JSON string

	console.log(req);

	var directMessage = {
		user: actionJSONPayload.user,
		as_user: true,
		text: (actionJSONPayload.actions[0].value === "yes") ? "What would you like to order from " + bubbleTeaShop + "?" : "That's cool! Join us next time!",
		replace_original: false
	}
	sendMessageToSlackResponseURL(actionJSONPayload.response_url, directMessage)

});

function sendMessageToSlackResponseURL(responseURL, JSONmessage) {
	var postOptions = {
		uri: responseURL,
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		json: JSONmessage
	}
	request(postOptions, (error, response, body) => {
		if (error){
				// handle errors as you see fit
		}
	})
}

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

function insertOrderer(auth, userName, userEmail) {
	const sheets = google.sheets({version: 'v4', auth});

  sheets.spreadsheets.values.get({
		spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
		range: 'Validation!B2:B',
		majorDimension: 'COLUMNS',
		valueRenderOption: 'FORMATTED_VALUE',
		fields: 'values',
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);
		console.log(res.data.values[0]);
		let nextColumn = res.data.values[0].length + 2;
		console.log(nextColumn);
		if (!res.data.values[0].includes(userName)) {
			console.log(res.data.values[0] + " does not include " + userName);
			console.log("Adding " + userName + " to the list of orderers");

			sheets.spreadsheets.values.update({
				spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
				valueInputOption: 'USER_ENTERED',
				range: 'Validation!B' + nextColumn + ':C' + nextColumn,
				resource: {
					values: [
						[userName, userEmail]
					],
				}
			}, (err, res) => {
				if (err) return console.log('The API returned an error: ' + err);
			});
		}

		sheets.spreadsheets.sheets.copyTo({
			spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
			sheetId: 141662734,
			resource: {
				destinationSpreadsheetId: "1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8"
			}
		}, (err, res) => {
			if (err) return console.log('The API returned an error: ' + err);
			newSheetTitle = res.data.title;

			sheets.spreadsheets.values.update({
				spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
				valueInputOption: 'USER_ENTERED',
				range: newSheetTitle + '!B11:D11',
				resource: {
					values: [
						[userName]
					],
				}
			}, (err, res) => {
				if (err) return console.log('The API returned an error: ' + err);
			});

			var today = new Date();
			var dd = String(today.getDate()).padStart(2, '0');
			var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
			var yyyy = today.getFullYear();

			today = mm + '/' + dd + '/' + yyyy;

			sheets.spreadsheets.values.update({
				spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
				valueInputOption: 'USER_ENTERED',
				range: newSheetTitle + '!B3:D3',
				resource: {
					values: [
						[today]
					],
				}
			}, (err, res) => {
				if (err) return console.log('The API returned an error: ' + err);
			});
		});
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
		bubbleTeaPlaces = res.data.values;
		bot.api.chat.postMessage({
			// channel: 'DHMKDBGTB',
			channel: 'CHXJHAKRC',
			text: "Bubble tea places:\n" + "💚 " + bubbleTeaPlaces[0] + "\n" + "💛 " + bubbleTeaPlaces[1] + "\n" + "❤️ " + bubbleTeaPlaces[2],
		});
	});
}

function getTopThreeDrinks(auth, bubbleTeaShop) {
  const sheets = google.sheets({version: 'v4', auth});
	sheets.spreadsheets.values.get({
    spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
    range: bubbleTeaShop + ' Favorite Drinks!B2:C4',
    majorDimension: 'COLUMNS',
		valueRenderOption: 'FORMATTED_VALUE',
		fields: 'values',
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);
    return res.data.values;
	});
}

function orderFrom(auth, bubbleTeaShop, cutOffTime) {
	const sheets = google.sheets({version: 'v4', auth});

	sheets.spreadsheets.values.update({
		spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
		valueInputOption: 'USER_ENTERED',
		range: newSheetTitle + '!B8:D8',
		resource: {
			values: [
				[bubbleTeaShop]
			],
		}
	}, (err, res) => {
		if (err) return console.log('The API returned an error: ' + err);

		sheets.spreadsheets.values.update({
			spreadsheetId: '1MyLFCPcvY6BBgICQ2XjPvaUgyQJqMu_v-5knB4xdBP8',
			valueInputOption: 'USER_ENTERED',
			range: newSheetTitle + '!F3:H3',
			resource: {
				values: [
					[cutOffTime]
				],
			}
		}, (err, res) => {
			if (err) return console.log('The API returned an error: ' + err);
		});
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
				authorize(JSON.parse(content), readBubbleTeaPlaces);
			});
		}
	});
});

controller.hears('order', ['direct_mention', 'mention', 'direct_message'], function (bot, message) {
	bubbleTeaShop = message.text.split(" ")[2];
	if (bubbleTeaShop !== undefined) {
		if (bubbleTeaShop.length > 0) {
			let orderTime = moment().add(1, 'hours').toDate();
			let timeForMessage = moment(orderTime).format('LT');

			orderTimeSet(orderTime);

			fs.readFile('credentials.json', (err, content) => {
				if (err) return console.log('Error loading client secret file:', err);
				// Authorize a client with credentials, then call the Google Sheets API.
				authorize(JSON.parse(content), orderFrom, bubbleTeaShop, timeForMessage);

				bot.api.chat.postMessage({
					channel: message.channel,
					as_user: true,
					text: `<!channel> We will be ordering from ${bubbleTeaShop}. Put in your order now! Cut off time: ${timeForMessage}.\nDo you want to join the group order?`,
    			attachments: [{
							"fallback": "You are unable to choose an order",
							"callback_id": "user_order",
							"color": "#3AA3E3",
							"attachment_type": "default",
							"actions": [
								{
										"name": "UserOrder",
										"text": "Yes",
										"type": "button",
										"value": "yes"
								},
								{
										"name": "UserOrder",
										"text": "No",
										"type": "button",
										"value": "no"
								},
							]
						}
    			]
				});
			});
		}
	} else {
		return bot.reply(message, "Wrong format! Follow the `order from OneZo` format");
	}
});

controller.hears('yoyoyo', 'direct_message', function (bot, message) {
    bot.reply(message, "CHAD" + " started the order");
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

controller.hears('bye', ['direct_mention', 'mention', 'direct_message'], function (bot, message) {
    bot.reply(message, 'test' + ' this is a response.');
});

function orderTimeSet(orderTime) {
    const fiveMinutesToOrder = moment(orderTime).subtract(5, 'minutes').toDate();
    const fifteenMinutesToOrder = moment(orderTime).subtract(15, 'minutes').toDate();
    const thirtyMinutesToOrder = moment(orderTime).subtract(30, 'minutes').toDate();

    sendOrderNotifications(orderTime, 0)
    sendOrderNotifications(fiveMinutesToOrder, 5);
    sendOrderNotifications(fifteenMinutesToOrder, 15);
    sendOrderNotifications(thirtyMinutesToOrder, 30);
}

function sendOrderNotifications(NTime, minutesToOrder) {
    let notificationText = (minutesToOrder === 0 ? `Orders are due now! Get them in ASAP!` : `Order is due in ${minutesToOrder} minutes!`);
    let notification = schedule.scheduleJob(NTime, () => {
        axios.post('https://hooks.slack.com/services/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', {
            text: notificationText,
        }).then((res) => {
            console.log(`statusCode: ${res.statusCode}`);
        }).catch((error) => {
            console.log(error);
        });
    })
}
