const { fetchPlayerStats, handleTeamOperation, deleteTeam, setCaptain, getUserAndRank, sendTestMessage, verifyRiotId } = require("./playerHandler");
const db = require('./mongoHandler');
const analyzeStats = require('../utils/openAiHelper');
const logger = require('../utils/logger');
const errorNoticeHelper = require("../utils/errorNoticeHelper");
const { checkAccess, handleSubcommand, handleTeamCreation, handleTeamDeletion, handleSetTeamChannel, handleSetCaptain, handleOverrideAdd, handleOverrideRemove, handleUpdateTeamInfo, handleSetTeamRole, handleSetRiotId } = require('../utils/helperFunctions');

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

    if (interaction.commandName === 'send_voting_message') {
        if (!await checkAccess(interaction, 'staff', db)) {
            return;
        }
        await interaction.deferReply();
        await sendTestMessage(client);
        await interaction.editReply('Voting message sent.');
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
                await interaction.editReply(`Team ${team.name} with captain ${team.captain} has the following players: ${team.players.map(player => ` [${player.riotId}](https://tracker.gg/valorant/profile/riot/${encodeURIComponent(player.riotId)}/overview?season=all)`).join(', ')}`);
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
            const teamInfo = teams.map(team =>
                `**${team.name}** (Captain: ${team.captain})\nPlayers: ${team.players.map(player => player.riotId).join(', ')}`
            ).join('\n\n');
            await interaction.editReply(teamInfo || 'No teams found.');
        } catch (error) {
            logger.error('Failed to list teams:', error);
            await errorNoticeHelper(error, client, interaction);
        }
    }

    if (interaction.commandName === 'get_player_info') {
        if (!await checkAccess(interaction, 'all', db)) {
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const playerDiscordId = interaction.options.getUser('discord_id').id;
        try {
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
        if (!await checkAccess(interaction, 'player', db)) {
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const newRiotId = interaction.options.getString('new_riot_id');
        try {
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
            override_add: (interaction, client) => handleOverrideAdd(interaction, client, db, logger, errorNoticeHelper),
            override_remove: (interaction, client) => handleOverrideRemove(interaction, client, db, logger, errorNoticeHelper),
            update_team_info: (interaction, client) => handleUpdateTeamInfo(interaction, client, db, logger, errorNoticeHelper),
            set_team_role: (interaction, client) => handleSetTeamRole(interaction, client, db, logger, errorNoticeHelper),
            set_riot_id: (interaction, client) => handleSetRiotId(interaction, client, db, logger, errorNoticeHelper)
        };

        await handleSubcommand(interaction, client, subcommandHandler);
    }
};

module.exports = handleInteraction;
