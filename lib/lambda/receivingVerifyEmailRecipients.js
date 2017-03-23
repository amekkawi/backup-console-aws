'use strict';

const VerifyEmailRecipientsResult = require('backup-console-core/lib/structs/VerifyEmailRecipientsResult');

module.exports = function(services) {
	return function receivingVerifyEmailRecipients(event, context, callback) {
		// eslint-disable-next-line no-console
		console.log(`receivingVerifyEmailRecipients at ${new Date().toISOString()}`);

		// Initialize the logger service.
		services.logger.initLogger(
			`${context.functionName}/[${context.functionVersion}]${context.awsRequestId}`
		);

		const backupId = `email/${event.Records[0].ses.mail.messageId}`;
		const recipients = event.Records[0].ses.receipt.recipients;

		services.logger.debug({
			backupId,
			recipients: event.Records[0].ses.receipt.recipients,
		}, 'Verifying e-mail recipients');

		services.receiving.verifyEmailRecipients(recipients)
			.then((result) => {
				if (result.matching.length > 1) {
					services.logger.warn({
						matchingRecipients: result.matching,
					}, `More than one (${result.matching.length}) recipient found, using first`);
				}

				switch (result.status) {
					case VerifyEmailRecipientsResult.NO_MATCHES:
						services.logger.warn(`No valid recipients found: ${JSON.stringify(recipients)}`);
						callback(null, { disposition: 'STOP_RULE' });
						break;
					case VerifyEmailRecipientsResult.CLIENT_NOT_FOUND:
						services.logger.warn(`Client not found: ${result.matching[0].clientId}`);
						callback(null, { disposition: 'STOP_RULE' });
						break;
					case VerifyEmailRecipientsResult.CLIENT_KEY_MISMATCH:
						services.logger.warn(`Client key mismatch: ${result.matching[0].clientId}`);
						callback(null, { disposition: 'STOP_RULE' });
						break;
					case VerifyEmailRecipientsResult.CLIENT_KEY_MATCHED:
						services.logger.debug({
							backupId,
							clientId: result.matching[0].clientId,
						}, 'Client verified');

						services.logger.info({
							deliveryType: 'email',
							backupId,
							clientId: result.matching[0].clientId,
							backupType: result.matching[0].backupType,
						}, 'Backup result received');
						callback(null, { disposition: 'CONTINUE' });
						break;
					default:
						throw new Error(`Invalid VerifyEmailRecipientsResult status: ${result.status}`);
				}
			})
			.catch((err) => {
				services.logger.error({ err }, 'Failed to verify e-mail recipients for backup results delivery');
				callback(null, { disposition: 'STOP_RULE' });
			})
			.catch((err) => {
				process.nextTick(() => {
					throw err;
				});
			});
	};
};
