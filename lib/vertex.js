const calcArea = require('area-polygon');
const XError = require('xerror');
const _ = require('lodash');

class Vertex {
	constructor(point, index) {
		this.point = point;
		this.index = index;

		this._prev = null;
		this._next = null;
		this._area = null;

		this.skipped = false;
	}

	get prev() {
		return this._prev;
	}

	set prev(value) {
		this._prev = value;
		this._area = null;
	}

	get next() {
		return this._next;
	}

	set next(value) {
		this._next = value;
		this._area = null;
	}

	getArea() {
		if (!_.isNumber(this._area)) {
			if (!this.prev) throw new XError(XError.INVALID_ARGUMENT, 'prev not set');
			if (!this.next) throw new XError(XError.INVALID_ARGUMENT, 'next not set');
			this._area = calcArea([ this.point, this.prev.point, this.next.point ]);
		}

		return this._area;
	}
}

module.exports = Vertex;
