'use strict';

const expect = require('expect');
const IngestService = require('backup-console-core/lib/services/IngestService');
const IngestServiceAWS = require('../../../lib/services/IngestServiceAWS');

describe('IngestServiceAWS', function() {
	afterEach(function() {
		expect.restoreSpies();
	});

	it('should extend from Service', function() {
		expect(IngestServiceAWS.prototype).toBeA(IngestService, 'Expected IngestServiceAWS %s to extend from %s');
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
