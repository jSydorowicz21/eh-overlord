const { fetchPlayerStats, handleTeamOperation, deleteTeam, setCaptain, getUserAndRank, sendTestMessage, verifyRiotId,
    promptCoachReplacement, handleCoachOperation
} = require("./playerHandler");
const db = require('./mongoHandler');
const analyzeStats = require('../utils/openAiHelper');
const logger = require('../utils/logger');
const errorNoticeHelper = require("../utils/errorNoticeHelper");
const { checkAccess, handleSubcommand, handleTeamCreation, handleTeamDeletion, handleSetTeamChannel, handleSetCaptain, handleOverrideAdd, handleOverrideRemove, handleUpdateTeamInfo, handleSetTeamRole, handleSetRiotId,
    handleSetManager,
    handleAddCoach,
    handleRemoveCoach
} = require('../utils/helperFunctions');
const {ButtonBuilder, ActionRowBuilder, EmbedBuilder, Colors} = require("discord.js");
const {ButtonStyle} = require("discord-api-types/v10");

const handleInteraction = async (interaction, client) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'check') {
        if (!await checkAccess(interaction, 'staff', db)) {
            return;
        }
        await interaction.deferReply();
        const riotId = interaction.options.getString('riot_id');
        try {
            const stats = await fetchPlayerStats(riotId);
            const analysis = await analyzeStats(stats);
            await interaction.editReply(`Analysis of ${riotId}:\n${analysis}`);
        } catch (error) {
            logger.error('Failed to fetch or analyze stats:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'add_player' || interaction.commandName === 'remove_player') {
        if (!await checkAccess(interaction, 'captain', db)) {
            return;
        }
        const type = interaction.commandName === 'add_player' ? 'add' : 'remove';
        try {
            await handleTeamOperation(interaction, type, client);
        } catch (error) {
            logger.error('Failed to add or remove player:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'add_coach' || interaction.commandName === 'remove_coach') {
        if (!await checkAccess(interaction, 'captain', db)) {
            return;
        }
        interaction.deferReply({ ephemeral: true});
        const type = interaction.commandName === 'add_coach' ? 'add' : 'remove';
        try {
            const guild = client.guilds.cache.get(interaction.guildId);
            const coachId = interaction.options.getUser('discord_id').id;
            const coachDiscord = guild.members.cache.get(coachId);
            const riotId = interaction.options.getString('riot_id');
            const requesterId = interaction.user.id;
            await handleCoachOperation(coachId, coachDiscord, riotId, requesterId, type, interaction, client);
        } catch (error) {
            logger.error('Failed to add or remove coach:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'team') {
        if (!await checkAccess(interaction, 'all', db)) {
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const playerDiscordId = interaction.options.getUser('player_discord_id').id;
        try {
            const team = await db.getTeamByPlayer(playerDiscordId);
            if (team) {
                let reply = `Team ${team.name} with captain <@${team.captainDiscordId}> `;
                if (team.managerDiscordId) {
                    reply += `and manager <@${team.managerDiscordId}> `;
                }
                reply += `has the following players: 
                    ${team.players.map(player => ` [${player.riotId}](https://tracker.gg/valorant/profile/riot/${encodeURIComponent(player.riotId)}/overview?season=all)`).join(', ')}`;

                if (team.coaches && team.coaches.length > 0) {
                    await team.populate('coaches');
                    reply += `\n and these Coaches: \n ${team.coaches.map(coach => `<@${coach.discordId}>`).join(', ')}`;
                }
                await interaction.editReply(reply);
            } else {
                await interaction.editReply('No team found for the given user.');
            }
        } catch (error) {
            logger.error('Failed to get team:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'list_teams') {
        if (!await checkAccess(interaction, 'all', db)) {
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        try {
            const teams = await db.getTeams();

            if (teams.length === 0) {
                await interaction.editReply('No teams found.');
                return;
            }

            const components = [];
            for (const team of teams) {
                const button = new ButtonBuilder()
                    .setCustomId(`team_${team._id}`)
                    .setLabel(team.name)
                    .setStyle(ButtonStyle.Primary);
                components.push(button);
            }

            const rows = [];
            for (let i = 0; i < components.length; i += 5) {
                const row = new ActionRowBuilder().addComponents(components.slice(i, i + 5));
                rows.push(row);
            }

            await interaction.editReply({
                content: 'Select a team to view details:',
                components: rows
            });

            const filter = i => i.customId.startsWith('team_') && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60 * 1000 * 5 });

            collector.on('collect', async i => {
                const teamId = i.customId.split('_')[1];
                const team = await db.getTeamById(teamId);

                if (team) {
                    let reply = `Team ${team.name} with captain <@${team.captainDiscordId}> `;
                    if (team.managerDiscordId) {
                        reply += `and manager <@${team.managerDiscordId}> `;
                    }
                    reply += `has the following players: 
                    ${team.players.map(player => ` [${player.riotId}](https://tracker.gg/valorant/profile/riot/${encodeURIComponent(player.riotId)}/overview?season=all)`).join(', ')}`;

                    if (team.coaches && team.coaches.length > 0) {
                        await team.populate('coaches');
                        reply += `\n and these Coaches: \n ${team.coaches.map(coach => `<@${coach.discordId}>`).join(', ')}`;
                    }
                    const embed = new EmbedBuilder()
                        .setTitle(team.name)
                        .setDescription(reply)
                        .setColor(Colors.Blue);

                    await i.reply({ embeds: [embed], ephemeral: true });
                } else {
                    await i.reply({ content: 'Team not found.', ephemeral: true });
                }
            });

            collector.on('end', collected => {
                interaction.editReply({ content: 'Select a team to view details: (interaction ended)', components: [] });
            });
        } catch (error) {
            logger.error('Failed to list teams:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'get_player_info') {
        try {
            if (!await checkAccess(interaction, 'all', db)) {
                return;
            }
            await interaction.deferReply({ ephemeral: true });
            const playerDiscordId = interaction.options.getUser('discord_id').id;

            const player = await db.getPlayerByDiscordId(playerDiscordId);
            if (player) {
                await interaction.editReply(`**${player.name}**\nRiot ID: ${player.riotId}\nTeam: ${player.team ? player.team.name : 'None'}`);
            } else {
                await interaction.editReply('Player not found.');
            }
        } catch (error) {
            logger.error('Failed to get player info:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'update_riot_id') {
        try {
            if (!await checkAccess(interaction, 'player', db)) {
                return;
            }
            await interaction.deferReply({ ephemeral: true });
            const newRiotId = interaction.options.getString('new_riot_id');

            if (!await verifyRiotId(newRiotId)) {
                await interaction.editReply('Invalid Riot ID, please double check the riot ID or unprivate your tracker');
                return;
            }
            const discordId = interaction.user.id;
            await db.updateRiotId(discordId, newRiotId);
            await interaction.editReply(`Riot ID updated for ${client.guilds.cache.get(interaction.guildId).members.cache.get(discordId).displayName}`);
        } catch (error) {
            logger.error('Failed to update Riot ID:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'staff') {
        const subcommandHandler = {
            create_team: (interaction, client) => handleTeamCreation(interaction, client, db, logger, errorNoticeHelper),
            delete_team: (interaction, client) => handleTeamDeletion(interaction, client, db, logger, errorNoticeHelper),
            set_team_channel: (interaction, client) => handleSetTeamChannel(interaction, client, db, logger, errorNoticeHelper),
            set_captain: (interaction, client) => handleSetCaptain(interaction, client, db, logger, errorNoticeHelper),
            set_manager: (interaction, client) => handleSetManager(interaction, client, db, logger, errorNoticeHelper),
            override_add: (interaction, client) => handleOverrideAdd(interaction, client, db, logger, errorNoticeHelper),
            override_remove: (interaction, client) => handleOverrideRemove(interaction, client, db, logger, errorNoticeHelper),
            update_team_info: (interaction, client) => handleUpdateTeamInfo(interaction, client, db, logger, errorNoticeHelper),
            set_team_role: (interaction, client) => handleSetTeamRole(interaction, client, db, logger, errorNoticeHelper),
            set_riot_id: (interaction, client) => handleSetRiotId(interaction, client, db, logger, errorNoticeHelper),
            add_coach: (interaction, client) => handleAddCoach(interaction, client, db, logger, errorNoticeHelper),
            remove_coach: (interaction, client) => handleRemoveCoach(interaction, client, db, logger, errorNoticeHelper),
        };

        await handleSubcommand(interaction, client, subcommandHandler);
    }
};

module.exports = handleInteraction;
