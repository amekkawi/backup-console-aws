'use strict';

const expect = require('expect');
const testUtil = require('../../testUtil');
const BackupResultMeta = require('backup-console-core/lib/structs/BackupResultMeta');
const BackupResultMetrics = require('backup-console-core/lib/structs/BackupResultMetrics');
const DBService = require('backup-console-core/lib/services/DBService');
const DBServiceAWS = require('../../../lib/services/DBServiceAWS');

describe('DBServiceAWS', function() {
	afterEach(function() {
		expect.restoreSpies();
	});

	it('should extend from Service', function() {
		expect(DBServiceAWS.prototype).toBeA(DBService, 'Expected DBServiceAWS %s to extend from %s');
	});

	describe('constructor', function() {
		it('should create instance of DynamoDB and DocumentClient', function() {
			const dbSpy = expect.createSpy();
			const docSpy = expect.createSpy();
			let dynamoDB;

			const services = {
				config: {
					AWS_REGION: 'aws-region',
				},
				platform: {
					DynamoDB: Object.assign(function() {
						dynamoDB = this; // eslint-disable-line consistent-this
						dbSpy.apply(this, arguments);
					}, {
						DocumentClient: function() {
							docSpy.apply(this, arguments);
						},
					}),
				},
			};

			new DBServiceAWS(services);

			expect(dbSpy.calls.length).toBe(1);
			expect(dbSpy.calls[0].arguments.length).toBe(1);
			expect(dbSpy.calls[0].arguments[0]).toEqual({
				region: 'aws-region',
			});

			expect(docSpy.calls.length).toBe(1);
			expect(docSpy.calls[0].arguments.length).toBe(1);
			expect(docSpy.calls[0].arguments[0]).toBeA('object');
			expect(Object.keys(docSpy.calls[0].arguments[0])).toEqual(['service']);
			expect(docSpy.calls[0].arguments[0].service).toBe(dynamoDB);
		});
	});

	describe('DBServiceAWS#addClient', function() {
		it('should call DocumentClient#put through logger.logApiCall', function() {
			const expectedError = new Error();
			const promiseSpy =  expect.createSpy()
				.andReturn(Promise.reject(expectedError));

			const putSpy = expect.createSpy()
				.andReturn({
					promise: promiseSpy,
				});

			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					return new Promise(function(resolve) {
						resolve(fn());
					});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Client.name': 'table-client-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								put: putSpy,
							};
						},
					}),
				},
			};

			const promise = new DBServiceAWS(services).addClient('client-id', 'client-key');
			expect(promise).toBeA(Promise);

			expect(apiCallSpy.calls.length).toBe(1);
			expect(apiCallSpy.calls[0].arguments.length).toBe(3);
			expect(apiCallSpy.calls[0].arguments[0]).toBe('addClient DynamoDB put');

			const createdDate = testUtil.getObjectPath(apiCallSpy.calls[0].arguments[1], 'params.Item.createdDate');
			expect(createdDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, 'Expected %s to be an ISO date string');

			expect(apiCallSpy.calls[0].arguments[1]).toEqual({
				params: {
					TableName: 'table-client-name',
					Item: {
						clientId: 'client-id',
						clientKey: 'client-key',
						createdDate,
					},
					ConditionExpression: 'attribute_not_exists(clientId)',
					ReturnValues: 'NONE',
				},
			});

			expect(putSpy.calls.length).toBe(1);
			expect(putSpy.calls[0].arguments).toBeArguments([
				apiCallSpy.calls[0].arguments[1].params,
			]);

			expect(promiseSpy.calls.length).toBe(1);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}
			});
		});
	});

	describe('DBServiceAWS#getClient', function() {
		assertGetter(
			'aws_dynamodb_table.Client.name',
			'table-client-name',
			'getClient',
			['client-id'],
			{
				clientId: 'client-id',
			}
		);

		it('should call DocumentClient#get through logger.logApiCall', function() {
			const expectedError = new Error();
			const promiseSpy =  expect.createSpy()
				.andReturn(Promise.reject(expectedError));

			const getSpy = expect.createSpy()
				.andReturn({
					promise: promiseSpy,
				});

			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					return new Promise(function(resolve) {
						resolve(fn());
					});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Client.name': 'table-client-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								get: getSpy,
							};
						},
					}),
				},
			};

			const promise = new DBServiceAWS(services).getClient('client-id');
			expect(promise).toBeA(Promise);

			expect(apiCallSpy.calls.length).toBe(1);
			expect(apiCallSpy.calls[0].arguments.length).toBe(3);
			expect(apiCallSpy.calls[0].arguments[0]).toBe('getClient DynamoDB get');
			expect(apiCallSpy.calls[0].arguments[1]).toEqual({
				params: {
					TableName: 'table-client-name',
					Key: {
						clientId: 'client-id',
					},
				},
			});

			expect(getSpy.calls.length).toBe(1);
			expect(getSpy.calls[0].arguments).toBeArguments([
				apiCallSpy.calls[0].arguments[1].params,
			]);

			expect(promiseSpy.calls.length).toBe(1);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}
			});
		});

		it('should should return "Item" property of result', function() {
			const expectedResult = {};
			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					return new Promise(function(resolve) {
						resolve(fn());
					});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Client.name': 'table-client-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								get() {
									return {
										promise() {
											return Promise.resolve({
												Item: expectedResult,
											});
										},
									};
								},
							};
						},
					}),
				},
			};

			const promise = new DBServiceAWS(services).getClient('client-id');
			expect(promise).toBeA(Promise);

			expect(apiCallSpy.calls.length).toBe(1);
			expect(apiCallSpy.calls[0].arguments.length).toBe(3);
			expect(apiCallSpy.calls[0].arguments[0]).toBe('getClient DynamoDB get');
			expect(apiCallSpy.calls[0].arguments[1]).toEqual({
				params: {
					TableName: 'table-client-name',
					Key: {
						clientId: 'client-id',
					},
				},
			});

			return promise.then(function(result) {
				expect(result).toBe(expectedResult);
			});
		});

		it('should pass options.attributes as AttributesToGet param', function() {
			const expectedError = new Error();

			const getSpy = expect.createSpy()
				.andReturn({
					promise() {
						return Promise.reject(expectedError);
					},
				});

			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					return new Promise(function(resolve) {
						resolve(fn());
					});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Client.name': 'table-client-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								get: getSpy,
							};
						},
					}),
				},
			};

			const promise = new DBServiceAWS(services).getClient('client-id', {
				attributes: ['alpha'],
			});
			expect(promise).toBeA(Promise);

			expect(apiCallSpy.calls.length).toBe(1);
			expect(apiCallSpy.calls[0].arguments.length).toBe(3);
			expect(apiCallSpy.calls[0].arguments[0]).toBe('getClient DynamoDB get');
			expect(apiCallSpy.calls[0].arguments[1]).toEqual({
				params: {
					TableName: 'table-client-name',
					Key: {
						clientId: 'client-id',
					},
					AttributesToGet: ['alpha'],
				},
			});

			expect(getSpy.calls.length).toBe(1);
			expect(getSpy.calls[0].arguments).toBeArguments([
				apiCallSpy.calls[0].arguments[1].params,
			]);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}
			});
		});
	});

	describe('DBServiceAWS#getBackupResult', function() {
		assertGetter(
			'aws_dynamodb_table.Backup.name',
			'table-backup-name',
			'getBackupResult',
			['client-id', 'backup-id'],
			{
				clientId: 'client-id',
				backupId: 'backup-id',
			}
		);

		it('should pass options.attributes as AttributesToGet param', function() {
			const expectedError = new Error();

			const getSpy = expect.createSpy()
				.andReturn({
					promise() {
						return Promise.reject(expectedError);
					},
				});

			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					return new Promise(function(resolve) {
						resolve(fn());
					});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Backup.name': 'table-backup-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								get: getSpy,
							};
						},
					}),
				},
			};

			const promise = new DBServiceAWS(services).getBackupResult('client-id', 'backup-id', {
				attributes: ['alpha'],
			});
			expect(promise).toBeA(Promise);

			expect(apiCallSpy.calls.length).toBe(1);
			expect(apiCallSpy.calls[0].arguments.length).toBe(3);
			expect(apiCallSpy.calls[0].arguments[0]).toBe('getBackupResult DynamoDB get');
			expect(apiCallSpy.calls[0].arguments[1]).toEqual({
				params: {
					TableName: 'table-backup-name',
					Key: {
						clientId: 'client-id',
						backupId: 'backup-id',
					},
					AttributesToGet: ['alpha'],
				},
			});

			expect(getSpy.calls.length).toBe(1);
			expect(getSpy.calls[0].arguments).toBeArguments([
				apiCallSpy.calls[0].arguments[1].params,
			]);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}
			});
		});
	});

	describe('DBServiceAWS#addBackupResult', function() {
		it('should call DocumentClient#put through logger.logApiCall', function() {
			const expectedError = new Error();

			const expectedMeta = new BackupResultMeta(
				'delivery-type',
				'client-id',
				'client-key',
				'backup-type',
				'backup-id'
			);

			const expectedMetrics = new BackupResultMetrics({
				backupDate: '2017-01-01T00:00:00.000Z',
				duration: 1,
				totalItems: 2,
				totalBytes: 3,
				errorCount: 4,
			});

			const promiseSpy =  expect.createSpy()
				.andReturn(Promise.reject(expectedError));

			const putSpy = expect.createSpy()
				.andReturn({
					promise: promiseSpy,
				});

			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					return new Promise(function(resolve) {
						resolve(fn());
					});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Backup.name': 'table-backup-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								put: putSpy,
							};
						},
					}),
				},
			};

			const promise = new DBServiceAWS(services).addBackupResult(
				expectedMeta,
				expectedMetrics
			);
			expect(promise).toBeA(Promise);

			expect(apiCallSpy.calls.length).toBe(1);
			expect(apiCallSpy.calls[0].arguments.length).toBe(3);
			expect(apiCallSpy.calls[0].arguments[0]).toBe('addBackupResult DynamoDB put');
			expect(apiCallSpy.calls[0].arguments[1]).toBeA('object');

			const createdDate = testUtil.getObjectPath(apiCallSpy.calls[0].arguments[1], 'params.Item.createdDate');
			expect(createdDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, 'Expected %s to be an ISO date string');

			expect(apiCallSpy.calls[0].arguments[1]).toEqual({
				params: {
					TableName: 'table-backup-name',
					Item: {
						clientId: 'client-id',
						backupId: 'backup-id',
						backupType: 'backup-type',
						deliveryType: 'delivery-type',
						backupDate: '2017-01-01T00:00:00.000Z',
						duration: 1,
						totalItems: 2,
						totalBytes: 3,
						errorCount: 4,
						createdDate,
					},
					ConditionExpression: 'attribute_not_exists(backupId)',
					ReturnValues: 'NONE',
				},
			});

			expect(putSpy.calls.length).toBe(1);
			expect(putSpy.calls[0].arguments).toBeArguments([
				apiCallSpy.calls[0].arguments[1].params,
			]);

			expect(promiseSpy.calls.length).toBe(1);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}
			});
		});

		it('should include errorMessages if truthy', function() {
			const expectedError = new Error();

			const expectedMeta = new BackupResultMeta(
				'delivery-type',
				'client-id',
				'client-key',
				'backup-type',
				'backup-id'
			);

			const expectedMetrics = new BackupResultMetrics({
				backupDate: '2017-01-01T00:00:00.000Z',
				errorMessages: [
					'err-message',
				],
			});

			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					return new Promise(function(resolve) {
						resolve(fn());
					});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Backup.name': 'table-backup-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								put() {
									return {
										promise() {
											return Promise.reject(expectedError);
										},
									};
								},
							};
						},
					}),
				},
			};

			const promise = new DBServiceAWS(services).addBackupResult(
				expectedMeta,
				expectedMetrics
			);

			expect(apiCallSpy.calls.length).toBe(1);
			expect(apiCallSpy.calls[0].arguments.length).toBe(3);
			expect(apiCallSpy.calls[0].arguments[1].params.Item.errorMessages).toEqual([
				'err-message',
			]);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}
			});
		});
	});

	describe('DBServiceAWS#incrementBackupResultMetrics', function() {
		it('should call DBService#aggregateBackupResultMetrics and catch thrown error', function() {
			const expectedError = new Error();
			const expectedBatch = [
				new BackupResultMetrics({
					backupDate: '2017-01-01T00:00:00.000Z',
					duration: 1,
					totalItems: 2,
					totalBytes: 3,
					errorCount: 4,
				}),
			];

			const services = {
				config: {
					AWS_REGION: 'aws-region',
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								put() {
									return {
										promise() {
											return Promise.reject(expectedError);
										},
									};
								},
							};
						},
					}),
				},
			};

			const service = new DBServiceAWS(services);

			const aggregateSpy = expect.spyOn(service, 'aggregateBackupResultMetrics')
				.andCall(function() {
					throw expectedError;
				});

			const incMonthlySpy = expect.spyOn(service, '_incrementBackupResultMonthlyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			const incWeeklySpy = expect.spyOn(service, '_incrementBackupResultWeeklyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			expect(aggregateSpy.calls.length).toBe(0);

			const promise = service.incrementBackupResultMetrics(
				'client-id',
				expectedBatch
			);

			expect(promise).toBeA(Promise);

			expect(aggregateSpy.calls.length).toBe(1);
			expect(aggregateSpy.calls[0].arguments).toBeArguments([
				expectedBatch,
			]);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}

				expect(incMonthlySpy.calls.length).toBe(0);
				expect(incWeeklySpy.calls.length).toBe(0);
			});
		});

		it('should call DocumentClient#update through logger.logApiCall', function() {
			const expectedError = new Error();
			const expectedMetrics = [
				new BackupResultMetrics({
					backupDate: '2017-01-01T00:00:00.000Z',
					duration: 1,
					totalItems: 2,
					totalBytes: 3,
					errorCount: 4,
				}),
			];

			const promiseSpy =  expect.createSpy()
				.andReturn(Promise.reject(expectedError));

			const updateSpy = expect.createSpy()
				.andReturn({
					promise: promiseSpy,
				});

			const apiCallSpy = expect.createSpy()
				.andCall(function(msg, fields, fn) {
					// Delay to assure handling async
					return new Promise(function(resolve) {
						setTimeout(resolve, 1);
					})
						.then(function() {
							return fn();
						});
				});

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Client.name': 'table-client-name',
					},
				},
				logger: {
					logApiCall: apiCallSpy,
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {
								update: updateSpy,
							};
						},
					}),
				},
			};

			const service = new DBServiceAWS(services);

			service.aggregateBackupResultMetrics = function() {
				return {
					byClient: {
						backupCount: 1,
						totalBytes: 2,
						totalItems: 3,
						errorCount: 4,
					},
				};
			};

			const incMonthlySpy = expect.spyOn(service, '_incrementBackupResultMonthlyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			const incWeeklySpy = expect.spyOn(service, '_incrementBackupResultWeeklyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			const promise = service.incrementBackupResultMetrics(
				'client-id',
				[expectedMetrics]
			);

			expect(promise).toBeA(Promise);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}

				expect(apiCallSpy.calls.length).toBe(1);
				expect(apiCallSpy.calls[0].arguments.length).toBe(3);
				expect(apiCallSpy.calls[0].arguments[0]).toBe('incrementBackupResultMetrics DynamoDB update');
				expect(apiCallSpy.calls[0].arguments[1]).toBeA('object');
				expect(apiCallSpy.calls[0].arguments[1]).toEqual({
					params: {
						TableName: 'table-client-name',
						Key: {
							clientId: 'client-id',
						},
						ConditionExpression: 'attribute_exists(clientId)',
						UpdateExpression: 'ADD backupCount :bc, totalBytes :tb, totalItems :ti, errorCount :ec',
						ExpressionAttributeValues: {
							':bc': 1,
							':tb': 2,
							':ti': 3,
							':ec': 4,
						},
						ReturnValues: 'NONE',
					},
				});

				expect(updateSpy.calls.length).toBe(1);
				expect(updateSpy.calls[0].arguments).toBeArguments([
					apiCallSpy.calls[0].arguments[1].params,
				]);

				expect(promiseSpy.calls.length).toBe(1);

				expect(incMonthlySpy.calls.length).toBe(0);
				expect(incWeeklySpy.calls.length).toBe(0);
			});
		});

		it('should call DBServiceAWS#_incrementBackupResultMonthlyMetrics after successful update call', function() {
			const expectedError = new Error();
			const expectedMetrics = [
				new BackupResultMetrics({
					backupDate: '2017-01-01T00:00:00.000Z',
					duration: 1,
					totalItems: 2,
					totalBytes: 3,
					errorCount: 4,
				}),
			];

			const expectedYearMonth = {};

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Client.name': 'table-client-name',
					},
				},
				logger: {
					logApiCall() {
						return Promise.resolve();
					},
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {};
						},
					}),
				},
			};

			const service = new DBServiceAWS(services);

			service.aggregateBackupResultMetrics = function() {
				return {
					byClient: {
						backupCount: 1,
						totalBytes: 2,
						totalItems: 3,
						errorCount: 4,
					},
					byYearMonth: expectedYearMonth,
				};
			};

			const incMonthlySpy = expect.spyOn(service, '_incrementBackupResultMonthlyMetrics')
				.andCall(function() {
					return new Promise(function(resolve) {
						setTimeout(resolve, 1);
					})
						.then(function() {
							throw expectedError;
						});
				});

			const incWeeklySpy = expect.spyOn(service, '_incrementBackupResultWeeklyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			return service.incrementBackupResultMetrics(
				'client-id',
				[expectedMetrics]
			).then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}

				expect(incMonthlySpy.calls.length).toBe(1);
				expect(incMonthlySpy.calls[0].arguments).toBeArguments([
					'client-id',
					expectedYearMonth,
				]);

				expect(incWeeklySpy.calls.length).toBe(0);
			});
		});

		it('should call DBServiceAWS#_incrementBackupResultWeeklyMetrics after successful _incrementBackupResultMonthlyMetrics call', function() {
			const expectedError = new Error();
			const expectedMetrics = [
				new BackupResultMetrics({
					backupDate: '2017-01-01T00:00:00.000Z',
					duration: 1,
					totalItems: 2,
					totalBytes: 3,
					errorCount: 4,
				}),
			];

			const expectedByYearWeek = {};

			const services = {
				config: {
					AWS_REGION: 'aws-region',
					AWS_RESOURCE_ATTR: {
						'aws_dynamodb_table.Client.name': 'table-client-name',
					},
				},
				logger: {
					logApiCall() {
						return Promise.resolve();
					},
				},
				platform: {
					DynamoDB: Object.assign(function() {
						// Do nothing
					}, {
						DocumentClient: function() {
							return {};
						},
					}),
				},
			};

			const service = new DBServiceAWS(services);

			service.aggregateBackupResultMetrics = function() {
				return {
					byClient: {
						backupCount: 1,
						totalBytes: 2,
						totalItems: 3,
						errorCount: 4,
					},
					byYearMonth: {},
					byYearWeek: expectedByYearWeek,
				};
			};

			service._incrementBackupResultMonthlyMetrics = function() {
				return Promise.resolve();
			};

			const incWeeklySpy = expect.spyOn(service, '_incrementBackupResultWeeklyMetrics')
				.andThrow(expectedError);

			return service.incrementBackupResultMetrics(
				'client-id',
				[expectedMetrics]
			).then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}

				expect(incWeeklySpy.calls.length).toBe(1);
				expect(incWeeklySpy.calls[0].arguments).toBeArguments([
					'client-id',
					expectedByYearWeek,
				]);
			});
		});
	});

	describe('DBServiceAWS#getClientMonthlyMetrics', function() {
		assertGetter(
			'aws_dynamodb_table.ClientMetric.name',
			'table-clientmetric-name',
			'getClientMonthlyMetrics',
			['client-id', 2016],
			{
				clientId: 'client-id',
				metricId: 'monthly-2016',
			}
		);
	});

	describe('DBServiceAWS#getClientWeeklyMetrics', function() {
		assertGetter(
			'aws_dynamodb_table.ClientMetric.name',
			'table-clientmetric-name',
			'getClientWeeklyMetrics',
			['client-id', 2016],
			{
				clientId: 'client-id',
				metricId: 'weekly-2016',
			}
		);
	});

	[
		{ method: '_incrementBackupResultMonthlyMetrics', period: 'monthly' },
		{ method: '_incrementBackupResultWeeklyMetrics', period: 'weekly' },
	]
		.forEach(function(opts) {
			describe(`DBServiceAWS#${opts.method}`, function() {
				it('should call DocumentClient#update through logger.logApiCall for each year', function() {
					const aggregatedData = {
						2016: {
							1: {
								count: 1,
								bytes: 2,
								items: 3,
								errors: 4,
							},
						},
						2017: {
							1: {
								count: 10,
								bytes: 20,
								items: 30,
								errors: 40,
							},
						},
					};

					const promiseSpy = expect.createSpy()
						.andReturn(Promise.resolve());

					const updateSpy = expect.createSpy()
						.andReturn({
							promise: promiseSpy,
						});

					const apiCallSpy = expect.createSpy()
						.andCall(function(msg, fields, fn) {
							// Delay to assure handling async
							return new Promise(function(resolve) {
								setTimeout(resolve, 1);
							})
								.then(function() {
									return fn();
								});
						});

					const services = {
						config: {
							AWS_REGION: 'aws-region',
							AWS_RESOURCE_ATTR: {
								'aws_dynamodb_table.ClientMetric.name': 'table-clientmetric-name',
							},
						},
						logger: {
							logApiCall: apiCallSpy,
						},
						platform: {
							DynamoDB: Object.assign(function() {
								// Do nothing
							}, {
								DocumentClient: function() {
									return {
										update: updateSpy,
									};
								},
							}),
						},
					};

					const service = new DBServiceAWS(services);

					const promise = service[opts.method](
						'client-id',
						aggregatedData
					);

					expect(promise).toBeA(Promise);

					return promise.then(function() {
						expect(apiCallSpy.calls.length).toBe(2);

						expect(apiCallSpy.calls[0].arguments.length).toBe(3);
						expect(apiCallSpy.calls[0].arguments[0]).toBe(`incrementBackupResultMetrics > ${opts.method} DynamoDB update`);
						expect(apiCallSpy.calls[0].arguments[1]).toBeA('object');
						expect(apiCallSpy.calls[0].arguments[1]).toEqual({
							params: {
								TableName: 'table-clientmetric-name',
								Key: {
									clientId: 'client-id',
									metricId: `${opts.period}-2016`,
								},
								UpdateExpression: `ADD #n0 :v0, #n1 :v1, #n2 :v2, #n3 :v3`,
								ExpressionAttributeNames: {
									'#n0': '1-count',
									'#n1': '1-bytes',
									'#n2': '1-items',
									'#n3': '1-errors',
								},
								ExpressionAttributeValues: {
									':v0': 1,
									':v1': 2,
									':v2': 3,
									':v3': 4,
								},
								ReturnValues: 'NONE',
							},
						});

						expect(apiCallSpy.calls[1].arguments.length).toBe(3);
						expect(apiCallSpy.calls[1].arguments[0]).toBe(`incrementBackupResultMetrics > ${opts.method} DynamoDB update`);
						expect(apiCallSpy.calls[1].arguments[1]).toBeA('object');
						expect(apiCallSpy.calls[1].arguments[1]).toEqual({
							params: {
								TableName: 'table-clientmetric-name',
								Key: {
									clientId: 'client-id',
									metricId: `${opts.period}-2017`,
								},
								UpdateExpression: `ADD #n0 :v0, #n1 :v1, #n2 :v2, #n3 :v3`,
								ExpressionAttributeNames: {
									'#n0': '1-count',
									'#n1': '1-bytes',
									'#n2': '1-items',
									'#n3': '1-errors',
								},
								ExpressionAttributeValues: {
									':v0': 10,
									':v1': 20,
									':v2': 30,
									':v3': 40,
								},
								ReturnValues: 'NONE',
							},
						});

						expect(updateSpy.calls.length).toBe(2);
						expect(updateSpy.calls[0].arguments).toBeArguments([
							apiCallSpy.calls[0].arguments[1].params,
						]);
						expect(updateSpy.calls[1].arguments).toBeArguments([
							apiCallSpy.calls[1].arguments[1].params,
						]);

						expect(promiseSpy.calls.length).toBe(2);
					});
				});

				it('should stop if update for year fails', function() {
					const expectedError = new Error();
					const aggregatedData = {
						2016: {
							1: {
								count: 1,
								bytes: 2,
								items: 3,
								errors: 4,
							},
						},
						2017: {
							1: {
								count: 10,
								bytes: 20,
								items: 30,
								errors: 40,
							},
						},
					};

					const apiCallSpy = expect.createSpy()
						.andReturn(Promise.reject(expectedError));

					const services = {
						config: {
							AWS_REGION: 'aws-region',
							AWS_RESOURCE_ATTR: {
								'aws_dynamodb_table.ClientMetric.name': 'table-clientmetric-name',
							},
						},
						logger: {
							logApiCall: apiCallSpy,
						},
						platform: {
							DynamoDB: Object.assign(function() {
								// Do nothing
							}, {
								DocumentClient: function() {
									// Do nothing
								},
							}),
						},
					};

					const service = new DBServiceAWS(services);

					const promise = service[opts.method](
						'client-id',
						aggregatedData
					);

					expect(promise).toBeA(Promise);

					return promise.then(function() {
						throw new Error('Expected to not resolve');
					}, function(err) {
						if (err !== expectedError) {
							throw err;
						}

						expect(apiCallSpy.calls.length).toBe(1);
					});
				});

				it('should only update props with non-zero values and only years with at least one prop to update', function() {
					const aggregatedData = {
						2017: {
							2: {
								count: 0,
								bytes: 200,
								items: 300,
								errors: 400,
							},
							3: {
								count: 0,
								bytes: 0,
								items: 0,
								errors: 0,
							},
						},
						2018: {
							3: {
								count: 0,
								bytes: 0,
								items: 0,
								errors: 0,
							},
						},
					};

					const apiCallSpy = expect.createSpy()
						.andReturn(Promise.resolve());

					const services = {
						config: {
							AWS_REGION: 'aws-region',
							AWS_RESOURCE_ATTR: {
								'aws_dynamodb_table.ClientMetric.name': 'table-clientmetric-name',
							},
						},
						logger: {
							logApiCall: apiCallSpy,
						},
						platform: {
							DynamoDB: Object.assign(function() {
								// Do nothing
							}, {
								DocumentClient: function() {
									// Do Nothing
								},
							}),
						},
					};

					const service = new DBServiceAWS(services);

					const promise = service[opts.method](
						'client-id',
						aggregatedData
					);

					expect(promise).toBeA(Promise);

					return promise.then(function() {
						expect(apiCallSpy.calls.length).toBe(1);

						expect(apiCallSpy.calls[0].arguments.length).toBe(3);
						expect(apiCallSpy.calls[0].arguments[0]).toBe(`incrementBackupResultMetrics > ${opts.method} DynamoDB update`);
						expect(apiCallSpy.calls[0].arguments[1]).toBeA('object');
						expect(apiCallSpy.calls[0].arguments[1]).toEqual({
							params: {
								TableName: 'table-clientmetric-name',
								Key: {
									clientId: 'client-id',
									metricId: `${opts.period}-2017`,
								},
								UpdateExpression: `ADD #n0 :v0, #n1 :v1, #n2 :v2`,
								ExpressionAttributeNames: {
									'#n0': '2-bytes',
									'#n1': '2-items',
									'#n2': '2-errors',
								},
								ExpressionAttributeValues: {
									':v0': 200,
									':v1': 300,
									':v2': 400,
								},
								ReturnValues: 'NONE',
							},
						});
					});
				});
			});
		});
});

