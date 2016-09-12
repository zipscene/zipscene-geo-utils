const Geometry = require('./geometry');
const Vertex = require('./vertex');
const utils = require('./utils');
const XError = require('xerror');
const calculateArea = require('area-polygon');

/**
 * Class for representing a single ring of line segments.
 *
 * @class LinearRing
 * @constructor
 * @extends Geometry
 * @param {Array[]} points - Array of ordered vertex coordinates. Supports arrays
 *   that begin and end with the same point, as well as arrays that do not.
 */
class LinearRing extends Geometry {
	constructor(points) {
		super();

		// Ensure sure points array does not begin and end with the same point.
		points = utils.unlinkEndpoints(points);

		// Create vertex array from provided points.
		this.vertices = points.map((p, i) => new Vertex(p, this, i));

		// Prepare handler to propagate vertexChanged events.
		let propagateVertexChanged = (vertex) => {
			this.emit('vertexChanged', vertex);
		};

		this.vertices.forEach((vertex, index) => {
			// Set neighbor references.
			vertex.next = this.vertices[mod(index + 1, this.vertices.length)];
			vertex.prev = this.vertices[mod(index - 1, this.vertices.length)];

			// Add vertexChanged handler.
			vertex.on('vertexChanged', propagateVertexChanged);
		});
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

		// Update adjacent vertices.
		prev.next = next;
		next.prev = prev;
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
			throw new XError(XError.INVALID_ARGUMENT, 'Incorrect restoration order.');
		}

		// Replace null placeholder with the restored vertex.
		this.vertices[vertex.index] = vertex;

		// Revert adjacent vertices.
		prev.next = vertex;
		next.prev = vertex;
	}

	listVertices() {
		return this.vertices.filter((v) => !!v);
	}

	calculateArea() {
		return calculateArea(this.listVertices().map((v) => v.point));
	}

	toLineSegments() {
		return this.listVertices().map((v) => [ v.point, v.next.point ]);
	}

	toGeoJson() {
		let vertices = this.listVertices();

		// Rings with fewer than 3 vertices are invalid GeoJson.
		// Return them as empty instead, since they might as well be.
		if (vertices.length < 3) return [];

		return utils.linkEndpoints(vertices.map((v) => v.point));
	}
}

// Mod operation that handles negative numbers correctly.
function mod(n, m) {
	return ((n % m) + m) % m;
}

module.exports = LinearRing;
