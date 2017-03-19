'use strict';

const ReceivingService = require('backup-console-core/lib/services/ReceivingService');

/**
 * TODO
 *
 * @property {Services} services
 */
class ReceivingServiceAWS extends ReceivingService {

	/**
	 * @param {Services} services
	 */
	constructor(services) {
		super(services);
	}
}

module.exports = ReceivingServiceAWS;
