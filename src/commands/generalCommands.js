module.exports = [
    {
        name: 'check',
        description: 'Check if a player is likely a smurf',
        options: [
            {
                type: 3, // Type 3 corresponds to STRING
                name: 'riot_id',
                description: 'The Riot ID of the player (e.g., username#tagline)',
                required: true
            }
        ]
    },
    {
        name: 'add_player',
        description: 'Add a player to the team',
        options: [
            {
                type: 3,
                name: 'riot_id',
                description: 'The Riot ID of the player (e.g., username#tagline)',
                required: true
            },
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the player',
                required: true
            }
        ]
    },
    {
        name: 'remove_player',
        description: 'Remove a player from the team',
        options: [
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the player',
                required: true
            }
        ]
    },
    {
        name: 'add_coach',
        description: 'Add a coach to the team',
        options: [
            {
                type: 3,
                name: 'riot_id',
                description: 'The Riot ID of the coach',
                required: true
            },
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the coach',
                required: true
            }
        ]
    },
    {
        name: 'remove_coach',
        description: 'Remove a coach from the team',
        options: [
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the coach',
                required: true
            }
        ]
    },
    {
        name: 'team',
        description: 'Display team information',
        options: [
            {
                type: 6,
                name: 'player_discord_id',
                description: 'The Discord ID of the player',
                required: true
            }
        ]
    },
    {
        name: 'request_sub',
        description: 'Request a substitute player',
        options: [
            {
                type: 3,
                name: 'riot_id',
                description: 'The Riot ID of the player (e.g., username#tagline)',
                required: true
            },
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the player',
                required: true
            },
            {
                type: 3,
                name: 'riot_id_being_replaced',
                description: 'The Riot ID of the player being replaced',
                required: true
            },
            {
                type: 3,
                name: 'day',
                description: 'The day of the sub (e.g., 07-04-2024)',
                required: true
            },
            {
                type: 3,
                name: 'time',
                description: 'The time of the day (e.g., 7:00 PM EST)',
                required: true
            }
        ]
    },
    {
        name: 'list_teams',
        description: 'List all teams with their captains and players',
    },
    {
        name: 'list_teams_buttons',
        description: 'List all teams with their captains and players (buttons)',
    },
    {
        name: 'get_player_info',
        description: 'Get detailed information about a specific player',
        options: [
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the player',
                required: true
            }
        ]
    },
    {
        name: 'update_riot_id',
        description: 'Update your riot ID',
        options: [
            {
                type: 3,
                name: 'new_riot_id',
                description: 'Your new Riot ID (e.g., username#tagline)',
                required: true
            }
        ]
    },
]
