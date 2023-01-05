const { SlashCommandBuilder } = require("discord.js");

// A test command to make sure the bot can receive a command and reply in turn
module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Provides information about the user.'),
    async execute(interaction) {
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember obect, which represents the user in the specific guild
        await interaction.reply(`This command was run by ${interaction.user.username}, who entered this strange land on ${interaction.member.joinedAt}.`);
    },
};