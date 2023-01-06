const { SlashCommandBuilder } = require("discord.js");
const { getCoachNameCommand, transactionCommand } = require('../google.js');

// A command which 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('transaction')
        .setDescription('Completes a valid transaction request for the user.')
        .addStringOption(option =>
            option.setName('pickups')
                .setDescription('The comma-separated, case-sensitive Pokémon to be picked up.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('drops')
                .setDescription('The comma-separated, case-sensitive Pokémon to be dropped.')),
    async execute(interaction) {
        await interaction.deferReply();
        const coachName = await getCoachNameCommand(interaction.user.username);
        let drops = [];
        if (interaction.options.getString('drops')) {
            drops = interaction.options.getString('drops').split(',');
        }
        let pickups = interaction.options.getString('pickups').split(',');
        if (!coachName || coachName instanceof Error) {
            await interaction.editReply(`I wasn't able to find a coach by your username, ${interaction.user.username}.`); 
        }
        const response = await transactionCommand(coachName, drops, pickups);
        if (response instanceof Error) {
            await interaction.editReply(`An error was logged with the following message:\n${response.message}`);
        } else {
            // Reassign mutated array
            pickups = interaction.options.getString('pickups').split(',');
            await interaction.editReply(`I've updated the league document to reflect these changes:\n\nDrops:\n${drops ? drops.join('\n') : 'None'}\n\nPickups:\n${pickups.join('\n')}\n\nPlease check to confirm their accuracy.`);
        }
    },
};