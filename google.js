const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { SlashCommandSubcommandGroupBuilder } = require('discord.js');

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
 * Returns the name of the coach based on a specified Discord username:
 * @see https://docs.google.com/spreadsheets/d/1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {string} discordName The Discord username of the coach.
 */
async function getCoachName(auth, discordName) {
  // Forward the authentication to the sheets API requestor
  const sheets = google.sheets({version: 'v4', auth});
  // Make a GET request to the sheet
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q',
    range: 'Coaches!E1:R53',
    majorDimension: 'COLUMNS'
  });
  // Parse the response
  const columns = res.data.values;
  // Exit the function if no data present
  if (!columns || columns.length === 0) {
    throw new Error('No data found.');
  }
  // Iterate through the columns, and upon matching the Discord name, return the coach name.
  for (let i = 0; i < columns.length; i++) {
    for (let j = 0; j < columns[i].length; j++) {
      if (columns[i][j] === discordName) {
        return columns[i+1][j-6];
      }
    }
  }

  return Error('Coach not found.');
}

/**
 * Returns the index that points to the specified coach's roster:
 * @see https://docs.google.com/spreadsheets/d/1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {string} coachName The name of the coach to match in the query.
 */
async function getRosterIndex(auth, coachName) {
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
    const indexToUpdate = await getRosterIndex(auth, coachName);
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

async function getPointsForTargetPokemon(auth, target) {
  const response = [];
  // Forward the authentication to the sheets API requestor
  const sheets = google.sheets({version: 'v4', auth});
  // Make a GET request to the sheet
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q',
    range: 'Point Tier List!A1:CI77',
    majorDimension: 'COLUMNS'
  });
  // Parse the response
  const columns = res.data.values;
  // Iterate through the response searching for the targets
  for (let i = 9; i < columns.length; i += 4) {
    for (let j = 8; j < columns[i].length; j++) {
      // On finding a match, push an object to the response array if it is available
      if (target.includes(columns[i][j])) {
        if (columns[i+1][j] !== '' && columns[i+1][j] !== undefined) {
          return Error(`It seems as though ${columns[i][j]} is already on a team.`);
        } else {
          response.push({name: columns[i][j], points: columns[i-1][5]});
        }
      }
    }
  }
  // Return the response
  return response;
}

async function transaction(auth, coachName, drops, pickups) {
  // Forward the authentication to the sheets API requestor
  const sheets = google.sheets({version: 'v4', auth});
  // Get the roster index of the specified coach
  const rosterIndex = await getRosterIndex(auth, coachName);
  // Get the point values for the pickups
  const pickupsWithPoints = await getPointsForTargetPokemon(auth, pickups);
  if (pickupsWithPoints instanceof Error) {
    return pickupsWithPoints;
  }
  // Make a GET request to the sheet
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: '1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q',
    ranges: [
      `Rosters!L${rosterIndex}:W${rosterIndex}`,          // Roster to update
      `Rosters!L${rosterIndex - 8}:W${rosterIndex - 8}`,  // Roster points
      `Rosters!H${rosterIndex}`,                          // Initial remaining points
      `${coachName}!K18`                                  // Number of transactions remaining
    ],
  });
  // Parse the responses
  const targetRoster = res.data.valueRanges[0].values[0];
  const targetRosterPoints = res.data.valueRanges[1].values[0];
  const initialPointsRemaining = parseInt(res.data.valueRanges[2].values[0][0]);
  const transactionsRemaining = parseInt(res.data.valueRanges[3].values[0][0]);

  console.log(`To be dropped: ${drops.join(', ')}`);
  console.log(`To be picked up: ${pickups.join(', ')}`);

  console.log(`Transactions remaining: ${transactionsRemaining}`);
  
  // Validate number of transactions is sufficient
  if (pickups.length > transactionsRemaining) {
    return Error(`It seems you do not have enough transactions remaining to complete this request.`);
  }

  // Validate coach will not violate rules
  if (targetRoster.length - drops.length + pickups.length < 10 ||
      targetRoster.length - drops.length + pickups.length > 12) {
        return Error(`It seems this transaction will violate the league's rules on team size.`);
      }

  // Validate coach has enough points to make transaction
  let dropsPoints = initialPointsRemaining;
  for (let i = 0; i < targetRoster.length; i++) {
    if (drops.includes(targetRoster[i])) {
      dropsPoints += parseInt(targetRosterPoints[i]);
    }
  }

  let pickupsPoints = 0;
  for (let i = 0; i < pickupsWithPoints.length; i++) {
    pickupsPoints += parseInt(pickupsWithPoints[i].points);
  }

  console.log(`Drops points: ${dropsPoints}`);
  console.log(`Pickups points: ${pickupsPoints}`);

  if (dropsPoints < pickupsPoints) {
    return Error(`It seems this won't give you enough points to pick up those Pokémon. Transaction not completed.`);
  }

  // Compile values to update
  let updatedTransactionsValues = [[]];
  const updatedTransactionsRemaining = (transactionsRemaining - pickups.length).toString();
  updatedTransactionsValues[0].push(updatedTransactionsRemaining);

  let updatedRosterValues = [[]];
  for (let i = 0; i < targetRoster.length; i++) {
    if (drops.includes(targetRoster[i]) && pickups.length != 0) {
      updatedRosterValues[0].push(pickups.shift());
    } else if (drops.includes(targetRoster[i])) {
      updatedRosterValues[0].push('');
    } else {
      updatedRosterValues[0].push(targetRoster[i]);
    }
  }
  while (pickups.length != 0) {
    updatedRosterValues[0].push(pickups.shift());
  }

  // Provide data for resource
  const data = [
    {
      range: `Rosters!L${rosterIndex}:W${rosterIndex}`,
      values: updatedRosterValues
    },
    {
      range: `${coachName}!K18`,
      values: updatedTransactionsValues
    }
  ];

  // Define resource
  const resource = {
    data: data,
    valueInputOption: 'USER_ENTERED'
  }

  try {
    const result = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: '1-pKd7FVAo_ciEFYTUVYQyvK5vK2Ich31cOMoUhPcf-Q',
      resource
    });
    console.log('%d cells updated', result.data.totalUpdatedCells);
    return result;
  } catch (err) {
    throw err;
  }
}

exports.transactionCommand = function(coachName, drops, pickups) {
  const response = authorize().then((client) => transaction(client, coachName, drops, pickups)).catch(console.error);
  return response;
}

exports.getCoachNameCommand = function(discordName) {
  const coachName = authorize().then((client) => getCoachName(client, discordName)).catch(console.error);
  return coachName;
}

exports.givePiplupCommand = function(coachName) {
  authorize().then((client) => givePiplup(client, coachName)).catch(console.error);
}