const {getUserAndRank} = require("../handlers/playerHandler");

const checkAccess = async (interaction, type, db) => {
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
        return true;
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
    interaction.reply('You do not have permission to use this command.', { ephemeral: true });
    return false;
};

const handleSubcommand = async (interaction, client, subcommandHandler) => {
    const subcommand = interaction.options.getSubcommand();
    await subcommandHandler[subcommand](interaction, client);
};

const handleTeamCreation = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const teamName = interaction.options.getString('team_name');
    const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
    const captainName = client.guilds.cache.get(interaction.guildId).members.cache.get(captainDiscordId).displayName;
    const teamChannel = interaction.options.getChannel('team_channel');
    const teamRole = interaction.options.getRole('team_role');
    try {
        const team = await db.createTeam(teamName, captainDiscordId, captainName, teamChannel.id, teamRole.id);
        const guild = interaction.guild;
        const member = guild.members.cache.get(captainDiscordId);
        if (member) {
            await member.roles.add(guild.roles.cache.get(teamRole.id));
        }
        await interaction.editReply(`Team ${teamName} has been created with ${captainName} as the captain.`);
    } catch (error) {
        logger.error('Failed to create team:', error);
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleTeamDeletion = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const captainId = interaction.options.getUser('captain_discord_id').id;
    try {
        const team = await db.deleteTeam(captainId);

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
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleSetTeamChannel = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const teamName = interaction.options.getString('team_name');
    const channelId = interaction.options.getChannel('channel_id').id;
    try {
        await db.setTeamChannel(teamName, channelId);
        await interaction.editReply(`Team channel set for ${teamName}`);
    } catch (error) {
        logger.error('Failed to set team channel:', error);
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleSetCaptain = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const newCaptainDiscord = interaction.options.getUser('captain_discord_id');
    const teamName = interaction.options.getString('team_name');
    try {
        await db.setCaptain(newCaptainDiscord.id, newCaptainDiscord.displayName, teamName);

        const guild = interaction.guild;
        const member = guild.members.cache.get(newCaptainDiscord.id);
        const team = await db.getTeamByCaptain(newCaptainDiscord.id);
        if (member && team) {
            await member.roles.add(guild.roles.cache.get(team.teamRoleId));
        }

        await interaction.editReply(`Captain ${newCaptainDiscord.displayName} set for team ${teamName}`);
    } catch (error) {
        logger.error('Failed to set captain:', error);
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleOverrideAdd = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const riotId = interaction.options.getString('riot_id');
    const discordId = interaction.options.getUser('discord_id').id;
    const playerName = riotId.split('#')[0];
    const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
    try {
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
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleOverrideRemove = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const playerDiscordId = interaction.options.getUser('player_discord_id').id;
    const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
    try {
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
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleUpdateTeamInfo = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const teamName = interaction.options.getString('team_name');
    const newTeamName = interaction.options.getString('new_team_name');
    const newCaptainDiscordId = interaction.options.getUser('new_captain_discord_id').id;
    try {
        await db.updateTeamInfo(teamName, newTeamName, newCaptainDiscordId);
        await interaction.editReply(`Team info updated for ${teamName}`);
    } catch (error) {
        logger.error('Failed to update team info:', error);
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleSetTeamRole = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const teamName = interaction.options.getString('team_name');
    const roleId = interaction.options.getRole('role_id').id;
    try {
        await db.assignTeamRole(teamName, roleId);
        await interaction.editReply(`Role assigned to team ${teamName}`);
    } catch (error) {
        logger.error('Failed to assign team role:', error);
        await errorNoticeHelper(error, client, interaction);
    }
};

const handleSetRiotId = async (interaction, client, db, logger, errorNoticeHelper) => {
    if (!await checkAccess(interaction, 'staff', db)) {
        return;
    }
    await interaction.deferReply();
    const discordId = interaction.options.getUser('discord_id').id;
    const newRiotId = interaction.options.getString('new_riot_id');
    try {
        const user = await getUserAndRank(newRiotId);
        if (!user) {
            await interaction.editReply('Riot ID not found.');
            return;
        }
        await db.updateRiotId(discordId, newRiotId);
        await interaction.editReply(`Riot ID updated for ${discordId}`);
    } catch (error) {
        logger.error('Failed to update Riot ID:', error);
        await errorNoticeHelper(error, client, interaction);
    }
};

module.exports = {
    checkAccess,
    handleSubcommand,
    handleTeamCreation,
    handleTeamDeletion,
    handleSetTeamChannel,
    handleSetCaptain,
    handleOverrideAdd,
    handleOverrideRemove,
    handleUpdateTeamInfo,
    handleSetTeamRole,
    handleSetRiotId
};
