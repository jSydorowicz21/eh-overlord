const { fetchPlayerStats, handleTeamOperation, deleteTeam, setCaptain, getUserAndRank, sendTestMessage} = require("./playerHandler");
const db = require('./mongoHandler');
const analyzeStats = require('../utils/openAiHelper');
const logger = require('../utils/logger');

const handleInteraction = async (interaction, client) => {
    if (!interaction.isCommand()) return;

    const checkAccess = async (interaction, type) => {
        const allowedChannelIds = ['1239378714907770982', '1239378714907770982', '1160694040887578664'];
        const staffRoleNames = ['M2TheMichael', 'Besties (SuperMods)', 'Moderator', 'HEH Admin', 'MEH Admin', 'LEH Admin'];
        const captainRoleNames = ['High Elo Captains', 'Low Elo Captains', 'Mid Elo Captains'];
        const botOwnerId = '138673796675534848';

        let roles;
        if (type === 'staff') {
            roles = staffRoleNames;
        } else if (type === 'captain') {
            roles = captainRoleNames;
            roles.push(...staffRoleNames);
        } else if (type === 'all') {
            roles = staffRoleNames;
            roles.push(...captainRoleNames);
        } else if (type === 'player') {
            roles = await db.getAllTeamRoleIds();
            roles = roles.map(roleId => (interaction.guild.roles.cache.get(roleId))).filter(roleName => roleName).map(role => role.name);
            roles.push(...staffRoleNames);
            roles.push(...captainRoleNames);
        }

        if (interaction.guildId === '888886704080031865') {
            if (allowedChannelIds.includes(interaction.channelId)) {
                return true;
            }
            if (interaction.user.id === botOwnerId) {
                return true;
            }
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                const hasRole = roles.some(roleName => member.roles.cache.some(role => role.name === roleName));
                if (hasRole) {
                    return true;
                }
            }
        } else {
            return true;
        }

        return false;
    };

    if (interaction.commandName === 'check') {
        if (!await checkAccess(interaction, 'staff')) {
            await interaction.reply('You do not have permission to use this command.');
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
            await interaction.editReply('There was an error fetching the stats or analyzing them.');
        }
    }

    if (interaction.commandName === 'add_player' || interaction.commandName === 'remove_player') {
        try {
            if (!await checkAccess(interaction, 'captain')) {
                await interaction.reply('You do not have permission to use this command.');
                return;
            }
            const type = interaction.commandName === 'add_player' ? 'add' : 'remove';
            await handleTeamOperation(interaction, type, client);
        } catch (error) {
            logger.error('Failed to add or remove player:', error);
            await interaction.editReply(`There was an error adding or removing the player. <@138673796675534848>, please check the logs.`);
        }
    }

    if (interaction.commandName === 'send_voting_message') {
        if (!await checkAccess(interaction, 'staff')) {
            await interaction.reply('You do not have permission to use this command.');
            return;
        }
        await interaction.deferReply();
        await sendTestMessage(client);
        await interaction.editReply('Voting message sent.');
    }

    if (interaction.commandName === 'team') {
        try {
            if (!await checkAccess(interaction, 'all')) {
                await interaction.reply('You do not have permission to use this command.');
                return;
            }
            await interaction.deferReply();
            const playerDiscordId = interaction.options.getUser('player_discord_id').id;
            const team = await db.getTeamByPlayer(playerDiscordId);
            if (team) {
                await interaction.editReply(`Team ${team.name} with captain ${team.captain} has the following players: ${team.players.map(player => ` [${player.riotId}](https://tracker.gg/valorant/profile/riot/${encodeURIComponent(player.riotId)}/overview?season=all)`).join(', ')}`);
            } else {
                await interaction.editReply('No team found for the given captain.');
            }
        } catch (error) {
            logger.error('Failed to get team:', error);
            await interaction.editReply(`There was an error getting the team. <@138673796675534848>, please check the logs.`);
        }
    }

    if (interaction.commandName === 'list_teams') {
        try {
            await interaction.deferReply();
            const teams = await db.getTeams();
            const teamInfo = teams.map(team =>
                `**${team.name}** (Captain: ${team.captain})\nPlayers: ${team.players.map(player => player.riotId).join(', ')}`
            ).join('\n\n');
            await interaction.editReply(teamInfo || 'No teams found.');
        } catch (error) {
            logger.error('Failed to list teams:', error);
            await interaction.editReply('There was an error listing the teams.');
        }
    }

    if (interaction.commandName === 'get_player_info') {
        try {
            await interaction.deferReply();
            const playerDiscordId = interaction.options.getUser('discord_id').id;
            const player = await db.getPlayerByDiscordId(playerDiscordId);
            if (player) {
                await interaction.editReply(`**${player.name}**\nRiot ID: ${player.riotId}\nTeam: ${player.team ? player.team.name : 'None'}`);
            } else {
                await interaction.editReply('Player not found.');
            }
        } catch (error) {
            logger.error('Failed to get player info:', error);
            await interaction.editReply('There was an error getting the player info.');
        }
    }

    if (interaction.commandName === 'update_riot_id') {
        try {
            if (!await checkAccess(interaction, 'player')) {
                await interaction.reply('You do not have permission to use this command.');
                return;
            }
            await interaction.deferReply();
            const newRiotId = interaction.options.getString('new_riot_id');
            const user = await getUserAndRank(newRiotId);
            if (!user) {
                await interaction.editReply('Riot ID not found.');
                return;
            }
            const discordId = interaction.user.id;
            await db.updateRiotId(discordId, newRiotId);
            await interaction.editReply(`Riot ID updated for ${client.guilds.cache.get(interaction.guildId).members.cache.get(discordId).displayName}`);
        } catch (error) {
            logger.error('Failed to update Riot ID:', error);
            await interaction.editReply('There was an error updating the Riot ID');
        }
    }

    if (interaction.commandName === 'staff') {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create_team') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const teamName = interaction.options.getString('team_name');
                const captainName = interaction.options.getString('captain_name');
                const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
                const teamChannel = interaction.options.getChannel('team_channel');
                const teamRole = interaction.options.getRole('team_role');
                const team = await db.createTeam(teamName, captainDiscordId, captainName, teamChannel.id, teamRole.id);

                const guild = interaction.guild;
                const member = guild.members.cache.get(captainDiscordId);
                if (member) {
                    await member.roles.add(guild.roles.cache.get(teamRole.id));
                }

                await interaction.editReply(`Team ${teamName} has been created with ${captainName} as the captain.`);
            } catch (error) {
                logger.error('Failed to create team:', error);
                await interaction.editReply(`There was an error creating the team. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'delete_team') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const captainId = interaction.options.getUser('captain_discord_id').id;
                const team = await deleteTeam(captainId);

                const guild = interaction.guild;
                const teamRoleId = team.teamRoleId;
                const members = await guild.members.fetch();
                members.forEach(async member => {
                    if (member.roles.cache.has(teamRoleId)) {
                        await member.roles.remove(guild.roles.cache.get(teamRoleId));
                    }
                });

                await interaction.editReply(`Team ${team.name} has been deleted.`);
            } catch (error) {
                logger.error('Failed to delete team:', error);
                await interaction.editReply(`There was an error deleting the team. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'set_team_channel') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const teamName = interaction.options.getString('team_name');
                const channelId = interaction.options.getChannel('channel_id').id;
                await db.setTeamChannel(teamName, channelId);
                await interaction.editReply(`Team channel set for ${teamName}`);
            } catch (error) {
                logger.error('Failed to set team channel:', error);
                await interaction.editReply(`There was an error setting the team channel. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'set_captain') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const newCaptainDiscord = interaction.options.getUser('captain_discord_id');
                const teamName = interaction.options.getString('team_name');
                await setCaptain(newCaptainDiscord, teamName);

                const guild = interaction.guild;
                const member = guild.members.cache.get(newCaptainDiscord.id);
                const team = await db.getTeamByCaptain(newCaptainDiscord.id);
                if (member && team) {
                    await member.roles.add(guild.roles.cache.get(team.teamRoleId));
                }

                await interaction.editReply(`Captain ${newCaptainDiscord.displayName} set for team ${teamName}`);
            } catch (error) {
                logger.error('Failed to set captain:', error);
                await interaction.editReply(`There was an error setting the captain. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'override_add') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const riotId = interaction.options.getString('riot_id');
                const discordId = interaction.options.getUser('discord_id').id;
                const playerName = riotId.split('#')[0];
                const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
                const player = await db.addPlayerToTeam(riotId, discordId, playerName, captainDiscordId);

                const guild = interaction.guild;
                const member = guild.members.cache.get(discordId);
                if (member) {
                    const role = guild.roles.cache.get(player.team.teamRoleId);
                    await member.roles.add(role);
                }

                const nickName = member ? member.displayName : playerName;
                await interaction.editReply(`Player ${nickName} added to the team.`);
            } catch (error) {
                logger.error('Failed to add player:', error);
                await interaction.editReply(`There was an error adding the player. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'override_remove') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const playerDiscordId = interaction.options.getUser('player_discord_id').id;
                const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
                const response = await db.removePlayerFromTeam(playerDiscordId, captainDiscordId);

                const guild = interaction.guild;
                const member = guild.members.cache.get(response.player.discordId);
                if (member) {
                    const teamRoleId = response.team.teamRoleId;
                    const role = guild.roles.cache.get(teamRoleId);
                    if (role) await member.roles.remove(role);
                }

                const nickName = member ? member.displayName : response.player.name;
                await interaction.editReply(`Player ${nickName} removed from the team.`);
            } catch (error) {
                logger.error('Failed to remove player:', error);
                await interaction.editReply(`There was an error removing the player. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'update_team_info') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const teamName = interaction.options.getString('team_name');
                const newTeamName = interaction.options.getString('new_team_name');
                const newCaptainDiscordId = interaction.options.getUser('new_captain_discord_id').id;
                await db.updateTeamInfo(teamName, newTeamName, newCaptainDiscordId);
                await interaction.editReply(`Team info updated for ${teamName}`);
            } catch (error) {
                logger.error('Failed to update team info:', error);
                await interaction.editReply('There was an error updating the team info.');
            }
        }

        if (subcommand === 'set_team_role') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const teamName = interaction.options.getString('team_name');
                const roleId = interaction.options.getRole('role_id').id;
                await db.assignTeamRole(teamName, roleId);
                await interaction.editReply(`Role assigned to team ${teamName}`);
            } catch (error) {
                logger.error('Failed to assign team role:', error);
                await interaction.editReply('There was an error assigning the team role.');
            }
        }

        if (subcommand === 'set_riot_id') {
            try {
                if (!await checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply();
                const discordId = interaction.options.getUser('discord_id').id;
                const newRiotId = interaction.options.getString('new_riot_id');
                const user = await getUserAndRank(newRiotId);
                if (!user) {
                    await interaction.editReply('Riot ID not found.');
                    return;
                }
                const player = await db.updateRiotId(discordId, newRiotId);
                await interaction.editReply(`Riot ID updated for ${player.name}`);
            } catch (error) {
                logger.error('Failed to update Riot ID:', error);
                await interaction.editReply('There was an error updating the Riot ID');
            }
        }
    }
};

module.exports = handleInteraction;
