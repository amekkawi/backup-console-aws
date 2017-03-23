'use strict';

const PromiseIterate = require('backup-console-core/lib/util/promise').PromiseIterate;

module.exports = function(services) {
	return function ingestMetricsStreamHandler(event, context, callback) {
		// eslint-disable-next-line no-console
		console.log(`ingestMetricsStreamHandler at ${new Date().toISOString()}`);

		// Initialize the logger service.
		services.logger.initLogger(
			`${context.functionName}/[${context.functionVersion}]${context.awsRequestId}`
		);

		const BackupResultMetrics = require('backup-console-core/lib/structs/BackupResultMetrics');
		const backupTableArn = services.config.AWS_RESOURCE_ATTR['aws_dynamodb_table.Backup.arn'];
		const expectedStreamSourceARN = `${backupTableArn}/stream/`;

		let validRecords = 0;

		services.logger.debug(`Received ${event.Records.length} record(s) to process`);

		// Parse the records into a map of clientId => BackupResultMetrics[]
		const metricsMap = event.Records.reduce((ret, streamRecord) => {
			try {
				if (streamRecord.eventSource !== 'aws:dynamodb') {
					services.logger.warn({
						streamRecord,
					}, 'Invalid metrics stream record (Expected eventSource to be "aws:dynamodb")');
				}
				else if (streamRecord.eventName !== 'INSERT') {
					services.logger.debug({
						streamRecord,
					}, `Skipping metrics stream record (eventName not "INSERT")`);
				}
				else if (String(streamRecord.eventSourceARN).indexOf(expectedStreamSourceARN) !== 0) {
					services.logger.warn({
						streamRecord,
						expectedStreamSourceARN,
					}, `Invalid metrics stream record (Expected eventSourceARN to be from backup table)`);
				}
				else if (!streamRecord.dynamodb.Keys.clientId || !streamRecord.dynamodb.Keys.clientId.S) {
					services.logger.error({
						streamRecord,
					}, 'Invalid metrics stream record (Missing or non-string "clientId")');
				}
				else if (!streamRecord.dynamodb.NewImage) {
					services.logger.error({
						streamRecord,
					}, 'Invalid metrics stream record (Missing "NewImage")');
				}
				else if (!streamRecord.dynamodb.NewImage.backupDate || !streamRecord.dynamodb.NewImage.backupDate.S) {
					services.logger.error({
						streamRecord,
					}, 'Invalid metrics stream record (Missing or invalid "backupDate")');
				}
				else if (!streamRecord.dynamodb.NewImage.totalBytes || !streamRecord.dynamodb.NewImage.totalBytes.N) {
					services.logger.error({
						streamRecord,
					}, 'Invalid metrics stream record (Missing or invalid "totalBytes")');
				}
				else if (!streamRecord.dynamodb.NewImage.totalItems || !streamRecord.dynamodb.NewImage.totalItems.N) {
					services.logger.error({
						streamRecord,
					}, 'Invalid metrics stream record (Missing or invalid "totalItems")');
				}
				else if (!streamRecord.dynamodb.NewImage.errorCount || !streamRecord.dynamodb.NewImage.errorCount.N) {
					services.logger.error({
						streamRecord,
					}, 'Invalid metrics stream record (Missing or invalid "errorCount")');
				}
				else {
					const clientId = streamRecord.dynamodb.Keys.clientId.S;
					const backupDate = streamRecord.dynamodb.NewImage.backupDate.S;
					const totalBytes = parseFloat(streamRecord.dynamodb.NewImage.totalBytes.N);
					const totalItems = parseFloat(streamRecord.dynamodb.NewImage.totalItems.N);
					const errorCount = parseFloat(streamRecord.dynamodb.NewImage.errorCount.N);

					validRecords++;

					if (!ret[clientId]) {
						ret[clientId] = [];
					}

					ret[clientId].push(new BackupResultMetrics({
						backupDate,
						totalItems,
						totalBytes,
						errorCount,
					}));
				}
			}
			catch (err) {
				services.logger.error({
					err,
					streamRecord,
				}, `Failed to parse metrics stream record`);
			}

			return ret;
		}, {});

		const clientIds = Object.keys(metricsMap);

		if (!clientIds.length) {
			services.logger.debug(`Processed ${validRecords} of ${event.Records.length} records`);
			callback(null, null);
			return;
		}

		// Increment metrics for each client.
		PromiseIterate(clientIds, (clientId) => {
			services.logger.debug({
				clientId,
				clientMetrics: metricsMap[clientId],
			}, `Incrementing backup result metrics for client`);

			return services.db.incrementBackupResultMetrics(clientId, metricsMap[clientId])
				.catch((err) => {
					// Log error but do not re-throw to avoid failing ingest
					// since the backup result has been created.
					services.logger.error({
						err,
						clientId,
						clientMetrics: metricsMap[clientId],
					}, 'Failed to increment client metrics');
				});
		})
			.then(() => {
				services.logger.debug(`Processed ${validRecords} of ${event.Records.length} records`);
				callback(null, null);
			})
			.catch(callback)
			.catch((err) => {
				process.nextTick(() => {
					throw err;
				});
			});
	};
};
