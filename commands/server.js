const { SlashCommandBuilder } = require("discord.js");

// A test command to make sure the bot can receive a command and reply in turn
module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.'),
    async execute(interaction) {
        // interaction.guild is the object representing the Guild in which the command was run.
        await interaction.reply(`This strange land is known as ${interaction.guild.name}, and appears to have ${interaction.guild.memberCount} citizens.`);
    },
};