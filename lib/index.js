'use strict';

// eslint-disable-next-line no-console
console.log(`Loaded ${__filename} at ${new Date().toISOString()}`);

const servicesStart = Date.now();

const Services = require('backup-console-core/lib/Services');
const platform = require('./platform');

const services = new Services(
	platform.getConfig(),
	platform.platformServices,
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

// Export AWS Lambda handlers
exports.receivingVerifyEmailRecipients = require('./lambda/receivingVerifyEmailRecipients')(services);
exports.receivingHTTPPost = require('./lambda/receivingHTTPPost')(services);
exports.ingestConsumerHandler = require('./lambda/ingestConsumerHandler')(services);
exports.ingestWorkerHandler = require('./lambda/ingestWorkerHandler')(services);
exports.ingestMetricsStreamHandler = require('./lambda/ingestMetricsStreamHandler')(services);
