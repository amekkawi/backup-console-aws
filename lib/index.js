'use strict';

// eslint-disable-next-line no-console
console.log(`Loaded ${__filename} at ${new Date().toISOString()}`);

const servicesStart = Date.now();

const config = (() => {
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
})();

const platformServices = {
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

const Services = require('backup-console-core/lib/Services');
const services = new Services(
	config,
	platformServices,
	{
		arq: require('./parsers/parser-arq'),
		json: require('./parsers/parser-json'),
	}
);

const servicesTime = Date.now() - servicesStart;
if (servicesTime > 350) {
	// eslint-disable-next-line no-console
	console.log(`Loading Services took ${servicesTime}ms`);
}

// Pre-load platform library
services.platform;

// AWS Lambda handlers
exports.receivingVerifyEmailRecipients = require('./lambda/receivingVerifyEmailRecipients')(services);
exports.receivingHTTPPost = require('./lambda/receivingHTTPPost')(services);
exports.ingestConsumerHandler = require('./lambda/ingestConsumerHandler')(services);
exports.ingestWorkerHandler = require('./lambda/ingestWorkerHandler')(services);
exports.ingestMetricsStreamHandler = require('./lambda/ingestMetricsStreamHandler')(services);
