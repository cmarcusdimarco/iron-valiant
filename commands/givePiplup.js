const { SlashCommandBuilder } = require("discord.js");
const { givePiplupCommand } = require('../google.js');
// const dex = require('../google.js').getDex();
// const monsUnavailable = require('../google.js').getDrafted();

// A test command to make sure the bot can access the Google Sheets as needed
module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-piplup')
        .setDescription('Gives the requestor a Piplup.'),
    async execute(interaction) {
        await interaction.reply('As you wish.');
        await givePiplupCommand(interaction.user.username);
    },
};