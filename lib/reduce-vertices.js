const XError = require('xerror');
const RingSimplifier = require('./ring-simplifier');
const utils = require('./utils');

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

	// Make sure points array does not begin and end with the same point,
	// which would cause errors with self-intersect detection.
	utils.unlinkEndpoints(points);

	// Exit early if ring is already smaller than min vertices
	if (points.length <= minVertices) {
		// add the first point as the last point (for valid geojson)
		utils.linkEndpoints(points);
		return points;
	}

	// Create linear ring simplifier
	let ring = new RingSimplifier(points);

	function simplifyRing() {
		// FIRST, we simplify the ring down to our maxVertices
		while (ring.vertexCount && ring.vertexCount > maxVertices) {
			ring.simplify();
		}

		// NEXT, we further simplify until either we either hit our error threshold or our minVertices
		while (ring.vertexCount > minVertices) {
			ring.simplify();

			if (ring.relativeAreaChanged > maxError) {
				// Removing this vertex exceeded our maxError. Put it back and exit the loop.
				ring.undo();
				break;
			}
		}
	}

	// Perform initial simplification.
	simplifyRing();

	// Fix self-intersections, if any.
	while (ring.hasIntersections()) {
		// Rewind until just before the first self-intersection.
		ring.rewind();

		// Skip offending point.
		ring.skip();

		// Retry simplification.
		simplifyRing();
	}

	// get coordinates of the remaining vertices
	let simplifiedPolygon = ring.toArray();

	// add the first point as the last point (for valid geojson)
	utils.linkEndpoints(simplifiedPolygon);

	return simplifiedPolygon;
};
