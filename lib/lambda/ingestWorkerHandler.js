'use strict';

const minimumMilliseconds = 4000;
const errors = require('backup-console-core/lib/util/errors');

module.exports = function(services) {
	return function ingestWorkerHandler(event, context, callback) {
		// eslint-disable-next-line no-console
		console.log(`ingestWorkerHandler at ${new Date().toISOString()}`);

		// Initialize the logger service.
		services.logger.initLogger(
			`${context.functionName}/[${context.functionVersion}]${context.awsRequestId}`
		);

		ingestNext()
			.then(() => {
				callback();
			})
			.catch((err) => {
				callback(err);
			})
			.catch((err) => {
				process.nextTick(() => {
					throw err;
				});
			});

		function ingestNext() {
			const remainingTime = context.getRemainingTimeInMillis();
			if (remainingTime < minimumMilliseconds) {
				services.logger.debug(`Not enough remaining time (${remainingTime}ms < ${minimumMilliseconds}) to ingest more`);
				return Promise.resolve();
			}

			const startTime = Date.now();
			services.logger.debug('Dequeuing message');
			return services.queue.dequeueReceivedBackupResults(1)
				.then((queueMessages) => {
					if (queueMessages && queueMessages.length) {
						const queueMessage = queueMessages[0];
						const ingestId = `sqs:MessageId:${queueMessage.MessageId}`;
						const queuedDate = new Date(parseInt(queueMessage.Attributes.SentTimestamp, 10)).toISOString();
						const receiveCount = queueMessage.Attributes.ApproximateReceiveCount;

						services.logger.debug({
							ingestId,
							queuedDate,
							receiveCount,
						}, 'Dequeued message');

						return services.ingest.ingestQueuedBackupResult(
							ingestId,
							queueMessage
						)
							.then((backupResultMeta) => {
								services.logger.info({
									ingestId,
									ingestDuration: Date.now() - startTime,
									backupResultMeta,
								}, 'Ingested message');
							}, (err) => {
								// Invalid backup payload errors should not be re-queued.
								if (err instanceof errors.InvalidBackupPayloadError) {
									services.logger.error({
										err,
										ingestId,
									}, 'Dequeued message has invalid backup results payload');
								}
								else if (receiveCount >= 5) {
									services.logger.error({
										err,
										ingestId,
										queuedDate,
										receiveCount,
									}, 'Dequeued message failed too many times');
								}
								else {
									throw err;
								}
							})
							.then(() => {
								return services.queue.resolveReceivedBackupResult(
									queueMessage
								);
							})
							.catch((err) => {
								services.logger.error({ err, ingestId });
							})
							.then(ingestNext);
					}
					else {
						services.logger.debug(`Nothing returned from queue`);
					}
				}, (err) => {
					services.logger.error({ err }, 'Failed to dequeue received backup result');
				})
				.catch((err) => {
					services.logger.error({ err }, 'Failed to process received backup result');
				});
		}
	};
};
