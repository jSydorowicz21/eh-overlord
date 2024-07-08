module.exports = [
    {
        name: 'staff',
        description: 'Staff level commands',
        options: [
            {
                type: 1, // Type 1 corresponds to SUB_COMMAND
                name: 'create_team',
                description: 'Create a new team',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'captain_name',
                        description: 'The name of the team captain',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    },
                    {
                        type: 7,
                        name: 'team_channel',
                        description: 'The channel to set for the team',
                        required: true
                    },
                    {
                        type: 8,
                        name: 'team_role',
                        description: 'The role to assign to the team',
                        required: true
                    },
                ]
            },
            {
                type: 1,
                name: 'delete_team',
                description: 'Delete a team',
                options: [
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'set_team_channel',
                description: 'Set the channel for the team',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 7,
                        name: 'channel_id',
                        description: 'The channel to set for the team',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'set_captain',
                description: 'Set a new captain for the team',
                options: [
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the new team captain',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'override_add',
                description: 'Add a player to the team',
                options: [
                    {
                        type: 3,
                        name: 'riot_id',
                        description: 'The Riot ID of the player',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'discord_id',
                        description: 'The Discord ID of the player',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'override_remove',
                description: 'Remove a player from the team',
                options: [
                    {
                        type: 6,
                        name: 'player_discord_id',
                        description: 'The Discord ID of the player',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'update_team_info',
                description: 'Update team information',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'new_team_name',
                        description: 'The new name of the team',
                        required: false
                    },
                    {
                        type: 6,
                        name: 'new_captain_discord_id',
                        description: 'The Discord ID of the new team captain',
                        required: false
                    }
                ]
            },
            {
                type: 1,
                name: 'set_team_role',
                description: 'Set the role for a team',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 8,
                        name: 'role_id',
                        description: 'The role to assign to the team',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'set_riot_id',
                description: 'Set the Riot ID for a player',
                options: [
                    {
                        type: 6,
                        name: 'discord_id',
                        description: 'The Discord ID of the player',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'new_riot_id',
                        description: 'The new Riot ID of the player',
                        required: true
                    }
                ]
            },
        ]
    },
];
