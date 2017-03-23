'use strict';

module.exports = function(services) {
	return function ingestConsumerHandler(event, context, callback) {
		// eslint-disable-next-line no-console
		console.log(`ingestConsumerHandler at ${new Date().toISOString()}`);

		// Initialize the logger service.
		services.logger.initLogger(
			`${context.functionName}/[${context.functionVersion}]${context.awsRequestId}`
		);

		services.ingest.runQueueConsumer()
			.then(() => {
				callback();
			})
			.catch((err) => {
				services.logger.error({ err }, 'Failed to run queue consumer');
				callback(err);
			})
			.catch((err) => {
				process.nextTick(() => {
					throw err;
				});
			});
	};
};
