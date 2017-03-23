'use strict';

const expect = require('expect');
const TestUtils = require('expect/lib/TestUtils');
const inspect = require('object-inspect');

function formatMessage(message, args) {
	let index = 0;
	return message.replace(/%s/g, function() {
		return inspect(args[index++]);
	});
}

const baseValues = [
	void 0,
	null,
	0,
	-1,
	1,
	Infinity,
	-Infinity,
	NaN,
	Array,
	Object,
	true,
	false,
	'',
	'0',
	'1',
	'a',
	Function,
];

global.getValuesWithout = function(without) {
	const set = new Set(baseValues);
	without && without.forEach((v) => {
		if (v === String) {
			for (const val of set) {
				if (typeof val === 'string') {
					set.delete(val);
				}
			}
		}
		else if (v === Number) {
			for (const val of set) {
				if (typeof val === 'number') {
					set.delete(val);
				}
			}
		}
		else if (v === isFinite) {
			for (const val of set) {
				if (typeof val === 'number' && isFinite(val)) {
					set.delete(val);
				}
			}
		}
		else {
			set.delete(v);
		}
	});

	if (set.has(Function)) {
		set.delete(Function);
		set.add(function() {});
	}

	if (set.has(Array)) {
		set.delete(Array);
		set.add([]);
	}

	if (set.has(Object)) {
		set.delete(Object);
		set.add({});
	}

	return Array.from(set);
};

expect.extend({
	toBeObjectWithProps(objectType, props, identifier) {
		identifier = identifier || inspect(this.actual);

		expect.assert(
			TestUtils.isFunction(objectType),
			'The objectType argument in expect(actual).toBeObject() must be a function, %s was given',
			objectType
		);

		if (!this.actual || typeof this.actual !== 'object') {
			throw new Error(formatMessage(
				`Expected ${identifier} to be an object`,
				[]
			));
		}

		if (!(this.actual instanceof objectType)) {
			throw new Error(formatMessage(
				`Expected ${identifier} to be an instance of %s instead of %s`,
				[objectType, this.actual.constructor]
			));
		}

		const expectedProps = Object.keys(props).sort();
		const actualProps = Object.keys(this.actual).sort();

		if (!isArrayEqual(expectedProps, actualProps)) {
			throw new Error(formatMessage(
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
					identifier,
					formatMessage
				);
			}

			if (fnRet !== true && (fnRet === false || this.actual[actualProps[i]] !== props[actualProps[i]])) {
				throw new Error(formatMessage(
					`Expected ${identifier} prop %s value %s to be %s`,
					[actualProps[i], expectedProps[actualProps[i]], actualProps[actualProps[i]]]
				));
			}
		}
	},

	toBeArguments(args, identifier) {
		expect.assert(
			TestUtils.isArray(args),
			'The args argument in expect(actual).toBeArguments() must be an array, %s was given',
			args
		);

		expect.assert(
			TestUtils.isArray(this.actual),
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
				this.actuals[i],
				args[i]
			);
		}
	},

	toThrowWithProps(errorType, props, value) {
		expect.assert(
			TestUtils.isFunction(this.actual),
			'The "actual" argument in expect(actual).toThrowWithProps() must be a function, %s was given',
			this.actual
		);

		try {
			this.actual.apply(this.context, this.args);
		}
		catch (err) {
			if (!(err instanceof errorType)) {
				const throwErr = new Error(formatMessage(
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

		throw new Error(formatMessage(
			'Expected %s to throw an error' + (arguments.length > 0 ? ' for value %s' : ''),
			[this.actual, value]
		));
	},
});

function isArrayEqual(arrA, arrB) {
	if (arrA.length !== arrB.length) {
		return false;
	}

	for (let i = 0; i < arrA.length; i++) {
		if (arrA[i] !== arrB[i]) {
			return false;
		}
	}

	return true;
}
