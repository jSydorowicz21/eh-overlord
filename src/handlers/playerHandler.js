const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const {EmbedBuilder, Colors, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { ButtonStyle } = require('discord-api-types/v10');
const db = require('./mongoHandler');
const errorNoticeHelper = require("../utils/errorNoticeHelper");
require('dotenv').config();

puppeteer.use(stealth());

const rosterChannelId = '1257511444858273793';
const seasonRole = process.env.SEASON_ROLE;
const coachRole = process.env.COACH_ROLE;
const captainRole = process.env.CAPTAIN_ROLE;

// Function to send a voting message to a specific channel
async function sendVotingMessage(player, captain, team, stats, channelId, trackerUrl, client, type, guild) {
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        throw new Error('Channel not found');
    }

    let description;
    let approveCustomId;
    let denyCustomId;
    let riotReturn;

    if (type === 'add') {
        description = `<@${captain.id}> has requested ${player.riotId} be added to ${team.name}`;
        approveCustomId = 'approve_add';
        denyCustomId = 'deny_add';
        riotReturn = await getUserAndRank(player.riotId);
        if (!riotReturn) {
            throw new Error('Error fetching user rank');
        }
    } else if (type === 'remove') {
        description = `${captain.tag} has requested ${player.riotId} be removed from ${team.name}`;
        approveCustomId = 'approve_remove';
        denyCustomId = 'deny_remove';
        player = await db.getPlayerByDiscordId(player.discordId);
        riotReturn = await getUserAndRank(player.riotId);
        if (!riotReturn) {
            throw new Error('Error fetching user rank');
        }
    }

    const currentTime = new Date();
    const futureTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
    const discordTimeCode = `<t:${Math.floor(futureTime.getTime() / 1000)}:R>`;

    const embed = new EmbedBuilder()
        .setTitle(`# ${player.riotId}`)
        .setDescription(description)
        .addFields(
            { name: 'Tracker', value: `[View Stats](${trackerUrl})`, inline: true },
            { name: 'Current Rank', value: riotReturn.currentRank || 'N/A', inline: true },
            { name: 'Peak Rank', value: riotReturn.peakRank || 'N/A', inline: true },
            { name: 'Request Close Time', value: discordTimeCode, inline: true}
        )
        .setURL(trackerUrl)
        .setColor(Colors.Blue);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(approveCustomId)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(denyCustomId)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
        );

    const message = await channel.send({ embeds: [embed], components: [row] });

    const filter = i => i.customId === approveCustomId || i.customId === denyCustomId;
    const collector = message.createMessageComponentCollector({ filter, time: 1440 * 60000 });

    collector.on('collect', async i => {
        try {
            if (i.customId === approveCustomId) {
                // Handle approval
                if (type === 'add') {
                    await addPlayerToTeam(player.riotId, player.discordId, player.playerName, captain.id);
                    await addTeamRole(player.discordId, team.teamRoleId, guild);
                    await addTeamRole(player.discordId, seasonRole, guild);
                } else if (type === 'remove') {
                    await removePlayerFromTeam(player.discordId);
                    await removeTeamRole(player.discordId, team.teamRoleId, guild);
                    await removeTeamRole(player.discordId, seasonRole, guild);
                }
                await i.update({
                    content: `Player ${player.riotId} has been approved to ${type === 'add' ? 'join' : 'get removed from'} ${team.name}. Please verify roles were updated for <@${player.discordId}>`,
                    embeds: [],
                    components: []
                });
                client.channels.cache.get(team.teamChannelId).send(`Player ${player.riotId} has been ${type === 'add' ? 'added to' : 'removed from'} the team. Roles have been updated accordingly.`);

            } else {
                // Handle denial
                await i.update({
                    content: `Player ${player.riotId} has been denied to ${type === 'add' ? 'join' : 'get removed from'} ${team.name}.`,
                    embeds: [],
                    components: []
                });
                client.channels.cache.get(team.teamChannelId).send(`Player ${player.riotId} has been denied to ${type === 'add' ? 'join' : 'be removed from'} the team. Roles have not been updated.`);
            }
        } catch (error) {
            await errorNoticeHelper(error, client, i);
            console.error('Error handling voting message:', error);
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            message.edit({ content: 'No votes received. The request has been closed.', embeds: [], components: [] });
        }
    });
}

