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
		const lastArg = args.length ? args[args.length - 1] : undefined;
		return lastArg;
	},
	error: (...args) => {
		const msg = `[ERROR] ${new Date().toISOString()} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`;
		console.error(msg);
		appendToFile(errorLogPath, msg);
		const lastArg = args.length ? args[args.length - 1] : undefined;
		return lastArg;
	},
	debug: (...args) => {
		const lastArg = args.length ? args[args.length - 1] : undefined;
		if (process.env.LOG_LEVEL === 'debug') {
			const msg = `[DEBUG] ${new Date().toISOString()} ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`;
			console.debug(msg);
			appendToFile(requestLogPath, msg);
		}
		return lastArg;
	}
};

module.exports = logger;
