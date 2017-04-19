'use strict';

const expect = require('chai').expect;
const Config = require('backup-console-core/lib/Config');
const ConfigAWS = require('../../lib/ConfigAWS');

describe('ConfigAWS', function() {
	it('should extend from Config', function() {
		expect(ConfigAWS.prototype).to.be.instanceof(Config);
	});

	it('should set props from config', function() {
		const opts = {
			AWS_REGION: 'aws-region',
			AWS_ACCOUNT_ID: 'aws-acct-id',
			AWS_RESOURCE_PREFIX: 'aws-res-prefix',
			AWS_RESOURCE_ATTR: 'aws-res-attr',
		};
		const config = new ConfigAWS(opts);
		expect(config).to.be.instanceof(Config);

		expect(config).property('AWS_REGION', 'aws-region');
		expect(config).property('AWS_ACCOUNT_ID', 'aws-acct-id');
		expect(config).property('AWS_RESOURCE_PREFIX', 'aws-res-prefix');
		expect(config).property('AWS_RESOURCE_ATTR', 'aws-res-attr');
	});
});
