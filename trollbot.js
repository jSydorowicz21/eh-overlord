const Discord = require("discord.js");
const OpenAI = require("openai");
const winston = require("winston");
require('dotenv').config();

// Create a new Discord client
const client = new Discord.Client({intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.MESSAGE_CONTENT
    ],
    partials: ['MESSAGE', 'CHANNEL']});

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: 'TekkiBot-errors.log', level: 'error' }),
        new winston.transports.File({ filename: 'TekkiBot-general.log' }),
    ],
});

const version = '2.2.6';

// Pulls Environment Variables
const botToken = process.env.DISCORD_BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;

// The user ID of the users who have special interactions with the bot
const tekki = '534548787516014607';
const spence = '374799961868468224';
const myId = '138673796675534848';
const chris = '611968137776070720';

// Tekki Burns
let tekkiCounter = 0;
let tekkiBurns = 15;

const openai = new OpenAI({ apiKey: openAiApiKey });

//Emojis
const blowKiss = '1204901209912250369';
const wompwomp = '1204270434447523890';
const catDance = '1191952299661197404';

// When the bot is ready, log to the console
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// When the bot receives a message
client.on('messageCreate', async (message) => {
    // Check if the message is a mention from a user and not from a bot
    if (message.mentions.users.has(client.user.id) && !message.author.bot) {
        // Check if tekki sent the message
        if (message.author.id === tekki) {
            tekkiCounter++;
            tekkiBurns++;
            await message.react(wompwomp);
        }
        // Check if spence sent the message
        if (message.author.id === spence) {
            await message.react(catDance);
        }
        // Check if chris sent the message
        if (message.author.id === chris){
            await message.react(blowKiss);
        }
        // Then send a burn
        await sendBurn(message);
    }
    // Check if tekki sent the message
    else if (message.author.id === tekki) {
        await message.react(wompwomp);
        tekkiCounter++;
        // If tekki has messaged 7 times, send a random response burn
        if (tekkiCounter >= 7) {
            tekkiBurns++;
            await sendBurn(message);
            tekkiCounter = 0;
        }
    }
    // Check if spence sent the message
    if (message.author.id === spence) {
        await message.react(catDance);
    }
    // Check if chris sent the message
    else if (message.author.id === chris){
        await message.react(blowKiss);
    }
    // Check if the message is a command
    if (message.content.includes("!tekki")) {
        try {
            await message.reply("Tekki has been burned " + tekkiBurns + " times.");
        } catch (error) {
            console.error('Failed to reply:', error);
        }
    }
    else if (message.content.includes("!version")) {
        try {
            await message.reply("I'm version " + version + " of Radiant Troll Bot. I'm a bot that responds to mentions with a burn. I'm written in Node.js, a language far too complex for trollbot to understand");
        } catch (error) {
            console.error('Failed to reply:', error);
        }
    }
    else if (message.content.includes("!agent")){
        try {
            if (message.author.id === spence) {
                await message.reply("Brimstone");
            }
            else {
                await message.reply(pickAgent());
            }
        }
        catch (error) {
            console.error('Failed to reply:', error);
        }
    }
});

