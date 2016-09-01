const XError = require('xerror');
const PolygonSimplifier = require('./polygon-simplifier');

const DEFAULT_MAX_ERROR = 0.05;
const DEFAULT_MAX_VERTICES = 200;
const DEFAULT_MIN_VERTICES = 30;

module.exports = function(points, {
	maxVertices = DEFAULT_MAX_VERTICES,
	minVertices = DEFAULT_MIN_VERTICES,
	maxError = DEFAULT_MAX_ERROR }
) {
	if (maxVertices < 3) throw new XError(XError.INVALID_ARGUMENT, 'Max vertices must be at least 3');
	if (maxError > 1 || maxError < 0) throw new XError(XError.INVALID_ARGUMENT, 'Max error must be between 1 and 0');

	// Exit early if ring is already smaller than min vertices.
	if (points.length <= minVertices) return points;

	// Create polygon simplifier with a single ring.
	let polygon = new PolygonSimplifier([ points ]);

	// Perform intial simplification.
	let options = { maxVertices, minVertices, maxError };
	polygon.simplifyTo(options);

	// Fix self-intersections, if any.
	while (polygon.hasIntersections()) {
		// Rewind until just before the first intersection.
		polygon.rewind();

		// Skip offending point.
		polygon.skip();

		// Retry simplification.
		polygon.simplifyTo(options);
	}

	// return the ring as a valid GeoJson coordinates array.
	return polygon.toGeoJson()[0];
};
