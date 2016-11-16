// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const EventEmitter = require('events');
const calcArea = require('area-polygon');
const XError = require('xerror');
const _ = require('lodash');

/**
 * Class for representing a vertex in a ring of line segments. Emits the
 * initial 'vertexChanged' events propagated by Geometry subclasses.
 *
 * @class Vertex
 * @constructor
 * @extends EventEmitter
 * @param {Number[]} point - Ordered pair of vertex coordinates.
 * @param {LinearRing} ring - Reference to the ring to which the vertex belongs.
 * @param {Number} index - Numerical index of the vertex in its ring.
 */
class Vertex extends EventEmitter {
	constructor(point, ring, index) {
		super();

		this.point = point;
		this.ring = ring;
		this.index = index;

		this._prev = null;
		this._next = null;
		this._area = null;

		this.skipped = false;
	}

	/**
	 * Reference to the previous vertex in the ring.
	 *
	 * @property prev
	 * @type Vertex
	 */
	get prev() {
		return this._prev;
	}
	set prev(value) {
		this._prev = value;

		// Clear cached area.
		this._area = null;

		// Emit vertexChanged event.
		this.emit('vertexChanged', this);
	}

	/**
	 * Reference to the next vertex in the ring.
	 *
	 * @property next
	 * @type Vertex
	 */
	get next() {
		return this._next;
	}
	set next(value) {
		this._next = value;

		// Clear cached area.
		this._area = null;

		// Emit vertexChanged event.
		this.emit('vertexChanged', this);
	}

	/**
	 * Gets the area of the triangle formed by this vertex and its two neighbors
	 * in the ring.
	 *
	 * @method getArea
	 * @return {Number} - Calculated area
	 */
	getArea() {
		// The area calculation will be repeated several times for the same vertex.
		// As such, its result is cached until the vertex's triangle is changed.
		if (!_.isNumber(this._area)) {
			if (!this.prev) throw new XError(XError.INVALID_ARGUMENT, 'prev not set.');
			if (!this.next) throw new XError(XError.INVALID_ARGUMENT, 'next not set.');
			this._area = calcArea([ this.point, this.prev.point, this.next.point ]);
		}

		return this._area;
	}

	/**
	 * Removes the vertex from its ring.
	 *
	 * @method remove
	 */
	remove() {
		this.ring.removeVertex(this);
	}

	/**
	 * Returns the vertex to its ring.
	 *
	 * @method restore
	 */
	restore() {
		this.ring.restoreVertex(this);
	}
}

module.exports = Vertex;
