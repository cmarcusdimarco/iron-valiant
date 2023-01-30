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
        await interaction.editReply(`${discordUserB}, it seems <@${interaction.user.id}> would like to propose the following trade:\n\n` +
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
            );
        await interaction.followUp({ content: `Would you like to accept this trade, ${discordUserB.username}?`, components: [buttonRow] });
        
        // Process the new input
        const channel = interaction.channel;
        const collector = channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 900000 });
        let reacted = false;
        
        collector.on('collect', async i => {
            if (i.user.id !== discordUserB.id) {
                // Only accept button input from the desired coach
                await i.reply({ content: `This trade was proposed to ${discordUserB.username}, not you!`, ephemeral: true });
            } else if (i.customId === 'accepted') {
                // If named coach approves, conduct trade
                await i.update(`${discordUserB.username} accepted the trade! Processing...`);
                const response = await tradeCommand(coaches);
                if (!response || response instanceof Error) {
                    i.followUp(`An error was logged with the following message:\n${response.message}`);
                } else {
                    i.followUp(`Trade accepted! I've updated the league document to reflect the above trade.`);
                }
                reacted = true;
                collector.stop();
            } else if (i.customId === 'declined') {
                // If named coach denies, notify original coach
                await i.update(`${discordUserB.username} declined the trade. How tragic.`);
                reacted = true;
                collector.stop();
            }
        });

        collector.on('end', async () => {
            if (!reacted) {
                // If trade times out, notify both
                await channel.send(`I didn't receive a response from ${discordUserB} within the allotted time. The trade is no longer active.`);
            }
        })
    },
};