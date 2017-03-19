'use strict';

const Config = require('backup-console-core/lib/Config');

class ConfigAWS extends Config {
	constructor(config) {
		super(config);

		this.AWS_REGION = config.AWS_REGION;
		this.AWS_ACCOUNT_ID = config.AWS_ACCOUNT_ID;
		this.AWS_RESOURCE_PREFIX = config.AWS_RESOURCE_PREFIX;
		this.AWS_RESOURCE_ATTR = config.AWS_RESOURCE_ATTR;
	}
}

module.exports = ConfigAWS;
