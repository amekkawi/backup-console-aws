'use strict';

const expect = require('expect');
const expectUtils = require('expect/lib/TestUtils');
const inspect = require('object-inspect');
const testUtil = require('./testUtil');

expect.extend({
	toBeObjectWithProps(objectType, props, identifier) {
		identifier = identifier || inspect(this.actual);

		expect.assert(
			expectUtils.isFunction(objectType),
			'The objectType argument in expect(actual).toBeObject() must be a function, %s was given',
			objectType
		);

		if (!this.actual || typeof this.actual !== 'object') {
			throw new Error(testUtil.formatMessage(
				`Expected ${identifier} to be an object`,
				[]
			));
		}

		if (!(this.actual instanceof objectType)) {
			throw new Error(testUtil.formatMessage(
				`Expected ${identifier} to be an instance of %s instead of %s`,
				[objectType, this.actual.constructor]
			));
		}

		const expectedProps = Object.keys(props).sort();
		const actualProps = Object.keys(this.actual).sort();

		if (!testUtil.isArrayEqual(expectedProps, actualProps)) {
			throw new Error(testUtil.formatMessage(
				`Expected ${identifier} prop keys %s to be %s`,
				[expectedProps, actualProps]
			));
		}

		for (let i = 0; i < actualProps.length; i++) {
			let fnRet;
			if (typeof props[actualProps[i]] === 'function') {
				fnRet = props[actualProps[i]].call(
					this,
					actualProps[i],
					props,
					identifier
				);
			}

			if (fnRet !== true && (fnRet === false || this.actual[actualProps[i]] !== props[actualProps[i]])) {
				throw new Error(testUtil.formatMessage(
					`Expected ${identifier} prop %s value %s to be %s`,
					[actualProps[i], expectedProps[actualProps[i]], actualProps[actualProps[i]]]
				));
			}
		}
	},

	toBeArguments(args, identifier) {
		expect.assert(
			expectUtils.isArray(args),
			'The args argument in expect(actual).toBeArguments() must be an array, %s was given',
			args
		);

		expect.assert(
			expectUtils.isArray(this.actual),
			'The "actual" for expect(actual).toBeArguments() must be an array, %s was given',
			args
		);

		expect.assert(
			this.actual.length === args.length,
			`Expected${identifier ? ` ${identifier} ` : ' '} call arg length %s to be %s`,
			this.actual.length,
			args.length
		);

		for (let i = 0, l = args.length; i < l; i++) {
			expect.assert(
				this.actual[i] === args[i],
				`Expected${identifier ? ` ${identifier} ` : ' '} call arg[%s] %s to be %s`,
				i,
				this.actual[i],
				args[i]
			);
		}
	},

	toThrowWithProps(errorType, props, value) {
		expect.assert(
			expectUtils.isFunction(this.actual),
			'The "actual" argument in expect(actual).toThrowWithProps() must be a function, %s was given',
			this.actual
		);

		try {
			this.actual.apply(this.context, this.args);
		}
		catch (err) {
			if (!(err instanceof errorType)) {
				const throwErr = new Error(testUtil.formatMessage(
					'Expected %s to throw an instance of %s instead of %s' + (arguments.length > 2 ? ' for value %s' : ''),
					[this.actual, errorType || 'an error', err.constructor, value]
				));
				throwErr.stack = throwErr.message + '\n' + err.stack;
				throw throwErr;
			}

			if (props) {
				expect(err).toInclude(props, 'Expected %s to include %s' + (arguments.length > 2 ? ' for value ' + inspect(value) : ''));
			}

			return this;
		}

		throw new Error(testUtil.formatMessage(
			'Expected %s to throw an error' + (arguments.length > 0 ? ' for value %s' : ''),
			[this.actual, value]
		));
	},
});