// Function to fetch player stats
const fetchPlayerStats = async (riotId) => {
    let browser;
    const baseUrl = process.env.TRACKER_BASE_URL;
    if (!baseUrl) {
        console.error('Base URL not found');
        return;
    }
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: puppeteer.executablePath(), // Ensure the correct executable path is used
            args: [
                `--proxy-server=${process.env.PROXY_URL}`,
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        const page = await browser.newPage();
        await page.authenticate({ username: process.env.PROXY_USERNAME, password: process.env.PROXY_PASSWORD });
        await page.goto(`${baseUrl}${encodeURIComponent(riotId)}/segments/season-report?=null`, { waitUntil: 'networkidle2' });

        const data = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        await browser.close();

        const segments = data.data;
        return segments.map(segment => extractStats(segment));
    } catch (error) {
        console.error('Error fetching player stats:', error); // Improved error logging
        if (browser) await browser.close();
        throw error;
    }
};

// Function to extract relevant stats
const extractStats = (segment) => {
    if (!segment || !segment.stats) return {};
    const stats = segment.stats;
    return {
        actName: segment.metadata.name || 'N/A',
        currentRank: stats.rank ? stats.rank.displayValue : 'N/A',
        peakRank: stats.peakRank ? stats.peakRank.displayValue : 'N/A',
        kdRatio: stats.kDRatio ? stats.kDRatio.displayValue : 'N/A',
        headshotPercentage: stats.headshotsPercentage ? stats.headshotsPercentage.displayValue : 'N/A',
        matchesPlayed: stats.matchesPlayed ? stats.matchesPlayed.displayValue : 'N/A',
        wins: stats.matchesWon ? stats.matchesWon.displayValue : 'N/A',
        winPercentage: stats.matchesWinPct ? stats.matchesWinPct.displayValue : 'N/A',
        KAST: stats.kAST ? stats.kAST.displayValue : 'N/A',
        ADR: stats.damagePerRound ? stats.damagePerRound.displayValue : 'N/A'
    };
};

// Function to add a player to the team
async function addPlayerToTeam(riotId, playerDiscordId, playerName, captainId) {
    await db.addPlayerToTeam(riotId, playerDiscordId, playerName, captainId);
}

// Function to remove a player from the team
async function removePlayerFromTeam(playerId, captainId) {
    await db.removePlayerFromTeam(playerId);
}

