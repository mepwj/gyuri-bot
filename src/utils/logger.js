const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const getTimestamp = () => {
    return new Date().toISOString();
};

const getLogFileName = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
};

const writeToFile = (level, message) => {
    const logFile = path.join(logsDir, getLogFileName());
    const logEntry = `[${getTimestamp()}] [${level}] ${message}\n`;
    
    fs.appendFileSync(logFile, logEntry, 'utf8');
};

const formatMessage = (message, ...args) => {
    if (typeof message === 'object') {
        return JSON.stringify(message, null, 2);
    }
    
    if (args.length > 0) {
        return `${message} ${args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : arg
        ).join(' ')}`;
    }
    
    return message;
};

const logger = {
    info: (message, ...args) => {
        const formatted = formatMessage(message, ...args);
        console.log(`[${getTimestamp()}] [INFO] ${formatted}`);
        writeToFile('INFO', formatted);
    },
    
    warn: (message, ...args) => {
        const formatted = formatMessage(message, ...args);
        console.warn(`[${getTimestamp()}] [WARN] ${formatted}`);
        writeToFile('WARN', formatted);
    },
    
    error: (message, ...args) => {
        const formatted = formatMessage(message, ...args);
        console.error(`[${getTimestamp()}] [ERROR] ${formatted}`);
        writeToFile('ERROR', formatted);
    },
    
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            const formatted = formatMessage(message, ...args);
            console.debug(`[${getTimestamp()}] [DEBUG] ${formatted}`);
            writeToFile('DEBUG', formatted);
        }
    },
    
    command: (commandName, userId, guildId) => {
        const message = `Command executed: ${commandName} by ${userId} in ${guildId || 'DM'}`;
        logger.info(message);
    }
};

module.exports = logger;