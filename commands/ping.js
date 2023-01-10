const { SlashCommandBuilder } = require("discord.js");

// A test command to make sure the bot can receive a command and reply in turn
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong.'),
    async execute(interaction) {
        await interaction.reply('Pong.');
    },
};