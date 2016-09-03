const EventEmitter = require('events');
const XError = require('xerror');

/**
 * Abstract base class for GeoJson geometries, used for testing the
 * GeoSimplifier class. All of this class's methods should be overidden by
 * derived classes, which should also emit 'vertexChanged' events whenever
 * a vertex somewhere in the geometry is changed by the simplification
 * algorithm.
 *
 * @class Geometry
 * @constructor
 * @extends EventEmitter
 */
class Geometry extends EventEmitter {
	/**
	 *  Returns all vertices remaining in the geometry.
	 *
	 * @method listVertices
	 * @return {Vertex[]} - Array of vertices remaining in the geometry.
	 */
	listVertices() {
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}

	/**
	 *  Calculates the area of the geometry.
	 *
	 * @method listVertices
	 * @return {Number} - calculated area.
	 */
	calculateArea() {
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}

	/**
	 * Returns line segments between vertices remaning in the geometry.
	 *
	 * @method toLineSegments
	 * @return {Array[]} - Array of line segments in the form of [ [ x1, y1 ], [ x2, y2 ] ]
	 */
	toLineSegments() {
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}

	/**
	 * Returns vertices remaining in the geometry as a GeoJson coordinates array.
	 * Point arrays will begin and end with the same point, as required for
	 * valid GeoJson.
	 *
	 * @method toGeoJson
	 * @return {Array[]} - Array of ordered vertex coordinates.
	 */
	toGeoJson() {
		throw new XError(XError.UNSUPPORTED_OPERATION);
	}
}

module.exports = Geometry;