// Function to handle dynamic team operations
async function handleTeamOperation(interaction, type, client) {
    await interaction.deferReply(); // Acknowledge interaction
    let playerId = interaction.options.getString('riot_id');
    let player = (await db.getPlayerByDiscordId(interaction.options.getUser('discord_id').id));
    if (type === 'remove') {
        if (!player) {
            await interaction.editReply('Player not found. Please verify you tagged the correct user.');
            return;
        }
        else if (!player.team) {
            await interaction.editReply('Player is not on a team.');
        }
        player.populate('team');
        playerId = player.riotId;
    }
    else {
        if (!await verifyRiotId(playerId)) {
            await interaction.editReply('Invalid Riot ID. Please verify the Riot ID and try again.');
            return;
        }
        else if (player && player.team) {
            await interaction.editReply(`Player is already on the team ${player.team.name}. You must have them request to leave the team first.`);
            return;
        }
        player = {
            riotId: playerId,
            playerName: playerId.split('#')[0],
            discordId: interaction.options.getUser('discord_id').id,
        };
    }
    const captain = interaction.user;
    const team = (await db.getTeamByCaptain(interaction.user.id) || await db.getTeamByManager(interaction.user.id));
    if (!team) {
        await interaction.editReply('You are not a captain or manager of any team. Please have the captain or manager of your team use this command.');
        return;
    }
    let stats;
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(playerId)}/overview?season=all`;
    const guild = client.guilds.cache.get(interaction.guildId);
    try {
        await sendVotingMessage(player, captain, team, stats, rosterChannelId, trackerUrl, client, type, guild);
        await interaction.editReply(`Request to ${type} player ${playerId} has been sent for approval.`);
    } catch (error) {
        await errorNoticeHelper(error, client, interaction);
        console.error('Error sending voting message:', error);
    }

}

// Function to add the team role to a user
async function addTeamRole(playerId, teamRoleId, guild) {
    const member = guild.members.cache.get(playerId);
    const role = guild.roles.cache.get(teamRoleId);
    if (member && role) {
        await member.roles.add(role);
    }
}

// Function to remove the team role from a user
async function removeTeamRole(playerId, teamRoleId, guild) {
    const member = guild.members.cache.get(playerId);
    const role = guild.roles.cache.get(teamRoleId);
    if (member && role) {
        await member.roles.remove(role);
    }
}

// Function to set a team captain
async function setCaptain(captain, teamName) {
    await db.setCaptain(captain.id, captain.displayName, teamName);
}

// Function to add a coach to a team
async function addCoach(coachId, coachName, riotId, teamName) {
    await db.addCoach(coachId, coachName, riotId, teamName);
}

// Function to remove a coach from a team
async function removeCoach(coachId) {
    await db.removeCoach(coachId);
}

// Function to delete a team
async function deleteTeam(captainId) {
    return await db.deleteTeam(captainId);
}

// Function to prompt the captain to choose a coach to replace if the team already has 2 coaches
async function promptCoachReplacement(team, coach, interaction, client) {
    if (team.coaches.length < 2) {
        return;
    }
    const coach1 = team.coaches[0];
    const coach2 = team.coaches[1];
    const guild = client.guilds.cache.get(interaction.guildId);
    const embed = new EmbedBuilder()
        .setTitle('Coach Replacement')
        .setDescription('Your team already has 2 coaches. Please select one to replace.')
        .addFields(
            { name: 'Coach 1', value: coach1.name, inline: true },
            { name: 'Coach 2', value: coach2.name, inline: true }
        )
        .setColor(Colors.Blue);
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('replace_coach1')
                .setLabel(`Replace ${coach1.name}`)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('replace_coach2')
                .setLabel(`Replace ${coach2.name}`)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('cancel_replace')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
        );
    await interaction.editReply({ embeds: [embed], components: [row] , ephemeral: true });
    const filter = i => i.customId === 'replace_coach1' || i.customId === 'replace_coach2' || i.customId === 'cancel_replace';
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
    collector.on('collect', async i => {
        try {
            if (i.customId === 'replace_coach1') {
                await db.removeCoach(coach1.discordId);
                await removeTeamRole(coach1.discordId, team.teamRoleId, guild);
                await removeTeamRole(coach1.discordId, seasonRole, guild);
                await removeTeamRole(coach1.discordId, coachRole, guild);
                await db.addCoach(coach.discordId, coach.name, coach.riotId, team.name);
                await addTeamRole(coach.discordId, team.teamRoleId, guild);
                await addTeamRole(coach.discordId, seasonRole, guild);
                await addTeamRole(coach.discordId, coachRole, guild);
                await client.channels.cache.get(team.teamChannelId).send(`${coach1.name} has been replaced with ${coach.name}`);
                await i.update({ content: `${coach1.name} has been replaced with ${coach.name}`, embeds: [], components: [] });
            } else if (i.customId === 'replace_coach2') {
                await db.removeCoach(coach2.discordId);
                await removeTeamRole(coach2.discordId, team.teamRoleId, guild);
                await removeTeamRole(coach2.discordId, seasonRole, guild);
                await removeTeamRole(coach2.discordId, coachRole, guild);
                await db.addCoach(coach.discordId, coach.name, coach.riotId, team.name);
                await addTeamRole(coach.discordId, team.teamRoleId, guild);
                await addTeamRole(coach.discordId, seasonRole, guild);
                await addTeamRole(coach.discordId, coachRole, guild);
                await client.channels.cache.get(team.teamChannelId).send(`${coach2.name} has been replaced with ${coach.name}`);
                await i.update({ content: `${coach2.name} has been replaced with ${coach.name}`, embeds: [], components: [] });
            } else {
                await i.update({ content: 'Coach replacement cancelled.', embeds: [], components: [] });
            }
        } catch (error) {
            await errorNoticeHelper(error, interaction.client, i);
            console.error('Error handling coach replacement:', error);
        }
    });
}


// Function to get Player UID
async function getPlayerUID(name, tag) {
    const apiUrl = `${process.env.VALORANT_API_BASE_URL}/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?force=true`;
    try {
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: process.env.VALORANT_API_KEY,
            }
        });
        const json = await response.json();
        if (json.status === 200 && json.data) {
            return json.data.puuid;
        } else {
            console.error(`Player not found or error fetching UID for ${name}#${tag}: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error fetching UID for ${name}#${tag}: ${error.toString()}`);
    }
    return null;
}