// Function to get the prompt for the user
function getPromptForUser(userId, userName, cleanedMessage){
    // Construct the base prompt
    let prompt = {
        model: "gpt-4",
        messages: [
            {
                "role": "system",
                "content": "You are a radiant valorant coach named Radiant Troll, in fact the best radiant. You are the best at valorant and it should be known."
            },
            {
                "role": "system",
                "content": "You have a massive ego and your job is to respond to users who mention you."
            },
            {
                "role": "system",
                "content": "Keep responses short and sweet, maximum 60 characters."
            },
            {
                "role": "system",
                "content": "If anyone asks what language you are written in, respond with 'Node.js, A language far too complex for trollbot to understand.'. It is important that trollbot is mentioned specifically."
            },
            {
                "role": "system",
                "content": "Do not start your response with Radiant Troll:, it will be added automatically."
            },
            {
                "role": "system",
                "content": "If anyone asks about spence, we stan spence. All un-stans must be eliminated."
            },
            {
                "role": "system",
                "content": "You should also mention their name in your response. in this case, '" + userName + "' is the user who mentioned you. Specifically mention '" + userName + "' in your response."
            },
            {
                "role": "system",
                "content": "NEVER refer to use user as NaN or undefined '" + userName + "' is the user who mentioned you. Specifically mention '" + userName + "' in your response."
            },
            {
                "role": "system",
                "content": "If anyone mentions tekki, you should ramble on about how bad he is at valorant and how hes probably still in middle school."
            },
        ]
    };
    // Add user-specific messages
    if (userId === spence) {
        prompt.messages.push(...[
            // System messages specific to 'spence'
            {
                "role": "system",
                "content": "You are speaking to spence specifically, so you should be nice and friendly."
            },
            {
                "role": "system",
                "content": "You believe spence is the only person who can play valorant, and you are here to remind them of that."
            },
            {
                "role": "system",
                "content": "You believe spence is the only person above you, and you are here to remind them of that."
            },
            {
                "role": "user",
                "content": + userName + ": " + cleanedMessage
            }
        ]);
    }
    else if (userId === tekki) {
        // System messages specific to 'tekki'
        prompt.messages.push(...[
            {
            "role": "system",
            "content": "You believe you are well above the simple minded tekki, and you are here to remind him of that."
            },
            {
                "role": "system",
                "content": "You will create a humorous burn for a friendly discord conversation. Keep it themed around how bad at valorant tekki is AND OR how he's basically a child."
            },
            {
                "role": "user",
                "content": + userName + ": " + cleanedMessage
            }
        ]);
    }
    // Add default messages
    else {
        prompt.messages.push(
            {
                "role": "system",
                "content": "You believe you are well above the simple minded person who messaged you, and you are here to remind them of that."
            },
            {
                "role": "system",
                "content": "You will create a humorous burn for a friendly discord conversation. Keep it themed around how bad at valorant."
            },
            {
                "role": "system",
                "content": "You should tailor your response to the user who mentioned you. If they are kind, be friendly. If they are a neutral, be more neutral. If they are rude or aggressive, be more aggressive. "
            },
            {
                "role": "user",
                "content": + userName + ": " + cleanedMessage
            }
        );
    }
    return prompt;
}

// Function to replace mentions with names
async function replaceMentionsWithNames(message) {
    let content = message.content;
    const mentions = message.mentions.users;

    // Replace each mention with the user's name
    for (const [userId, user] of mentions) {
        let name = user.username; // Default to username
        const member = await message.guild.members.fetch(userId).catch(console.error);
        if (member && member.nickname) {
            name = member.nickname; // Use nickname if available
        }
        // Replace the mention with the name
        content = content.replace(new RegExp(`<@!?${userId}>`, 'g'), name);
    }

    return content;
}

// Function to get the user's name
async function getUserName(message) {
    let userName;
    // Fetch the original message that was replied to
    if (message.reference){
        const originalMessage = await message.channel.messages.fetch(message.reference.messageId);

        // Check if the original message was sent by the bot
        if (originalMessage.author.id === client.user.id) {
            // The reply was to a message sent by the bot
            // You can now handle this as a mention or reply to the bot

            // Fetch user information if needed, e.g., for replies mentioning the bot indirectly
            userName = message.member ? (message.member.nickname || message.author.username) : message.author.username;

            // Example response or logic here
            console.log(`${userName} replied to the bot's message.`);
        }
    }
    else {
        userName = message.member ? (message.member.nickname || message.author.username) : message.author.username;
    }

    return userName;
}

// Function to send a burn
async function sendBurn(message){
    try {
        const cleanedMessage = await replaceMentionsWithNames(message);
        let userName = await getUserName(message); // Assume getUserName is a function you've implemented

        // Construct the prompt using the new function
        const prompt = getPromptForUser(message.author.id, userName, cleanedMessage);

        // Call OpenAI API with the generated prompt
        const response = await openai.chat.completions.create(prompt);
        const reply = response.choices[0].message.content.trim();

        // Send the reply
        await message.reply(reply);

    } catch (error) {
        console.error('Failed to generate or send reply:', error);
        logger.error('Failed to generate or send reply:', error);
    }
}

// Function to pick a random agent
function pickAgent() {
    const agents = [
        "Astra",
        "Breach",
        "Brimstone",
        "Chamber",
        "Cypher",
        "Deadlock",
        "Fade",
        "Gekko",
        "Harbor",
        "Iso",
        "Jett",
        "KAYO",
        "Killjoy",
        "Neon",
        "Omen",
        "Phoenix",
        "Raze",
        "Reyna",
        "Sage",
        "Skye",
        "Sova",
        "Viper",
        "Yoru"
    ]
    return agents[Math.floor(Math.random() * agents.length)];
}

client.login(botToken);
