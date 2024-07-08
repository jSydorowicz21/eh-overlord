const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const analyzeStats = async (stats) => {
    const prompt = process.env.OPENAPI_PROMPT + `\n ${JSON.stringify(stats)}\nRespond with percentages for smurfing and boosted, followed by brief explanations of the key factors for each.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an assistant specialized in detecting smurfs in Valorant.' },
            { role: 'system', content: 'You will be tasked with deciding whether a player is smurfing or rank sitting (avoiding playing games to be able to play in the league).' },
            { role: 'system', content: 'You must respond briefly as there is a 1000 character limit to your responses. Provide only a few brief reasons for your ratings. Do not give a smurfing and boosted percent for each act, just an overall rating.' },
            { role: 'user', content: prompt }
        ]
    });

    console.log(response.choices[0].message.content.trim());
    return response.choices[0].message.content.trim();
};

module.exports = analyzeStats;
