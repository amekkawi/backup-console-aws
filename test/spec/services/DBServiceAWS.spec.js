'use strict';

const expect = require('expect');
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
			expect(apiCallSpy.calls[0].arguments[1]).toBeA('object');
			expect(apiCallSpy.calls[0].arguments[1].params).toBeA('object');
			expect(apiCallSpy.calls[0].arguments[1].params.Item).toBeA('object');
			expect(apiCallSpy.calls[0].arguments[1].params.Item.createdDate).toBeA('string');
			expect(apiCallSpy.calls[0].arguments[1].params.Item.createdDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
			expect(apiCallSpy.calls[0].arguments[1]).toEqual({
				params: {
					TableName: 'table-client-name',
					Item: {
						clientId: 'client-id',
						clientKey: 'client-key',
						createdDate: apiCallSpy.calls[0].arguments[1].params.Item.createdDate,
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

			const promise = new DBServiceAWS(services).getBackupResult('client-id', 'backup-id');
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

			const promise = new DBServiceAWS(services).getBackupResult('client-id', 'backup-id');
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
		it('should call DocumentClient#put through logger.logApiCall');
		it('should include errorMessages if truthy');
	});

	describe('DBServiceAWS#incrementBackupResultMetrics', function() {
		it('should call DBService#aggregateBackupResultMetrics and catch thrown error');
		it('should call DocumentClient#update through logger.logApiCall');
		it('should call DBServiceAWS#_incrementBackupResultMonthlyMetrics after successful update call');
		it('should call DBServiceAWS#_incrementBackupResultWeeklyMetrics after successful _incrementBackupResultMonthlyMetrics call');
	});

	describe('DBServiceAWS#getClientMonthlyMetrics', function() {
		it('should call DocumentClient#get through logger.logApiCall');
		it('should should return "Item" property of result');
	});

	describe('DBServiceAWS#getClientWeeklyMetrics', function() {
		it('should call DocumentClient#get through logger.logApiCall');
		it('should should return "Item" property of result');
	});

	describe('DBServiceAWS#_incrementBackupResultMonthlyMetrics', function() {
		it('DBServiceAWS#_incrementBackupResultMonthlyMetrics'); // TODO
	});

	describe('DBServiceAWS#_incrementBackupResultWeeklyMetrics', function() {
		it('DBServiceAWS#_incrementBackupResultWeeklyMetrics'); // TODO
	});
});