// Function to get User Rank
async function getUserRank(playerUID) {
    const apiUrl = `${process.env.VALORANT_API_BASE_URL}/v2/by-puuid/mmr/na/${encodeURIComponent(playerUID)}`;
    try {
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: process.env.VALORANT_API_KEY,
            }
        });
        const json = await response.json();
        if (json.status === 200 && json.data) {
            return {
                currentRank: json.data.current_data.currenttierpatched,
                currentRankInt: json.data.current_data.currenttier,
                peakRank: json.data.highest_rank.patched_tier,
                peakRankConverted: json.data.highest_rank.converted
            };
        } else {
            console.error(`Rank not found or error fetching rank for UID ${playerUID}: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error fetching rank for UID ${playerUID}: ${error.toString()}`);
    }
    return null;
}

// Function to verify riotId exists
async function verifyRiotId(riotId) {
    const [name, tag] = riotId.split('#');
    const playerUID = await getPlayerUID(name, tag);
    return !!playerUID;
}

async function handleCoachOperation(coachId, coachDiscord, riotId, requesterId, type, interaction, client){
    let coach = db.getCoachByDiscordId(coachId);
    const guild = client.guilds.cache.get(interaction.guildId);
    const team = await db.getTeamByCaptain(requesterId) || await db.getTeamByManager(requesterId);
    if (!team) {
        await interaction.editReply('You must be a captain or manager to add or remove a coach.');
        return;
    }
    team.populate('coaches');
    if (team.coaches.some(coach => coach.discordId === coachId)) {
        await interaction.editReply('Coach already in team.');
        return;
    }
    if (type === 'add') {
        if (!await verifyRiotId(riotId)) {
            await interaction.editReply('Invalid Riot ID, please double check the riot ID or unprivate your tracker');
            return;
        }
        if (coach.team) {
            await interaction.editReply('Coach already in a team.');
            return;
        }
        if (team.coaches.length >= 2) {
            if (!coach){
                coach = {
                    name: coachDiscord.displayName,
                    discordId: coachId,
                    riotId: riotId,
                };
            }
            await promptCoachReplacement(team, coach, interaction, client);
            return;
        }
        else{
            await db.addCoach(coachId, coachDiscord.displayName, riotId, team.name);
            await addTeamRole(coachId, coachRole, guild);
            await addTeamRole(coachId, seasonRole, guild);
            await addTeamRole(coachId, team.teamRoleId, guild);
            await interaction.editReply('Coach added to team.');
            await client.channels.cache.get(team.teamChannelId).send(`${coachDiscord.displayName} has been added as a coach to the team.`);
        }

    }
    if (type === 'remove') {
        if (!coach) {
            await interaction.editReply('Coach not found.');
            return;
        }
        const response = await db.removeCoach(coachId);
        await removeTeamRole(coachId, coachRole, guild);
        await removeTeamRole(coachId, seasonRole, guild);
        await removeTeamRole(coachId, team.teamRoleId, guild);
        await interaction.editReply('Coach removed from team.');
        await client.channels.cache.get(team.teamChannelId).send(`${response.coach.name} has been removed as a coach from the team.`);
    }
}

// Function to get User and Rank
async function getUserAndRank(riotId) {
    const [name, tag] = riotId.split('#');
    const playerUID = await getPlayerUID(name, tag);
    if (playerUID) {
        return await getUserRank(playerUID);
    }
    return null;
}

module.exports = {
    fetchPlayerStats,
    sendVotingMessage,
    addPlayerToTeam,
    removePlayerFromTeam,
    handleTeamOperation,
    setCaptain,
    deleteTeam,
    getUserAndRank,
    verifyRiotId,
    addCoach,
    removeCoach,
    promptCoachReplacement,
    handleCoachOperation,


};
