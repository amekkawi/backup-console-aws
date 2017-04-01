'use strict';

const inspect = require('object-inspect');

exports.formatMessage = function(message, args) {
	let index = 0;
	return message.replace(/%s/g, function() {
		return inspect(args[index++]);
	});
};

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

exports.getObjectPath = function getObjectPath(obj, path) {
	if (typeof path === 'string') {
		path = path.split(/\./g);
	}

	for (let i = 0; i < path.length; i++) {
		if (obj != null) {
			obj = obj[path[i]];
		}
	}

	return obj;
};

exports.getValuesWithout = function getValuesWithout(without) {
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

exports.isArrayEqual = function(arrA, arrB) {
	if (arrA.length !== arrB.length) {
		return false;
	}

	for (let i = 0; i < arrA.length; i++) {
		if (arrA[i] !== arrB[i]) {
			return false;
		}
	}

	return true;
};
