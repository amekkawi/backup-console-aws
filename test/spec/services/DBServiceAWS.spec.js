'use strict';

const chai = require('chai');
const expect = chai.expect;
const BackupResultMeta = require('backup-console-core/lib/structs/BackupResultMeta');
const BackupResultMetrics = require('backup-console-core/lib/structs/BackupResultMetrics');
const DBService = require('backup-console-core/lib/services/DBService');
const DBServiceAWS = require('../../../lib/services/DBServiceAWS');

describe('DBServiceAWS', function() {
	afterEach(function() {
		chai.spy.restoreSpies();
	});

	it('should extend from Service', function() {
		expect(DBServiceAWS.prototype).to.be.instanceof(DBService);
	});

	describe('constructor', function() {
		it('should create instance of DynamoDB and DocumentClient', function() {
			const dbSpy = chai.spy('dbSpy');
			const docSpy = chai.spy('docSpy');
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

			const service = new DBServiceAWS(services);
			expect(service).to.be.instanceof(DBService);

			expect(dbSpy).called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).deep.equals({ region: 'aws-region' });

			expect(docSpy).called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).to.be.a('object').with.keys(['service'])
				.with.arg(0).to.have.property('service', dynamoDB);
		});
	});

	describe('DBServiceAWS#addClient', function() {
		it('should call DocumentClient#put through logger.logApiCall', function() {
			const expectedError = new Error();
			const promiseSpy =  chai.spy().andReturn(
				Promise.reject(expectedError)
			);

			const putSpy = chai.spy().andReturn({
				promise: promiseSpy,
			});

			const apiCallSpy = chai.spy(function(msg, fields, fn) {
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
			expect(promise).to.be.instanceof(Promise);

			expect(apiCallSpy).called.once
				.with.callNum(1).args.to.be.lengthOf(3)
				.with.arg(0).to.equal('addClient DynamoDB put');

			expect(apiCallSpy)
				.callNum(1).arg(1)
				.to.have.deep.property('params.Item.createdDate')
				.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);

			expect(apiCallSpy).callNum(1).arg(1).to.deep.equal({
				params: {
					TableName: 'table-client-name',
					Item: {
						clientId: 'client-id',
						clientKey: 'client-key',
						createdDate: apiCallSpy.getCall(0).args[1].params.Item.createdDate,
					},
					ConditionExpression: 'attribute_not_exists(clientId)',
					ReturnValues: 'NONE',
				},
			});

			expect(putSpy).called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params);

			expect(promiseSpy).called(1);

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
			const promiseSpy =  chai.spy()
				.andReturn(Promise.reject(expectedError));

			const getSpy = chai.spy()
				.andReturn({
					promise: promiseSpy,
				});

			const apiCallSpy = chai.spy()
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
			expect(promise).to.be.instanceof(Promise);

			expect(apiCallSpy).called.once
				.with.callNum(1).args.to.be.lengthOf(3)
				.with.arg(0).to.equal('getClient DynamoDB get')
				.with.arg(1).to.deep.equal({
					params: {
						TableName: 'table-client-name',
						Key: {
							clientId: 'client-id',
						},
					},
				});

			expect(getSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params);

			expect(promiseSpy).to.be.called(1);

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
			const apiCallSpy = chai.spy()
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
			expect(promise).to.be.instanceof(Promise);

			expect(apiCallSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(3)
				.with.arg(0).to.equal('getClient DynamoDB get')
				.with.arg(1).to.deep.equal({
					params: {
						TableName: 'table-client-name',
						Key: {
							clientId: 'client-id',
						},
					},
				});

			return promise.then(function(result) {
				expect(result).to.equal(expectedResult);
			});
		});

		it('should pass options.attributes as AttributesToGet param', function() {
			const expectedError = new Error();

			const getSpy = chai.spy()
				.andReturn({
					promise() {
						return Promise.reject(expectedError);
					},
				});

			const apiCallSpy = chai.spy()
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
			expect(promise).to.be.instanceof(Promise);

			expect(apiCallSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(3)
				.with.arg(0).to.equal('getClient DynamoDB get')
				.with.arg(1).to.deep.equal({
					params: {
						TableName: 'table-client-name',
						Key: {
							clientId: 'client-id',
						},
						AttributesToGet: ['alpha'],
					},
				});

			expect(getSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params);

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

			const getSpy = chai.spy()
				.andReturn({
					promise() {
						return Promise.reject(expectedError);
					},
				});

			const apiCallSpy = chai.spy()
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
			expect(promise).to.be.instanceof(Promise);

			expect(apiCallSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(3)
				.with.arg(0).to.equal('getBackupResult DynamoDB get')
				.with.arg(1).to.deep.equal({
					params: {
						TableName: 'table-backup-name',
						Key: {
							clientId: 'client-id',
							backupId: 'backup-id',
						},
						AttributesToGet: ['alpha'],
					},
				});

			expect(getSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params);

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

			const promiseSpy =  chai.spy()
				.andReturn(Promise.reject(expectedError));

			const putSpy = chai.spy()
				.andReturn({
					promise: promiseSpy,
				});

			const apiCallSpy = chai.spy()
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
			expect(promise).to.be.instanceof(Promise);

			expect(apiCallSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(3)
				.with.arg(0).to.equal('addBackupResult DynamoDB put')
				.with.arg(1).to.be.an('object');

			expect(apiCallSpy)
				.callNum(1).arg(1)
				.to.have.deep.property('params.Item.createdDate')
				.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);

			expect(apiCallSpy).callNum(1).arg(1).to.deep.equal({
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
						createdDate: apiCallSpy.getCall(0).args[1].params.Item.createdDate,
					},
					ConditionExpression: 'attribute_not_exists(backupId)',
					ReturnValues: 'NONE',
				},
			});

			expect(putSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params);

			expect(promiseSpy).to.be.called(1);

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

			const apiCallSpy = chai.spy()
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

			expect(apiCallSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(3)
				.with.arg(1).to.have.deep.property('params.Item.errorMessages').deep.equal([
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

			const aggregateSpy = chai.spy.on(service, 'aggregateBackupResultMetrics')
				.andThrow(expectedError);

			const incMonthlySpy = chai.spy.on(service, '_incrementBackupResultMonthlyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			const incWeeklySpy = chai.spy.on(service, '_incrementBackupResultWeeklyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			expect(aggregateSpy).not.been.called();

			const promise = service.incrementBackupResultMetrics(
				'client-id',
				expectedBatch
			);

			expect(promise).to.be.instanceof(Promise);

			expect(aggregateSpy).to.be.called.once
				.with.callNum(1).args.to.be.lengthOf(1)
				.with.arg(0).to.equal(expectedBatch);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}

				expect(incMonthlySpy).to.not.be.called();
				expect(incWeeklySpy).to.not.be.called();
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

			const promiseSpy =  chai.spy()
				.andReturn(Promise.reject(expectedError));

			const updateSpy = chai.spy()
				.andReturn({
					promise: promiseSpy,
				});

			const apiCallSpy = chai.spy()
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

			const incMonthlySpy = chai.spy.on(service, '_incrementBackupResultMonthlyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			const incWeeklySpy = chai.spy.on(service, '_incrementBackupResultWeeklyMetrics')
				.andReturn(Promise.reject('Expected not to be called'));

			const promise = service.incrementBackupResultMetrics(
				'client-id',
				[expectedMetrics]
			);

			expect(promise).to.be.instanceof(Promise);

			return promise.then(function() {
				throw new Error('Expected not to resolve');
			}, function(err) {
				if (err !== expectedError) {
					throw err;
				}

				expect(apiCallSpy).called.once
					.with.callNum(1).args.to.be.lengthOf(3)
					.with.arg(0).to.equal('incrementBackupResultMetrics DynamoDB update')
					.with.arg(1).to.be.an('object')
					.with.arg(1).to.deep.equal({
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

				expect(updateSpy).called.once
					.with.callNum(1).args.to.be.lengthOf(1)
					.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params);

				expect(promiseSpy).called(1);

				expect(incMonthlySpy).to.not.be.called();
				expect(incWeeklySpy).to.not.be.called();
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

			const incMonthlySpy = chai.spy.on(service, '_incrementBackupResultMonthlyMetrics')
				.andCall(function() {
					return new Promise(function(resolve) {
						setTimeout(resolve, 1);
					})
						.then(function() {
							throw expectedError;
						});
				});

			const incWeeklySpy = chai.spy.on(service, '_incrementBackupResultWeeklyMetrics')
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

				expect(incMonthlySpy).called.once
					.with.callNum(1).args.to.be.lengthOf(2)
					.with.arg(0).to.equal('client-id')
					.with.arg(1).to.equal(expectedYearMonth);

				expect(incWeeklySpy).to.not.be.called();
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

			const incWeeklySpy = chai.spy.on(service, '_incrementBackupResultWeeklyMetrics')
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

				expect(incWeeklySpy).called.once
					.with.callNum(1).args.to.be.lengthOf(2)
					.with.arg(0).to.equal('client-id')
					.with.arg(1).to.equal(expectedByYearWeek);
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

					const promiseSpy = chai.spy()
						.andReturn(Promise.resolve());

					const updateSpy = chai.spy()
						.andReturn({
							promise: promiseSpy,
						});

					const apiCallSpy = chai.spy()
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

					expect(promise).to.be.instanceof(Promise);

					return promise.then(function() {
						expect(apiCallSpy).called(2);

						expect(apiCallSpy).callNum(1).args.to.be.lengthOf(3)
							.with.arg(0).to.equal(`incrementBackupResultMetrics > ${opts.method} DynamoDB update`)
							.with.arg(1).to.be.an('object')
							.with.arg(1).to.deep.equal({
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

						expect(apiCallSpy).callNum(2).args.to.be.lengthOf(3)
							.arg(0).to.equal(`incrementBackupResultMetrics > ${opts.method} DynamoDB update`)
							.arg(1).to.be.an('object')
							.arg(1).to.deep.equal({
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

						expect(updateSpy).called(2)
							.with.callNum(1).args.to.be.lengthOf(1)
							.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params)
							.with.callNum(2).args.to.be.lengthOf(1)
							.with.arg(0).to.equal(apiCallSpy.getCall(1).args[1].params);

						expect(promiseSpy).called(2);
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

					const apiCallSpy = chai.spy()
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

					expect(promise).to.be.instanceof(Promise);

					return promise.then(function() {
						throw new Error('Expected to not resolve');
					}, function(err) {
						if (err !== expectedError) {
							throw err;
						}

						expect(apiCallSpy).called(1);
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

					const apiCallSpy = chai.spy()
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

					expect(promise).to.be.instanceof(Promise);

					return promise.then(function() {
						expect(apiCallSpy).called.once
							.with.callNum(1).args.to.be.lengthOf(3)
							.with.arg(0).to.equal(`incrementBackupResultMetrics > ${opts.method} DynamoDB update`)
							.with.arg(1).to.be.an('object')
							.with.arg(1).to.deep.equal({
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
		const promiseSpy = chai.spy()
			.andReturn(Promise.reject(expectedError));

		const getSpy = chai.spy()
			.andReturn({
				promise: promiseSpy,
			});

		const apiCallSpy = chai.spy()
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
		expect(promise).to.be.instanceof(Promise);

		expect(apiCallSpy).called.once
			.with.callNum(1).args.to.be.lengthOf(3)
			.with.arg(0).to.equal(`${method} DynamoDB get`)
			.with.arg(1).to.deep.equal({
				params: {
					TableName: tableName,
					Key: key,
				},
			});

		expect(getSpy).called.once
			.with.callNum(1).args.to.be.lengthOf(1)
			.with.arg(0).to.equal(apiCallSpy.getCall(0).args[1].params);

		expect(promiseSpy).called(1);

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
		const apiCallSpy = chai.spy()
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
		expect(promise).to.be.instanceof(Promise);

		expect(apiCallSpy).called.once
			.with.callNum(1).args.to.be.lengthOf(3)
			.with.arg(0).to.equal(`${method} DynamoDB get`)
			.with.arg(1).to.deep.equal({
				params: {
					TableName: tableName,
					Key: key,
				},
			});

		return promise.then(function(result) {
			expect(result).to.equal(expectedResult);
		});
	});
}
