'use strict';

const chai = require('chai');
const IngestService = require('backup-console-core/lib/services/IngestService');
const IngestServiceAWS = require('../../../lib/services/IngestServiceAWS');

describe('IngestServiceAWS', function() {
	afterEach(function() {
		chai.spy.restoreSpies();
	});

	it('should extend from Service', function() {
		expect(IngestServiceAWS.prototype).to.be.instanceof(IngestService);
	});

	describe('constructor', function() {
		it('should create instance of Lambda');
	});

	describe('IngestServiceAWS#invokeQueueWorker', function() {
		it('IngestServiceAWS#invokeQueueWorker'); // TODO
	});

	describe('IngestServiceAWS#extractQueueMessagePayload', function() {
		it('IngestServiceAWS#extractQueueMessagePayload'); // TODO
	});

	describe('IngestServiceAWS#extractBackupResultMetaEmail', function() {
		it('IngestServiceAWS#extractBackupResultMetaEmail'); // TODO
	});

	describe('IngestServiceAWS#extractBackupResultMetaHTTPPost', function() {
		it('IngestServiceAWS#extractBackupResultMetaHTTPPost'); // TODO
	});
});
