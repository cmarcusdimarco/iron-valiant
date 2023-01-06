const { SlashCommandBuilder } = require("discord.js");
const { getCoachNameCommand, givePiplupCommand } = require('../google.js');

// A test command to make sure the bot can access the Google Sheets as needed
module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-piplup')
        .setDescription('Gives the requestor a Piplup.'),
    async execute(interaction) {
        const coachName = await getCoachNameCommand(interaction.user.username);
        if (!coachName || typeof coachName === 'Error') {
            await interaction.reply(`I wasn't able to find a coach by your username, ${interaction.user.username}.`); 
        }
        await givePiplupCommand(coachName);
        await interaction.reply(`Done. Coach ${coachName} now has a Piplup.`);
    },
};