const Vertex = require('./vertex');
const utils = require('./utils');
const calcArea = require('area-polygon');
const XError = require('xerror');
const EventEmitter = require('events');
const combinations = require('combinations-generator');

/**
 * Class for representing a single ring of line segments. Emits 'vertexChanged'
 * events when vertices are removed or restored.
 *
 * @class LinearRing
 * @constructor
 * @extends EventEmitter
 * @param {Array[]} points - Array of ordered vertex coordinates.
 */
class LinearRing extends EventEmitter {
	constructor(points) {
		super();

		// Ensure sure points array does not begin and end with the same point.
		points = utils.unlinkEndpoints(points);

		// Create vertex array from provided points.
		this.vertices = points.map((point, index) => new Vertex(point, index));

		// Each vertex needs a reference to each of its neighbors.
		this.vertices.forEach((vertex, index) => {
			vertex.next = this.vertices[mod(index + 1, this.vertices.length)];
			vertex.prev = this.vertices[mod(index - 1, this.vertices.length)];
		});

		// Track area changes for error calculations.
		this.originalArea = calcArea(points);
		this.areaChanged = 0;

		// Vertex array will contain nulls as placeholders for removed vertices,
		// so its length cannot be used as a count of remaining vertices.
		// Track this count independently.
		this.vertexCount = points.length;
	}

	/**
	 * Amount by which the polygon's area has been changed, relative to its
	 * total area. Used for error calculation. Read-only.
	 *
	 * @property relativeAreaChanged
	 * @type Number
	 */
	get relativeAreaChanged() {
		return this.areaChanged / this.originalArea;
	}

	/**
	 * Removes the provided vertex from the ring, updating all neighboring
	 * vertices and tracked values.
	 *
	 * @method removeVertex
	 * @param {Vertex} vertex - The vertex to be removed.
	 */
	removeVertex(vertex) {
		let { prev, next } = vertex;

		// Replace vertex with a null placeholder.
		this.vertices[vertex.index] = null;

		// Update tracked values.
		this.vertexCount -= 1;
		this.areaChanged += vertex.getArea();

		// Update previous vertex.
		prev.next = next;
		this.emit('vertexChanged', prev);

		// Update next vertex.
		next.prev = prev;
		this.emit('vertexChanged', next);
	}

	/**
	 * Returns the provided vertex from the ring, reverting all neighboring
	 * vertices and tracked values. Vertices must be restored in the same order
	 * they were removed.
	 *
	 * @method restoreVertex
	 * @param {Vertex} vertex - The vertex to be restored.
	 */
	restoreVertex(vertex) {
		let { prev, next } = vertex;

		if (prev.next !== next || next.prev !== prev) {
			// Restored vertex's neighbors are not neighbors of each other.
			// Restoration order must be incorrect.
			throw new XError(XError.INVALID_ARGUMENT, 'Incorrect restoration order');
		}

		// Replace null placeholder with the restored vertex.
		this.vertices[vertex.index] = vertex;

		// Revert tracked values.
		this.vertexCount += 1;
		this.areaChanged -= vertex.getArea();

		// Revert previous vertex.
		prev.next = vertex;
		this.emit('vertexChanged', prev);

		// Revert next vertex.
		next.prev = vertex;
		this.emit('vertexChanged', next);
	}

	/**
	 * Returns vertices remaining in the ring as a valid GeoJson coordinates array.
	 *
	 * @method toGeoJson
	 * @return {Array[]} - Array of ordered vertex coordinates.
	 */
	toGeoJson() {
		let points = this.vertices
			.filter((vertex) => !!vertex)
			.map((vertex) => vertex.point);

		return utils.linkEndpoints(points);
	}

	/**
	 * Returns array of line segments between vertices remaning in the ring.
	 *
	 * @method toLineSegments
	 * @return {Array[]} - Array of line segments in the form of [ [ x1, y1 ], [ x2, y2 ] ]
	 */
	toLineSegments() {
		return this.vertices
			.filter((vertex) => !!vertex)
			.map((vertex) => [ vertex.point, vertex.next.point ]);
	}

	/**
	 * Tests the ring for self-intersection.
	 *
	 * @method hasIntersections
	 * @return {Boolean} - True if the ring intersects itself, false otherwise.
	 */
	hasIntersections() {
		for (let combination of combinations(this.toLineSegments(), 2)) {
			if (utils.intersects(combination[0], combination[1])) return true;
		}

		return false;
	}
}

// Mod operation that handles negative numbers correctly.
function mod(n, m) {
	return ((n % m) + m) % m;
}

module.exports = LinearRing;
