const XError = require('xerror');
const Polygon = require('./polygon');
const MultiPolygon = require('./multi-polygon');
const GeoSimplifier = require('./geo-simplifier');

const DEFAULT_MAX_ERROR = 0.05;
const DEFAULT_MAX_VERTICES = 200;
const DEFAULT_MIN_VERTICES = 30;

module.exports = function(geoJson, {
	maxVertices = DEFAULT_MAX_VERTICES,
	minVertices = DEFAULT_MIN_VERTICES,
	maxError = DEFAULT_MAX_ERROR
}) {
	if (maxVertices < 3) throw new XError(XError.INVALID_ARGUMENT, 'Max vertices must be at least 3');
	if (maxError > 1 || maxError < 0) throw new XError(XError.INVALID_ARGUMENT, 'Max error must be between 1 and 0');

	let options = { maxVertices, minVertices, maxError };
	let vertexCount = countVertices(geoJson);
	if (vertexCount <= options.minVertices && vertexCount <= options.maxVertices) {
		// Vertex count is already at or below both min and max vertices.
		// Return unchanged geoJson.
		return geoJson;
	}

	// Create geometry and simplifier.
	let geometry = createGeometry(geoJson);
	let simplifier = new GeoSimplifier(geometry);

	// Perform intial simplification.
	simplifier.simplifyTo(options);

	// Fix self-intersections, if any.
	while (simplifier.hasIntersections()) {
		// Revert until just before the first intersection.
		simplifier.undoToIntersection();

		// Skip offending point.
		simplifier.skip();

		// Retry simplification.
		simplifier.simplifyTo(options);
	}

	// Replace coordinates with simplified coordinates.
	geoJson.coordinates = geometry.toGeoJson();

	return geoJson;
};

function countVertices(geoJson) {
	let { coordinates, type } = geoJson;

	if (type === 'Polygon') {
		return coordinates.reduce((p, v) => p + v.length - 1, 0);
	}

	if (type === 'MultiPolygon') {
		return coordinates.reduce((p, v) => p + countVertices({
			type: 'Polygon',
			coordinates: v
		}), 0);
	}

	throw new XError(XError.INVALID_ARGUMENT, `type '${type}' not supported`);
}

function createGeometry(geoJson) {
	let { coordinates, type } = geoJson;
	if (type === 'Polygon') return new Polygon(coordinates);
	if (type === 'MultiPolygon') return new MultiPolygon(coordinates);

	throw new XError(XError.INVALID_ARGUMENT, `type '${type}' not supported`);
}
