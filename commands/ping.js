const { SlashCommandBuilder } = require("discord.js");

// A test command to make sure the bot can receive a command and reply in turn
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Keep yourself safe.'),
    async execute(interaction) {
        await interaction.reply('Keep yourself safe.');
    },
};