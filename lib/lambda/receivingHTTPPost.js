'use strict';

const VerifyIdentifierResult = require('backup-console-core/lib/structs/VerifyIdentifierResult');

module.exports = function(services) {
	return function receivingHTTPPost(event, context, callback) {
		// eslint-disable-next-line no-console
		console.log(`receivingHTTPPost at ${new Date().toISOString()}`);

		// Initialize the logger service.
		services.logger.initLogger(
			`${context.functionName}/[${context.functionVersion}]${context.awsRequestId}`
		);

		const backupId = `httppost/${context.awsRequestId}`;

		const sendResponse = (statusCode, message) => {
			callback(null, {
				statusCode,
				body: JSON.stringify({ message }),
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
					'Access-Control-Allow-Methods': event.httpMethod,
					'Access-Control-Allow-Origin': '*',
				},
			});
		};

		// Verify the API Gateway resource path.
		const expectedResource = services.config.AWS_RESOURCE_ATTR['aws_api_gateway_resource.APIReceivingProxy.path'];
		if (event.resource !== expectedResource) {
			services.logger.warn({
				eventResource: event.resource,
				expectedResource,
			}, 'Unexpected API gateway resource');

			sendResponse(500, 'Encountered a server-side configuration issue (Unexpected API gateway resource)');
			return;
		}

		if (!event.pathParameters || !event.pathParameters.proxy) {
			services.logger.warn({
				eventPathParameters: event.pathParameters || null,
			}, 'Missing API gateway "proxy" path parameter');

			sendResponse(500, 'Encountered a server-side configuration issue (Missing API gateway "proxy" path parameter)');
			return;
		}

		services.logger.debug({
			identifierString: event.pathParameters.proxy,
		}, 'Verifying HTTP Post client');

		services.receiving.verifyBackupResultIdentifier(event.pathParameters.proxy)
			.then((result) => {
				switch (result.status) {

					case VerifyIdentifierResult.INVALID_IDENTIFIER:
						services.logger.warn(`Invalid client backup result identifier: ${JSON.stringify(event.pathParameters.proxy)}`);
						sendResponse(400, `Invalid client backup result identifier: ${JSON.stringify(event.pathParameters.proxy)}`);
						break;

					case VerifyIdentifierResult.CLIENT_NOT_FOUND:
						services.logger.warn(`Client not found: ${result.identifier.clientId}`);
						sendResponse(404, `Client not found: ${JSON.stringify(result.identifier.clientId)}`);
						break;

					case VerifyIdentifierResult.CLIENT_KEY_MISMATCH:
						services.logger.warn(`Client key mismatch: ${result.identifier.clientId}`);
						sendResponse(404, `Client not found: ${JSON.stringify(result.identifier.clientId)}`);
						break;

					case VerifyIdentifierResult.CLIENT_KEY_MATCHED:
						services.logger.debug({
							backupId,
							clientId: result.identifier.clientId,
						}, 'Client verified');

						return services.receiving.receiveBackupResult(
							result.identifier,
							backupId,
							event.isBase64Encoded
								? new Buffer(event.body, 'base64')
								: event.body
						)
							.then(() => {
								services.logger.info({
									deliveryType: 'httppost',
									backupId,
									clientId: result.identifier.clientId,
									backupType: result.identifier.backupType,
								}, 'Backup result received');

								callback(null, {
									statusCode: 200,
									body: JSON.stringify({ message: 'Success' }),
									headers: {
										'Content-Type': 'application/json',
										'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
										'Access-Control-Allow-Methods': event.httpMethod,
										'Access-Control-Allow-Origin': '*',
									},
								});
							}, (err) => {
								services.logger.error({ err }, 'Failed to put backup result into storage');
								sendResponse(500, 'Encountered a server-side error');
							});

					default:
						throw new Error(`Invalid VerifyIdentifierResult status: ${result.status}`);
				}
			}, (err) => {
				services.logger.error({ err }, 'Failed to verify HTTP Post identifier for backup results delivery');
				sendResponse(500, 'Encountered a server-side error');
			})
			.catch((err) => {
				services.logger.error({ err }, 'Error during receivingHTTPPost');
				sendResponse(500, 'Encountered a server-side error');
			})
			.catch((err) => {
				process.nextTick(() => {
					throw err;
				});
			});
	};
};