function assertGetter(tableResourceId, tableName, method, args, key) {
	it('should call DocumentClient#get through logger.logApiCall', function() {
		const expectedError = new Error();
		const promiseSpy = expect.createSpy()
			.andReturn(Promise.reject(expectedError));

		const getSpy = expect.createSpy()
			.andReturn({
				promise: promiseSpy,
			});

		const apiCallSpy = expect.createSpy()
			.andCall(function(msg, fields, fn) {
				return new Promise(function(resolve) {
					resolve(fn());
				});
			});

		const services = {
			config: {
				AWS_REGION: 'aws-region',
				AWS_RESOURCE_ATTR: {
					[tableResourceId]: tableName,
				},
			},
			logger: {
				logApiCall: apiCallSpy,
			},
			platform: {
				DynamoDB: Object.assign(function() {
					// Do nothing
				}, {
					DocumentClient: function() {
						return {
							get: getSpy,
						};
					},
				}),
			},
		};

		const service = new DBServiceAWS(services);
		const promise = service[method].apply(service, args, key);
		expect(promise).toBeA(Promise);

		expect(apiCallSpy.calls.length).toBe(1);
		expect(apiCallSpy.calls[0].arguments.length).toBe(3);
		expect(apiCallSpy.calls[0].arguments[0]).toBe(`${method} DynamoDB get`);
		expect(apiCallSpy.calls[0].arguments[1]).toEqual({
			params: {
				TableName: tableName,
				Key: key,
			},
		});

		expect(getSpy.calls.length).toBe(1);
		expect(getSpy.calls[0].arguments).toBeArguments([
			apiCallSpy.calls[0].arguments[1].params,
		]);

		expect(promiseSpy.calls.length).toBe(1);

		return promise.then(function() {
			throw new Error('Expected not to resolve');
		}, function(err) {
			if (err !== expectedError) {
				throw err;
			}
		});
	});

	it('should should return "Item" property of result', function() {
		const expectedResult = {};
		const apiCallSpy = expect.createSpy()
			.andCall(function(msg, fields, fn) {
				return new Promise(function(resolve) {
					resolve(fn());
				});
			});

		const services = {
			config: {
				AWS_REGION: 'aws-region',
				AWS_RESOURCE_ATTR: {
					[tableResourceId]: tableName,
				},
			},
			logger: {
				logApiCall: apiCallSpy,
			},
			platform: {
				DynamoDB: Object.assign(function() {
					// Do nothing
				}, {
					DocumentClient: function() {
						return {
							get() {
								return {
									promise() {
										return Promise.resolve({
											Item: expectedResult,
										});
									},
								};
							},
						};
					},
				}),
			},
		};

		const service = new DBServiceAWS(services);
		const promise = service[method].apply(service, args, key);
		expect(promise).toBeA(Promise);

		expect(apiCallSpy.calls.length).toBe(1);
		expect(apiCallSpy.calls[0].arguments.length).toBe(3);
		expect(apiCallSpy.calls[0].arguments[0]).toBe(`${method} DynamoDB get`);
		expect(apiCallSpy.calls[0].arguments[1]).toEqual({
			params: {
				TableName: tableName,
				Key: key,
			},
		});

		return promise.then(function(result) {
			expect(result).toBe(expectedResult);
		});
	});
}
