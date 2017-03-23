'use strict';

exports.getConfig = function() {
	if (typeof process.env.CONFIG !== 'string') {
		throw new Error('Missing CONFIG environmental variable');
	}

	try {
		const json = JSON.parse(process.env.CONFIG);

		if (process.env.CONFIG_COMMIT_HASH) {
			json.COMMIT_HASH = process.env.CONFIG_COMMIT_HASH;
		}

		return json;
	}
	catch (err) {
		err.message = `Invalid CONFIG environmental variable JSON -- ${err.message}`;
		throw err;
	}
};

exports.platformServices = {
	platform() {
		return require('aws-sdk');
	},

	config(config) {
		const Service = require('./ConfigAWS');
		return new Service(config);
	},

	logger(services) {
		const Service = require('./services/LoggerServiceAWS');
		return new Service(services);
	},

	queue(services) {
		const Service = require('./services/QueueServiceAWS');
		return new Service(services);
	},

	db(services) {
		const Service = require('./services/DBServiceAWS');
		return new Service(services);
	},

	receiving(services) {
		const Service = require('./services/ReceivingServiceAWS');
		return new Service(services);
	},

	ingest(services) {
		const Service = require('./services/IngestServiceAWS');
		return new Service(services);
	},

	storage(services) {
		const Service = require('./services/StorageServiceAWS');
		return new Service(services);
	},

	parse(services, backupResultParsers) {
		const Service = require('./services/ParserServiceAWS');
		return new Service(services, backupResultParsers);
	},
};
