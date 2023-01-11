const { SlashCommandBuilder } = require("discord.js");
const { getCoachNameCommand } = require('../google.js');
require('dotenv').config();

// A command which conducts a valid and accepted trade between two coaches.
module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Conducts a valid trade between two coaches.')
        .addStringOption(option =>
            option.setName('coach')
                .setDescription('The receiving coach in the trade.')
                .setRequired(true)
                .addChoices(
                    { name: 'Blitz', value: process.env.BLITZ_ID },
                    { name: 'Cow', value: process.env.COW_ID },
                    { name: 'Daniel', value: process.env.DANIEL_ID },
                    { name: 'Dayy', value: process.env.DAYY_ID },
                    { name: 'Ice', value: process.env.ICE_ID },
                    { name: 'Jimmy', value: process.env.JIMMY_ID },
                    { name: 'Kyle', value: process.env.KYLE_ID },
                    { name: 'Leo', value: process.env.LEO_ID },
                    { name: 'Mando', value: process.env.MANDO_ID },
                    { name: 'Marcus', value: process.env.MARCUS_ID },
                    { name: 'MattMitchie', value: process.env.MATTMITCHIE_ID },
                    { name: 'Mort', value: process.env.MORT_ID },
                    { name: 'Psyco', value: process.env.PSYCO_ID },
                    { name: 'Riot', value: process.env.RIOT_ID },
                    { name: 'Roy', value: process.env.ROY_ID },
                    { name: 'Ryan', value: process.env.RYAN_ID },
                    { name: 'Sky', value: process.env.SKY_ID },
                    { name: 'Wumbles', value: process.env.WUMBLES_ID }
                ))
        .addStringOption(option =>
            option.setName('gives')
                .setDescription('The comma-separated, case-sensitive Pokémon to be traded away.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('receives')
                .setDescription('The comma-separated, case-sensitive Pokémon to be received in the trade.')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        // Validate the input
        const coachA = await getCoachNameCommand(interaction.user.username);
        const gives = interaction.options.getString('gives').split(',');
        const receives = interaction.options.getString('receives').split(',');
        // If trade is valid, send proposal to named coach
        // If named coach approves, conduct trade
        // If named coach denies, notify original coach
        // If trade times out, notify both
    },
};