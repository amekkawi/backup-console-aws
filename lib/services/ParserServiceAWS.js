'use strict';

const ParserService = require('backup-console-core/lib/services/ParserService');

class ParserServiceAWS extends ParserService {
	constructor(services, backupResultParsers) {
		super(services, backupResultParsers);
	}
}

module.exports = ParserServiceAWS;
