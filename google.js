const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Prints the team names within the sheet:
 * @see https://docs.google.com/spreadsheets/d/1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listTeams(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q',
    range: 'Rosters!E8:E',
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return;
  }
  console.log('Team Name: ');
  rows.forEach((row) => {
    if (row[0] === 'ARC.' ||
        row[0] === 'Remaining Points:' ||
        row[0] === undefined) {
    } else {
      console.log(`${row[0]}`);
    }
  });
}

/**
 * Prints the passed coach's roster within the sheet:
 * @see https://docs.google.com/spreadsheets/d/1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function returnRosterIndex(auth, coachName) {
  // Forward the authentication to the sheets API requestor
  const sheets = google.sheets({version: 'v4', auth});
  // Make a GET request to the sheet
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: '1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q',
    ranges: [
      'Rosters!H1:H221',  // Coach
      'Rosters!L1:V221'   // Pokémon
    ],
  });
  // Parse the response into coach and Pokémon tables
  const coachRows = res.data.valueRanges[0].values;
  const pokemonRows = res.data.valueRanges[1].values;
  const pokemonCoachDifferential = 6; // Distance between coach cell and that coach's roster
  // Exit the function if no data present (should probably check the full valueRanges response, but same thing)
  if (!coachRows || coachRows.length === 0) {
    console.log('No data found.');
    return;
  }
  // If data present, return the corresponding Pokémon roster index
  for (let i = 0; i < coachRows.length; i++) {
    if (coachRows[i][0] === coachName) {
      console.log(`Coach ${coachName} has ${pokemonRows[i + pokemonCoachDifferential].join(', ')}`);
      return i + pokemonCoachDifferential + 1;
    }
  }
}

/**
 * Gives a coach a Piplup:
 * @see https://docs.google.com/spreadsheets/d/1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function givePiplup(auth, coachName) {
  const sheets = google.sheets({version: 'v4', auth});
  let values = [
    ['Piplup']
  ];
  const resource = {
    values,
  };
  try {
    const indexToUpdate = await returnRosterIndex(auth, coachName);
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: '1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q',
      range: `Rosters!V${indexToUpdate}`,
      valueInputOption: 'USER_ENTERED',
      resource
    });
    console.log('%d cells updated.', result.data.updatedCells);
    return result;
  } catch (err) {
    throw err;
  }
}

exports.givePiplupCommand = function(username) {
  authorize().then((client) => givePiplup(client, username)).catch(console.error);
}