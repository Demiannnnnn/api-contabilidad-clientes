const fs = require('fs');
const path = require('path');

const logsDir = path.resolve(__dirname, '../../logs');
const requestLogPath = path.join(logsDir, 'requests.log');
const errorLogPath = path.join(logsDir, 'errors.log');

function appendToFile(filePath, message) {
	fs.appendFile(filePath, message + '\n', err => {
		if (err) console.error('[LOGGER][FS ERROR]', err);
	});
}

const logger = {
	info: (...args) => {
		const msg = `[INFO] ${new Date().toISOString()} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`;
		console.log(msg);
		appendToFile(requestLogPath, msg);
	},
	error: (...args) => {
		const msg = `[ERROR] ${new Date().toISOString()} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`;
		console.error(msg);
		appendToFile(errorLogPath, msg);
	},
	debug: (...args) => {
		if (process.env.LOG_LEVEL === 'debug') {
			const msg = `[DEBUG] ${new Date().toISOString()} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`;
			console.debug(msg);
			appendToFile(requestLogPath, msg);
		}
	}
};

module.exports = logger;
