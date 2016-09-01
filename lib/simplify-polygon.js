const XError = require('xerror');
const PolygonSimplifier = require('./polygon-simplifier');

const DEFAULT_MAX_ERROR = 0.05;
const DEFAULT_MAX_VERTICES = 200;
const DEFAULT_MIN_VERTICES = 30;

module.exports = function(polygon, {
	maxVertices = DEFAULT_MAX_VERTICES,
	minVertices = DEFAULT_MIN_VERTICES,
	maxError = DEFAULT_MAX_ERROR
}) {
	if (maxVertices < 3) throw new XError(XError.INVALID_ARGUMENT, 'Max vertices must be at least 3');
	if (maxError > 1 || maxError < 0) throw new XError(XError.INVALID_ARGUMENT, 'Max error must be between 1 and 0');
	let options = { maxVertices, minVertices, maxError };

	let { coordinates, type } = polygon;
	if (type === 'Polygon') {
		// Replace coordinates with simplified coordinates.
		polygon.coordinates = simplify(coordinates, options);
	} else if (type === 'MultiPolygon') {
		// Replace each set of coordinates with simplified coordinates.
		polygon.coordinates = coordinates.map((multiCoordinate) => simplify(multiCoordinate, options));
	} else {
		throw new XError(XError.INVALID_ARGUMENT, `Polygon type '${type}' not supported`);
	}
	return polygon;
};

function simplify(coordinates, options) {
	let vertexCount = coordinates.reduce((p, v) => p + v.length - 1, 0);
	if (vertexCount <= options.minVertices && vertexCount <= options.maxVertices) {
		// Vertex count is already at or below both min and max vertices.
		// Return unchanged coordinates.
		return coordinates;
	}

	// Create polygon simplifier.
	let simplifier = new PolygonSimplifier(coordinates);

	// Perform intial simplification.
	simplifier.simplifyTo(options);

	// Fix self-intersections, if any.
	while (simplifier.hasIntersections()) {
		// Rewind until just before the first intersection.
		simplifier.rewind();

		// Skip offending point.
		simplifier.skip();

		// Retry simplification.
		simplifier.simplifyTo(options);
	}

	// return the polygon as a valid GeoJson coordinates array.
	return simplifier.toGeoJson();
}
