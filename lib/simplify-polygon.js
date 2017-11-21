// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const XError = require('xerror');
const Polygon = require('./polygon');
const MultiPolygon = require('./multi-polygon');
const GeoSimplifier = require('./geo-simplifier');
const fixSelfIntersections = require('./fix-self-intersections');

const DEFAULT_MAX_ERROR = 0.05;
const DEFAULT_MAX_VERTICES = 200;
const DEFAULT_MIN_VERTICES = 30;

/**
 * Geo utility functions
 *
 * @class geo-utils
 */

 /**
  * Simplifies the provided GeoJSON Polygon or MultiPolygon.
  *
  * @method simplifyPolygon
  * @param {Object} geoJson - A GeoJSON Polygon or MultiPolygon to simplify.
  *   Simplification will be performed in place; this object's coordinates
  *   property will be replaced.
  * @param {Object} options - Simplification options
  *   @param {Number} [options.maxVertices=200] - Result will not have more
  *      vertices than this number, regardless of other options.
  *   @param {Number} [options.minVertices=30] - Result will not have fewer
  *      vertices than this number, unless it is larger than maxVertices.
  *   @param {Number} [options.maxError=0.05] - Result's area changed, relative
  *      to the polygon's original area, will not exceed this number, unless
  *      reduction to maxVertices causes it to do so.
  *   @param {Boolean} [options.fixIntersections=false] - If true, the algorithm
  *      will attempt to fix intersections that occur between line segments in
  *      the polygon. Polygons that cannot be simplified without intersections,
  *      such as those that contain intersections before simplification begins,
  *      will cause errors.
  * @return {Object} geoJson - Same GeoJSON object.
  */
module.exports = function(geoJson, {
	maxVertices = DEFAULT_MAX_VERTICES,
	minVertices = DEFAULT_MIN_VERTICES,
	maxError = DEFAULT_MAX_ERROR,
	fixIntersections = false
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

	// Fix intersections if option is set.
	if (fixIntersections) {
		while (simplifier.hasIntersections()) {
			// Revert until just before the first intersection.
			simplifier.undoToIntersection();

			// Skip offending point.
			simplifier.skip();

			// Retry simplification.
			simplifier.simplifyTo(options);
		}
	}

	// Replace coordinates with simplified coordinates.
	geoJson.coordinates = geometry.toGeoJson();
	if (fixIntersections) {
		// Clean up any self-intersections that arose during simplfication
		geoJson = fixSelfIntersections(geoJson);
	}

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