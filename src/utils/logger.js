const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: 'bot-errors.log', level: 'error' }),
        new winston.transports.File({ filename: 'bot-general.log' }),
    ],
});

module.exports = logger;
