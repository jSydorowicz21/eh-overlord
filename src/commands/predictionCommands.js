module.exports = [
    {
        name: 'start_prediction',
        description: 'Start a new prediction',
        options: [
            {
                type: 3,
                name: 'question',
                description: 'The question for the prediction',
                required: true
            },
            {
                type: 3,
                name: 'options',
                description: 'Comma-separated list of options',
                required: true
            }
        ]
    },
    {
        name: 'end_prediction',
        description: 'End the current prediction'
    },
    {
        name: 'predict',
        description: 'Predict the outcome of a prediction',
        options: [
            {
                type: 3,
                name: 'prediction_id',
                description: 'The ID of the prediction',
                required: true
            },
            {
                type: 3,
                name: 'option',
                description: 'The option to predict',
                required: true
            }
        ]
    },
    {
        name: 'leaderboard',
        description: 'Display the leaderboard for predictions'
    }
]
