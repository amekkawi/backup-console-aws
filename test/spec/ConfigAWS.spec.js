'use strict';

const expect = require('expect');
const Config = require('backup-console-core/lib/Config');
const ConfigAWS = require('../../lib/ConfigAWS');

describe('ConfigAWS', function() {
	it('should extend from Config', function() {
		expect(ConfigAWS.prototype).toBeA(Config, 'Expected ConfigAWS %s to extend from %s');
	});

	it('should set props from config', function() {
		const opts = {
			AWS_REGION: 'aws-region',
			AWS_ACCOUNT_ID: 'aws-acct-id',
			AWS_RESOURCE_PREFIX: 'aws-res-prefix',
			AWS_RESOURCE_ATTR: 'aws-res-attr',
		};
		const config = new ConfigAWS(opts);

		expect(config.AWS_REGION).toBe('aws-region', 'Expected AWS_REGION %s to be %s');
		expect(config.AWS_ACCOUNT_ID).toBe('aws-acct-id', 'Expected AWS_ACCOUNT_ID %s to be %s');
		expect(config.AWS_RESOURCE_PREFIX).toBe('aws-res-prefix', 'Expected AWS_RESOURCE_PREFIX %s to be %s');
		expect(config.AWS_RESOURCE_ATTR).toBe('aws-res-attr', 'Expected AWS_RESOURCE_ATTR %s to be %s');
	});
});
