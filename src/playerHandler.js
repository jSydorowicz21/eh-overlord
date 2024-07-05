const { Client, IntentsBitField, Partials, EmbedBuilder, Colors, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { ButtonStyle } = require("discord-api-types/v10");
const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const ProxyRouter = require('@extra/proxy-router');
const mongoose = require('mongoose');
puppeteer.use(stealth());
require('dotenv').config();

// Pulls Environment Variables
const botToken = process.env.DISCORD_BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;
// const mongoUri = process.env.MONGO_URI; // MongoDB connection URI

const username = process.env.PROXY_USERNAME;
const password = process.env.PROXY_PASSWORD;

const valorantApiUrl = process.env.VALORANT_API_BASE_URL;
const valorantApiKey = process.env.VALORANT_API_KEY;

const proxyUrl = process.env.PROXY_URL;
const auth = username + ":" + password;

const rosterChannelId = '1257511444858273793';

const db = require('./mongoHandler');

// Function to send a voting message to a specific channel
async function sendVotingMessage(player, captain, team, stats, channelId, trackerUrl, client, type, guild) {
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        console.error('Channel not found');
        return;
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
            console.error('Error fetching user rank');
            return
        }
    } else if (type === 'remove') {
        description = `${captain.tag} has requested ${player.riotId} be removed from ${team.name}`;
        approveCustomId = 'approve_remove';
        denyCustomId = 'deny_remove';
        player = await db.getPlayerByDiscordId(player.playerDiscordId);
        riotReturn = await getUserAndRank(player.riotId);
        if (!riotReturn) {
            console.error('Error fetching user rank');
            return
        }
    }


    const embed = new EmbedBuilder()
        .setTitle(`# ${player.riotId}`)
        .setDescription(description)
        .addFields(
            { name: 'Tracker', value: `[View Stats](${trackerUrl})`, inline: true },
            {name: 'Current Rank', value: riotReturn.currentRank || 'N/A', inline: true },
            {name: 'Peak Rank', value: riotReturn.peakRank || 'N/A', inline: true },
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
        if (i.customId === approveCustomId) {
            // Handle approval
            if (type === 'add') {
                await addPlayerToTeam(player.riotId, player.playerDiscordId, player.playerName, captain.id);
                await addTeamRole(player.playerDiscordId, team.teamRoleId, guild);
            } else if (type === 'remove') {
                await removePlayerFromTeam(player.playerDiscordId, captain.id);
                await removeTeamRole(player.playerDiscordId, team.teamRoleId, guild);
            }
            await i.update({ content: `Player ${player.riotId} has been approved to ${type === 'add' ? 'join' : 'get removed from'} ${team.name}. Please verify roles were updated for <@${player.playerDiscordId}>`, embeds: [], components: [] });
            client.channels.cache.get(team.teamChannelId).send(`Player ${player.riotId} has been ${type === 'add' ? 'added to' : 'removed from'} the team. Roles have been updated accordingly.`);

        } else {
            // Handle denial
            await i.update({ content: `Player ${player.riotId} has been denied to ${type === 'add' ? 'join' : 'get removed from'} ${team.name}.`, embeds: [], components: [] });
            client.channels.cache.get(team.teamChannelId).send(`Player ${player.riotId} has been denied to ${type === 'add' ? 'join' : 'be removed from'} the team. Roles have not been updated.`);
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
                `--proxy-server=${proxyUrl}`,
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        const page = await browser.newPage();
        await page.authenticate({ username, password });
        await page.goto(`${baseUrl}${encodeURIComponent(riotId)}/segments/season-report?=null`, { waitUntil: 'networkidle2' });

        const data = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        await browser.close();

        const segments = data.data;
        const actStats = segments.map(segment => extractStats(segment))
        return actStats;
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
    await db.removePlayerFromTeam(playerId, captainId);
}

// Function to handle dynamic team operations
async function handleTeamOperation(interaction, type, client) {
    await interaction.deferReply(); // Acknowledge interaction
    let playerId = interaction.options.getString('riot_id');
    if (type === 'remove') {
        playerId = (await db.getPlayerByDiscordId(interaction.options.getUser('discord_id').id)).riotId;
    }
    const captain = interaction.user;
    const team = (await db.getTeamByCaptain(interaction.user.id));
    if (!team) {
        await interaction.editReply('You are not a captain of any team. Please have the captain of your team use this command.');
        return;
    }
    let stats;
    let player;
    if (type === 'add') {
        // stats = await fetchPlayerStats(playerId);
        player = {
            riotId: playerId,
            playerName: playerId.split('#')[0],
            playerDiscordId: interaction.options.getUser('discord_id').id,
        }
    }
    else if (type === 'remove') {
        player = { riotId: playerId, playerDiscordId: interaction.options.getUser('discord_id').id};
    }
    const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(playerId)}/overview?season=all`;
    const guild = client.guilds.cache.get(interaction.guildId);
    await sendVotingMessage(player, captain, team, stats, rosterChannelId, trackerUrl, client, type, guild);
    await interaction.editReply(`Request to ${type} player ${playerId} has been sent for approval.`);
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

// Function to delete a team
async function deleteTeam(captainId) {
    return await db.deleteTeam(captainId);
}

async function sendTestMessage(client){
    const playerId = 'hydro#3440';
    const replacingPlayer = 'KFC';
    const stats = {
        rank: 'Currently Unranked',
        totalGamesThisEpisode: 4,
        totalGamesLastEpisode: 20,
        additionalInfo: 'Not a lot of games to judge stats on.'
    };
    const channelId = '1250200562834870292';
    const trackerUrl = 'https://tracker.gg/valorant/profile/riot/hydro%233440/overview?season=all';

    await sendVotingMessage(playerId, 'Captain', 'Team Name', stats, channelId, trackerUrl, client, 'add');
}

// Function to get Player UID
async function getPlayerUID(name, tag) {
    if (!valorantApiUrl || !valorantApiKey) {
        console.error('Valorant API base URL not found.');
        return null;
    }
    const apiUrl = `${valorantApiUrl}/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?force=true`;
    try {
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: valorantApiKey,
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
    const apiUrl = `${valorantApiUrl}/v2/by-puuid/mmr/na/${encodeURIComponent(playerUID)}`;
    try {
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: valorantApiKey,
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

// Function to get User and Rank
async function getUserAndRank(riotId) {
    const [name, tag] = riotId.split('#');
    const playerUID = await getPlayerUID(name, tag);
    if (playerUID) {
        return await getUserRank(playerUID);
    }
    return null;
}

// Define acts to extract
const actsToExtract = ['E8: A3', 'E8: A2', 'E8: A1', 'E7: A3'];

module.exports = {
    fetchPlayerStats,
    sendVotingMessage,
    sendTestMessage,
    addPlayerToTeam,
    removePlayerFromTeam,
    handleTeamOperation,
    setCaptain,
    deleteTeam,
    getUserAndRank
}
