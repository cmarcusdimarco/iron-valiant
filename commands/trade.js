const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ComponentType } = require("discord.js");
const { getCoachNameCommand, validateTradeCommand, tradeCommand } = require('../google.js');
require('dotenv').config();

// A command which conducts a valid and accepted trade between two coaches.
module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Conducts a valid trade between two coaches.')
        .addUserOption(option =>
            option.setName('coach')
                .setDescription('The receiving coach in the trade.')
                .setRequired(true))
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
        // Parse the data
        const coachA = await getCoachNameCommand(interaction.user.username);
        const discordUserB = interaction.options.getUser('coach');
        const coachB = await getCoachNameCommand(discordUserB.username);
        const gives = interaction.options.getString('gives').split(',');
        const receives = interaction.options.getString('receives').split(',');
        // Validate the input
        if (!coachB || coachB instanceof Error) {
            await interaction.editReply(`I was not able to confirm that ${discordUserB} is a coach in the league.\n` +
                                        `If you feel this message was received in error, please have <@${process.env.MARCUS_ID}> review the logs.`);
            return;
        }
        const coaches = await validateTradeCommand(coachA, coachB, gives, receives);
        // If trade is valid, send proposal to named coach
        if (!coaches || coaches instanceof Error) {
            await interaction.editReply(`An error was logged with the following message:\n${coaches.message}`);
            return;
        }
        await interaction.editReply(`${discordUserB.username}, it seems <@${interaction.user.id}> would like to propose the following trade:\n\n` +
                                    `${interaction.user.username} trades:\n` +
                                    `${gives.join('\n')}\n\n` +
                                    `${discordUserB.username} trades:\n` +
                                    `${receives.join('\n')}`);
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accepted')
                    .setLabel('Accept trade')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('declined')
                    .setLabel('Decline trade')
                    .setStyle(ButtonStyle.Danger)
            )
        await interaction.followUp({ content: `Would you like to accept this trade, ${discordUserB.username}?`, components: [buttonRow] });
        // If named coach approves, conduct trade
        // If named coach denies, notify original coach
        // If trade times out, notify both
    },
};