// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const Heap = require('heap');
const XError = require('xerror');
const _ = require('lodash');
const cmb = require('combinations-generator');
const utils = require('./utils');

/**
 * Class for performing simplification operations on GeoJson geometries.
 *
 * @class GeoSimplifier
 * @constructor
 * @param {Geometry} geometry - geometry object to be simplified. Simplification
 *    will occur in place.
 */
class GeoSimplifier {
	constructor(geometry) {
		this.geometry = geometry;

		// Push all vertices from geometry onto an ascending area heap.
		this.heap = new Heap((a, b) => a.getArea() - b.getArea());
		for (let vertex of this.geometry.listVertices()) {
			this.heap.push(vertex);
		}

		// Ensure heap positions are kept up to date as vertices change.
		this.geometry.on('vertexChanged', (vertex) => {
			if (!vertex.skipped) this.heap.updateItem(vertex);
		});

		// Create an array for storing simplification history.
		this.history = [];

		// Initialize tracked values for stopping points.
		this.vertexCount = this.heap.size();
		this.originalArea = this.geometry.calculateArea();
		this.areaChanged = 0;
	}

	/**
	 * Amount by which the geometry's area has been changed, relative to its
	 * original area. Used for error calculation. Read-only.
	 *
	 * @property relativeAreaChanged
	 * @type Number
	 */
	get relativeAreaChanged() {
		return this.areaChanged / this.originalArea;
	}

	/**
	 * Removes the vertex with the smallest area from the geometry. Removed
	 * vertices are stored in history, and can be restored using the undo
	 * method.
	 *
	 * @method simplify
	 */
	simplify() {
		// Pop the smallest-area vertex from the heap.
		let vertex = this.heap.pop();

		// Throw if heap was empty.
		if (!vertex) {
			throw new XError(XError.INVALID_ARGUMENT, 'No remaining vertices.');
		}

		// Remove popped vertex from its ring.
		vertex.remove();

		// Push removed vertex onto simplification history.
		this.history.push(vertex);

		// Update tracked values for stopping points.
		this.vertexCount -= 1;
		this.areaChanged += vertex.getArea();
	}

	/**
	 * Undoes the most recent simplify call.
	 *
	 * @method undo
	 */
	undo() {
		// Pop the most recently removed vertex from history.
		let vertex = this.history.pop();

		// Throw if history was empty.
		if (!vertex) {
			throw new XError(XError.INVALID_ARGUMENT, 'Simplification history is empty.');
		}

		// Restore popped vertex to its ring.
		vertex.restore();

		// Push restored vertex back onto the heap.
		this.heap.push(vertex);

		// Revert tracked values for stopping points.
		this.vertexCount += 1;
		this.areaChanged -= vertex.getArea();
	}

	/**
	 * Skips over the smallest-area vertex, marking it as skipped.
	 * A skipped vertex will never be removed from the geometry.
	 *
	 * @method skip
	 */
	skip() {
		// Pop the smallest-area vertex from the heap.
		let vertex = this.heap.pop();

		// Throw if heap was empty.
		if (!vertex) {
			throw new XError(XError.INVALID_ARGUMENT, 'No remaining vertices.');
		}

		// Mark popped vertex as skipped.
		vertex.skipped = true;
	}

	/**
	 * Clears the simplification history.
	 *
	 * @method clearHistory
	 */
	clearHistory() {
		this.history = [];
	}

	/**
	 * Calls simplify until the geometry reaches a state defined by provided options.
	 *
	 * @method simplifyTo
	 * @param {Object} options - A set of named options describing the target
	 *   state of the geometry. If left empty, this method will do nothing.
	 *   @param {Number} [options.maxVertices] - Result will not have more
	 *      vertices than this number, regardless of other options.
	 *   @param {Number} [options.minVertices] - Result will not have fewer
	 *      vertices than this number, unless it is larger than maxVertices.
	 *   @param {Number} [options.maxError] - Result's relativeAreaChanged will
	 *      not exceed this number, unless reduction to maxVertices causes it to
	 *      do so.
	 */
	simplifyTo({ maxVertices, minVertices, maxError }) {
		// Check existence of various options.
		let hasMaxVertices = _.isNumber(maxVertices);
		let hasMinVertices = _.isNumber(minVertices);
		let hasMaxError = _.isNumber(maxError);
		let hasLowerBound = hasMinVertices || hasMaxError;

		let exceedsMaxVertices = () => hasMaxVertices &&
			this.vertexCount > maxVertices;

		let aboveLowerBound = () => hasLowerBound &&
			(!hasMinVertices || this.vertexCount > minVertices) &&
			(!hasMaxError || this.relativeAreaChanged < maxError);

		// Simplify until specified conditions have been met.
		while (exceedsMaxVertices() || aboveLowerBound()) {
			this.simplify();
		}

		let maxErrorExceeded = hasMaxError && this.relativeAreaChanged > maxError;
		let belowMaxVertices = !hasMaxVertices || this.vertexCount < maxVertices;
		if (maxErrorExceeded && belowMaxVertices) {
			// Last simplification exceeded maxError, and undoing it would not
			// exceed maxVertices. Therefore, it should be undone.
			this.undo();
		}
	}

	/**
	 * Tests the geometry for intersections.
	 *
	 * @method hasIntersections
	 * @return {Boolean} - True if at least one intersection occurs in the
	 *   geometry, false otherwise.
	 */
	hasIntersections() {
		// Check possible line segment combinations until an intersection is found.
		for (let combination of cmb(this.geometry.toLineSegments(), 2)) {
			if (utils.intersects(combination[0], combination[1])) return true;
		}

		// No intersections found.
		return false;
	}

	/**
	 * Checks if the next simplify call will cause an intersection.
	 *
	 * @method willIntersect
	 * @return {Boolean} - True if removing the next vertex would cause
	 *   an intersection, false otherwise.
	 */
	willIntersect() {
		// Get the line segment that would be created by the next simplify call.
		let { prev, next } = this.heap.peek();
		let newSegment = [ prev.point, next.point ];

		// Check for intersection with existing line segments.
		for (let existingSegment of this.geometry.toLineSegments()) {
			if (utils.intersects(newSegment, existingSegment)) return true;
		}


		return false;
	}

	/**
	 * Reverts the geometry to just before the first intersection in history,
	 * then clears history.
	 *
	 * @method undoToIntersection
	 */
	undoToIntersection() {
		let minVertexCount = this.vertexCount;
		let bisectSearch = () => {
			if (this.hasIntersections()) {
				minVertexCount = this.vertexCount;
				let targetHistoryLength = Math.floor(this.history.length / 2);
				while (this.history.length > targetHistoryLength) {
					this.undo();
				}

				bisectSearch();
			} else if (!this.willIntersect()) {
				this.clearHistory();
				let forwardRange = this.vertexCount - minVertexCount;
				if (forwardRange === 0) {
					throw new XError(XError.INVALID_ARGUMENT, 'First intersection could not be found.');
				}

				let targetHistoryLength = Math.ceil(forwardRange / 2);
				while (this.history.length < targetHistoryLength) {
					this.simplify();
				}

				bisectSearch();
			}
		};

		bisectSearch();
		this.clearHistory();
	}
}

module.exports = GeoSimplifier;
