'use strict';

const _SPY = Symbol('chai-spy');
const _SPY_GETPROXY = Symbol('chai-spy-getproxy');
const hasOwnProp = Object.prototype.hasOwnProperty;

module.exports = function(chai, _) {

	// Easy access
	const Assertion = chai.Assertion;

	chai.spy = function(name, fn) {
		if (typeof name === 'function') {
			fn = name;
			name = undefined;
		}

		if (!fn) {
			fn = function() {
			};
		}

		const proxy = makeProxy(fn.length, function() {
			const args = Array.prototype.slice.call(arguments);
			proxy[_SPY].calls.push({
				[_SPY_GETPROXY]: function() {
					return proxy;
				},
				context: this,
				args,
			});
			proxy[_SPY].called = true;
			return fn.apply(this, args);
		});

		proxy.prototype = fn.prototype;

		proxy.toString = function toString() {
			const l = this[_SPY].calls.length;
			let s = '{ Spy';
			if (this[_SPY].name) {
				s += ' "' + this[_SPY].name + '"';
			}
			if (l > 0) {
				s += ', ' + l + ' call' + (l > 1 ? 's' : '');
			}
			s += ' }';
			return s;
		};

		proxy.getCalls = function() {
			return this[_SPY].calls;
		};

		proxy.getCall = function(callIndex) {
			return this[_SPY].calls[callIndex];
		};

		proxy.reset = function() {
			this[_SPY] = {
				calls: [],
				called: false,
				name,
			};
			return this;
		};

		proxy.andCall = function(newFn) {
			fn = newFn;
			return this;
		};

		proxy.andReturn = function(value) {
			fn = function() {
				return value;
			};
			return this;
		};

		proxy.andThrow = function(err) {
			fn = function() {
				throw err;
			};
			return this;
		};

		return proxy.reset();
	};

	chai.spy.globalRestore = new Set();

	chai.spy.restoreSpies = function() {
		for (const restoreSpy of chai.spy.globalRestore) {
			restoreSpy(true);
		}
	};

	function makeProxy(length, fn) {
		switch (length) {
			case 0 :
				return function() {
					return fn.apply(this, arguments);
				};
			case 1 :
				return function(a) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 2 :
				return function(a, b) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 3 :
				return function(a, b, c) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 4 :
				return function(a, b, c, d) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 5 :
				return function(a, b, c, d, e) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 6 :
				return function(a, b, c, d, e, f) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 7 :
				return function(a, b, c, d, e, f, g) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 8 :
				return function(a, b, c, d, e, f, g, h) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			case 9 :
				return function(a, b, c, d, e, f, g, h, i) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
			default :
				return function(a, b, c, d, e, f, g, h, i, j) { // eslint-disable-line no-unused-vars
					return fn.apply(this, arguments);
				};
		}
	}

	chai.spy.on = function(object, methodName) {
		const hasOwn = hasOwnProp.call(object, methodName);
		const original = object[methodName];

		const spy = chai.spy(methodName, object[methodName]);

		spy.restoreSpy = restoreSpy;
		chai.spy.globalRestore.add(restoreSpy);

		object[methodName] = spy;
		return object[methodName];

		function restoreSpy(recursive) {
			chai.spy.globalRestore.delete(restoreSpy);

			if (object[methodName] === spy) {
				if (hasOwn) {
					object[methodName] = original;

					// Recursively restore any nested spies.
					if (recursive && typeof original === 'function' && original[_SPY]) {
						original.restoreSpy();
					}
				}
				else {
					delete object[methodName];
				}
			}
		}
	};

	chai.spy.object = function(name, methods) {
		let defs = {};

		if (name && typeof name === 'object') {
			methods = name;
			name = 'object';
		}

		if (methods && !Array.isArray(methods)) {
			defs = methods;
			methods = Object.keys(methods);
		}

		return methods.reduce(function(object, methodName) {
			object[methodName] = chai.spy(name + '.' + methodName, defs[methodName]);
			return object;
		}, {});
	};

	function assertSpy() {
		this.assert(
			this._obj && this._obj[_SPY],
			'expected ' + this._obj + ' to be a spy',
			'expected ' + this._obj + ' to not be a spy'
		);
	}

	Assertion.addChainableMethod('spy', assertSpy, assertSpy);

	function assertCalled(callCount) {
		new Assertion(this._obj).to.be.spy();
		const spy = this._obj[_SPY];

		if (callCount) {
			this.assert(
				spy.calls.length === callCount,
				'expected ' + this._obj + ' to have been called #{exp} but got #{act}',
				'expected ' + this._obj + ' to have not been called #{exp}',
				callCount,
				spy.calls.length
			);
		}
		else {
			this.assert(
				spy.called === true,
				'expected ' + this._obj + ' to have been called',
				'expected ' + this._obj + ' to not have been called'
			);
		}
	}

	function assertCalledChain() {
		new Assertion(this._obj).to.be.spy();
	}

	Assertion.addChainableMethod(
		'called',
		assertCalled,
		assertCalledChain
	);

	Assertion.addMethod('callNum', function(callNumber) {
		let proxy = this._obj;

		if (!proxy || (!proxy[_SPY] && !proxy[_SPY_GETPROXY])) {
			proxy = _.flag(this, 'spyCall');
		}

		if (proxy && proxy[_SPY_GETPROXY]) {
			proxy = proxy[_SPY_GETPROXY]();
		}

		new Assertion(proxy).to.be.spy();
		new Assertion(proxy).to.have.been.called.min(callNumber);

		const spyCall = proxy[_SPY].calls[callNumber - 1];
		_.flag(this, 'spyCall', spyCall);
		_.flag(this, 'object', spyCall);
	});

	Assertion.overwriteMethod('context', function(_super) {
		return function(equalValue) {
			if (this._obj && this._obj[_SPY_GETPROXY]) {
				this.assert(
					this._obj.context === equalValue,
					'expected call context #{this} to equal #{exp}',
					'expected call context #{this} to not equal #{exp}',
					equalValue,
					this._obj.context,
					true
				);
			}
			else {
				_super.apply(this, arguments);
			}
		};
	});

	Assertion.addProperty('args', function() {
		const spyCall = _.flag(this, 'spyCall');
		if (!spyCall) {
			throw new Error('Must call argument assertion after call assertion');
		}

		_.flag(this, 'object', spyCall.args);
	});

	Assertion.addMethod('arg', function(argumentIndex) {
		const spyCall = _.flag(this, 'spyCall');
		if (!spyCall) {
			throw new Error('Must call argument assertion after call assertion');
		}

		_.flag(this, 'object', spyCall.args[argumentIndex]);
	});

	Assertion.addProperty('once', function() {
		new Assertion(this._obj).to.be.spy();
		this.assert(
			this._obj[_SPY].calls.length === 1,
			'expected ' + this._obj + ' to have been called once but got #{act}',
			'expected ' + this._obj + ' to not have been called once',
			1,
			this._obj[_SPY].calls.length
		);
	});

	Assertion.addProperty('twice', function() {
		new Assertion(this._obj).to.be.spy();
		this.assert(
			this._obj[_SPY].calls.length === 2,
			'expected ' + this._obj + ' to have been called twice but got #{act}',
			'expected ' + this._obj + ' to not have been called twice',
			2,
			this._obj[_SPY].calls.length
		);
	});

	function assertWith() {
		new Assertion(this._obj).to.be.spy();
		const args = [].slice.call(arguments, 0);
		const calls = this._obj[_SPY].calls;
		const always = _.flag(this, 'spy always');
		let passed;

		if (always) {
			passed = 0;
			calls.forEach(function(call) {
				let found = 0;

				args.forEach(function(arg) {
					for (let i = 0; i < call.length; i++) {
						if (_.eql(call[i], arg)) {
							found++;
						}
					}
				});

				if (found === args.length) {
					passed++;
				}
			});

			this.assert(
				passed === calls.length,
				'expected ' + this._obj + ' to have been always called with #{exp} but got ' + passed + ' out of ' + calls.length,
				'expected ' + this._his + ' to have not always been called with #{exp}',
				args
			);
		}
		else {
			passed = 0;
			calls.forEach(function(call) {
				let found = 0;

				args.forEach(function(arg) {
					for (let i = 0; i < call.length; i++) {
						if (_.eql(call[i], arg)) {
							found++;
						}
					}
				});

				if (found === args.length) {
					passed++;
				}
			});

			this.assert(
				passed > 0,
				'expected ' + this._obj + ' to have been called with #{exp}',
				'expected ' + this._his + ' to have not been called with #{exp} but got ' + passed + ' times',
				args
			);
		}
	}

	function assertWithChain() {
		if ('undefined' !== this._obj[_SPY]) {
			_.flag(this, 'spy with', true);
		}
	}

	Assertion.addChainableMethod(
		'with',
		assertWith,
		assertWithChain
	);

	Assertion.addProperty('always', function() {
		if ('undefined' !== this._obj[_SPY]) {
			_.flag(this, 'spy always', true);
		}
	});

	Assertion.addMethod('exactly', function() {
		new Assertion(this._obj).to.be.spy();
		const always = _.flag(this, 'spy always');
		const _with = _.flag(this, 'spy with');
		const args = [].slice.call(arguments, 0);
		const calls = this._obj[_SPY].calls;
		let passed;

		if (always && _with) {
			passed = 0;
			calls.forEach(function(call) {
				if (call.length !== args.length) {
					return;
				}
				if (_.eql(call, args)) {
					passed++;
				}
			});

			this.assert(
				passed === calls.length,
				'expected ' + this._obj + ' to have been always called with exactly #{exp} but got ' + passed + ' out of ' + calls.length,
				'expected ' + this._obj + ' to have not always been called with exactly #{exp}',
				args
			);
		}
		else if (_with) {
			passed = 0;
			calls.forEach(function(call) {
				if (call.length !== args.length) {
					return;
				}
				if (_.eql(call, args)) {
					passed++;
				}
			});

			this.assert(
				passed > 0,
				'expected ' + this._obj + ' to have been called with exactly #{exp}',
				'expected ' + this._obj + ' to not have been called with exactly #{exp} but got ' + passed + ' times',
				args
			);
		}
		else {
			this.assert(
				this._obj[_SPY].calls.length === args[0],
				'expected ' + this._obj + ' to have been called #{exp} times but got #{act}',
				'expected ' + this._obj + ' to not have been called #{exp} times',
				args[0],
				this._obj[_SPY].calls.length
			);
		}
	});

	function above(_super) {
		return function(callCount) {
			if ('undefined' !== typeof this._obj[_SPY]) {
				new Assertion(this._obj).to.be.spy();

				this.assert(
					this._obj[_SPY].calls.length > callCount
					, 'expected ' + this._obj + ' to have been called more than #{exp} times but got #{act}'
					, 'expected ' + this._obj + ' to have been called at most #{exp} times but got #{act}'
					, callCount
					, this._obj[_SPY].calls.length
				);
			}
			else {
				_super.apply(this, arguments);
			}
		};
	}

	Assertion.overwriteMethod('above', above);
	Assertion.overwriteMethod('gt', above);

	function below(_super) {
		return function(callCount) {
			if ('undefined' !== typeof this._obj[_SPY]) {
				new Assertion(this._obj).to.be.spy();

				this.assert(
					this._obj[_SPY].calls.length < callCount
					, 'expected ' + this._obj + ' to have been called fewer than #{exp} times but got #{act}'
					, 'expected ' + this._obj + ' to have been called at least #{exp} times but got #{act}'
					, callCount
					, this._obj[_SPY].calls.length
				);
			}
			else {
				_super.apply(this, arguments);
			}
		};
	}

	Assertion.overwriteMethod('below', below);
	Assertion.overwriteMethod('lt', below);

	function min(_super) {
		return function(callCount) {
			if ('undefined' !== typeof this._obj[_SPY]) {
				new Assertion(this._obj).to.be.spy();

				this.assert(
					this._obj[_SPY].calls.length >= callCount
					, 'expected ' + this._obj + ' to have been called at least #{exp} times but got #{act}'
					, 'expected ' + this._obj + ' to have been called fewer than #{exp} times but got #{act}'
					, callCount
					, this._obj[_SPY].calls.length
				);
			}
			else {
				_super.apply(this, arguments);
			}
		};
	}

	Assertion.overwriteMethod('min', min);
	Assertion.overwriteMethod('least', min);

	function max(_super) {
		return function(n) {
			if ('undefined' !== typeof this._obj[_SPY]) {
				new Assertion(this._obj).to.be.spy();

				this.assert(
					this._obj[_SPY].calls.length <= n
					, 'expected ' + this._obj + ' to have been called at most #{exp} times but got #{act}'
					, 'expected ' + this._obj + ' to have been called more than #{exp} times but got #{act}'
					, n
					, this._obj[_SPY].calls.length
				);
			}
			else {
				_super.apply(this, arguments);
			}
		};
	}

	Assertion.overwriteMethod('max', max);
	Assertion.overwriteMethod('most', max);
};
