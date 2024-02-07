const Discord = require("discord.js");
const OpenAI = require("openai");
const winston = require("winston");
require('dotenv').config();
const client = new Discord.Client({intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.MESSAGE_CONTENT
    ],
    partials: ['MESSAGE', 'CHANNEL']});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: 'TekkiBot-errors.log', level: 'error' }),
        new winston.transports.File({ filename: 'TekkiBot-general.log' }),
    ],
});

const version = '2.1.4';


// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const botToken = process.env.DISCORD_BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;

// The user ID of the user to respond to
const trollbot = '534548787516014607';
const spence = '374799961868468224';
const myId = '138673796675534848';
const chris = '611968137776070720';

let tekkiCounter = 0;
let tekkiBurns = 13;

const openai = new OpenAI({ apiKey: openAiApiKey });

//Emojis
const blowKiss = '1204901209912250369';
const wompwomp = '1204270434447523890';
const heart = '1191952299661197404';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.mentions.users.has(client.user.id) && !message.author.bot) {
        if (message.author.id === trollbot) {
            tekkiCounter++;
            tekkiBurns++;
            await message.react(wompwomp);
        }
        if (message.author.id === spence) {
            await message.react(heart);
        }
        if (message.author.id === chris){
            await message.react(blowKiss);
        }
        await sendBurn(message);
    }
    else if (message.author.id === trollbot) {
        await message.react(wompwomp);
        tekkiCounter++;
        if (tekkiCounter >= 7) {
            tekkiBurns++;
            await sendBurn(message);
            tekkiCounter = 0;
        }
    }
    else if (message.author.id === spence) {
        await message.react(heart);
    }
    else if (message.author.id === chris){
        await message.react(blowKiss);
    }
    // Check if the message is from the target user and not from a bot
    else if (message.content.includes("!trollbot")) {
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
});

function getPromptForUser(userId, userName, cleanedMessage){
    // Construct the prompt
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
                "content": "You should also mention their name in your response. in this case, " + userName + " is the user who mentioned you. Specifically mention " + userName + " in your response."
            },
            {
                "role": "system",
                "content": "NEVER refer to use user as NaN or undefined " + userName + " is the user who mentioned you. Specifically mention " + userName + " in your response."
            },
            {
                "role": "system",
                "content": "If anyone mentions trollbot, you should ramble on about how bad he is at valorant and how hes probably still in middle school."
            },
            {
                "role": "user",
                "content": + userName + ": " + cleanedMessage
            }
        ]
    };
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
            }
        ]);
    }
    else if (userId === trollbot) {
        // System messages specific to 'trollbot'
        prompt.messages.push(...[
            {
            "role": "system",
            "content": "You believe you are well above the simple minded trollbot, and you are here to remind him of that."
            },
            {
                "role": "system",
                "content": "You will create a humorous burn for a friendly discord conversation. Keep it themed around how bad at valorant trollbot is AND OR how he's basically a child."
            }
        ]);
    }
    else {
        prompt.messages.push(
            {
                "role": "system",
                "content": "You believe you are well above the simple minded person who messaged you, and you are here to remind them of that."
            },
            {
                "role": "system",
                "content": "You should talor your response to the user who mentioned you. If they are kind, be friendly. If they are a neutral, be more neutral. If they are rude or aggressive, be more aggressive. "
            },
        );
    }
    return prompt;
}

async function replaceMentionsWithNames(message) {
    let content = message.content;
    const mentions = message.mentions.users;

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

async function getUserName(message) {
    let userName;
    if (message.member) {
        // Direct access if member is available
        if (message.member.nickname) {
            userName = message.member.nickname;
            console.log(userName + " is the user who mentioned me at block 1");
        }
    } else if (message.guild && message.author) {
        console.log('hit fallback block');
        // Fetch member from guild if not directly available
        try {
            const member = await message.guild.members.fetch(message.author.id);
            userName = member.nickname || message.author.username;
        } catch (error) {
            console.error('Error fetching member:', error);
            userName = message.author.username; // Fallback to username
        }
    }
    else{
        console.log('hit final fallback block');
        userName = message.author.username;
    }
    return userName;
}

async function sendBurn(message){
    try {
        const cleanedMessage = await replaceMentionsWithNames(message);
        let userName = await getUserName(message); // Assume getUserName is a function you've implemented

        // Construct the prompt using the new function
        const prompt = getPromptForUser(message.author.id, userName, cleanedMessage);

        // Call OpenAI API with the generated prompt
        const response = await openai.chat.completions.create(prompt);
        const reply = response.choices[0].message.content.trim();

        logger.info('user: ' + userName + ' message: ' + cleanedMessage + ' reply: ' + reply);
        logger.info('prompt: ' + JSON.stringify(prompt));
        await message.reply(reply);

    } catch (error) {
        console.error('Failed to generate or send reply:', error);
        logger.error('Failed to generate or send reply:', error);
    }
}


client.login(botToken);
