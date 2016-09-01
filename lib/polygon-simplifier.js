const LinearRing = require('./linear-ring');
const utils = require('./utils');
const Heap = require('heap');
const calcArea = require('area-polygon');
const XError = require('xerror');
const cmb = require('combinations-generator');
const _ = require('lodash');

/**
 * Class for performing simplification operations on GeoJson polygons.
 *
 * @class PolygonSimplifier
 * @constructor
 * @param {Array[]} points - Array containing arrays of ordered vertex
 *   coordinates, one for each ring in the polygon. Rings that begin and end
 *   with the same point are supported, as are rings that don't.
 */
class PolygonSimplifier {
	constructor(points) {
		// Create a LinearRing for each set of points.
		this.rings = points.map((ringPoints) => new LinearRing(ringPoints));

		// Create an area-based heap, ascending.
		this.heap = new Heap((a, b) => a.getArea() - b.getArea());

		for (let ring of this.rings) {
			// Push all ring vertices onto the heap.
			for (let vertex of ring.vertices) {
				this.heap.push(vertex);
			}

			// Ensure heap positions are kept up to date as the ring changes.
			ring.on('vertexChanged', (vertex) => {
				if (!vertex.skipped) this.heap.updateItem(vertex);
			});
		}

		// Create an array for storing simplification history.
		this.history = [];

		// Track area changes for error calculations.
		this.areaChanged = 0;
		this.originalArea = points.slice(1)
			.reduce((p, v) => p - calcArea(v), calcArea(points[0]));
	}

	/**
	 * Total number of vertices remaning in the polygon. Read-only.
	 *
	 * @property vertexCount
	 * @type Number
	 */
	get vertexCount() {
		let total = 0;
		for (let ring of this.rings) {
			total += ring.vertexCount;
		}

		return total;
	}

	/**
	 * Amount by which the polygon's area has been changed, relative to its
	 * original area. Used for error calculation. Read-only.
	 *
	 * @property relativeAreaChanged
	 * @type Number
	 */
	get relativeAreaChanged() {
		return this.areaChanged / this.originalArea;
	}

	/**
	 * Removes the vertex with the smallest area from the polygon. Removed
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

		// Remove smallest-area vertex from its ring.
		vertex.ring.removeVertex(vertex);

		// Push smallest-area vertex onto simplification history.
		this.history.push(vertex);

		// Update area changed.
		this.areaChanged += vertex.getArea();
	}

	simplifyTo({ maxVertices, minVertices, maxError }) {
		let hasMaxVertices = _.isNumber(maxVertices);
		let hasMinVertices = _.isNumber(minVertices);
		let hasMaxError = _.isNumber(maxError);
		let hasLowerBound = hasMinVertices || hasMaxError;

		let aboveMaxVertices = () => hasMaxVertices &&
			this.vertexCount > maxVertices;

		let aboveLowerBound = () => hasLowerBound &&
			(!hasMinVertices || this.vertexCount > minVertices) &&
			(!hasMaxError || this.relativeAreaChanged < maxError);

		while (aboveMaxVertices() || aboveLowerBound()) {
			this.simplify();
		}

		let maxErrorExceeded = hasMaxError && this.relativeAreaChanged > maxError;
		let belowMaxVertices = !hasMaxVertices || this.vertexCount < maxVertices;
		if (maxErrorExceeded && belowMaxVertices) {
			this.undo();
		}
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

		// Restore most recently removed vertex to its ring.
		vertex.ring.restoreVertex(vertex);

		// Push most recently removed vertex back onto the heap.
		this.heap.push(vertex);

		// Revert area changed.
		this.areaChanged -= vertex.getArea();
	}

	/**
	 * Skips over the smallest-area vertex, marking it as skipped.
	 * A skipped vertex will never be removed from the polygon.
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

		// Mark smallest-area vertex as skipped.
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
	 * Returns vertices remaining in the polygon as a GeoJson coordinates array.
	 *
	 * @method toGeoJson
	 * @return {Array[]} - Array containing arrays of ordered vertex
	 *   coordinates, one for each ring, each beginning and ending with the
	 *   same point. Any rings with fewer than 3 vertices are not included, as
	 *   these are not valid GeoJson.
	 */
	toGeoJson() {
		return this.rings
			.filter((ring) => ring.vertexCount > 2)
			.map((ring) => ring.toGeoJson());
	}

	/**
	 * Returns array of all line segments remaining in the polygon.
	 *
	 * @method toLineSegments
	 * @return {Array[]} - Array of line segments in the form of [ [ x1, y1 ], [ x2, y2 ] ]
	 */
	toLineSegments() {
		let lineSegments = [];
		for (let ring of this.rings) {
			lineSegments = lineSegments.concat(ring.toLineSegments());
		}

		return lineSegments;
	}

	/**
	 * Tests the polygon for intersections.
	 *
	 * @method hasIntersections
	 * @return {Boolean} - True if at least one intersection occurs in the
	 *   polygon, false otherwise.
	 */
	hasIntersections() {
		// Check possible line segment combinations until an intersection is found.
		for (let combination of cmb(this.toLineSegments(), 2)) {
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
		for (let existingSegment of this.toLineSegments()) {
			if (utils.intersects(newSegment, existingSegment)) return true;
		}


		return false;
	}

	/**
	 * Reverts the simplifier to just before the first intersection in its
	 * history, then clears the history.
	 *
	 * @method rewind
	 */
	rewind() {
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

module.exports = PolygonSimplifier;
