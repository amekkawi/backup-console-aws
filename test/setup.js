'use strict';

const chai = require('chai');
chai.use(require('./chai-spy'));

chai.use(function(chai, _) {
	const Assertion = chai.Assertion;

	Assertion.addMethod('properties', function(props, msg) {
		if (msg) {
			_.flag(this, 'message', msg);
		}

		const negate = _.flag(this, 'negate');
		const obj = _.flag(this, 'object');

		Object.keys(props).forEach((name) => {
			const hasProperty = _.hasProperty(name, obj);
			const value = obj[name];

			if (negate && arguments.length > 1) {
				if (undefined === value) {
					msg = (msg != null) ? msg + ': ' : '';
					throw new Error(msg + _.inspect(obj) + ' has no property' + _.inspect(name));
				}
			}
			else {
				this.assert(
					hasProperty,
					'expected #{this} to have a property ' + _.inspect(name),
					'expected #{this} to not have property ' + _.inspect(name));
			}

			if (arguments.length > 1) {
				this.assert(
					props[name] === value,
					'expected #{this} to have a property ' + _.inspect(name) + ' of #{exp}, but got #{act}',
					'expected #{this} to not have a property ' + _.inspect(name) + ' of #{act}',
					props[name],
					value
				);
			}
		});
	});
});
