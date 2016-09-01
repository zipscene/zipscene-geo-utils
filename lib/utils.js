const objtools = require('zs-objtools');
const robustSegmentIntersect = require('robust-segment-intersect');

/**
 * General geo utility functions
 *
 * @class utils
 */

/**
 * Performs a check for non-noded intersection of two line segments.
 * Intersections occuring at endpoints are ignored.
 *
 * @method intersects
 * @param {Array[]} a - Line segment in the form of [ [ x1, y1 ], [ x2, y2 ] ]
 * @param {Array[]} b - Line segment in the form of [ [ x1, y1 ], [ x2, y2 ] ]
 * @return {Boolean} - True if the segments intersect on a non-endpoint. False otherwise.
 */
exports.intersects = function(a, b) {
	if (objtools.deepEquals(a[0], b[0])) return false;
	if (objtools.deepEquals(a[0], b[1])) return false;
	if (objtools.deepEquals(a[1], b[0])) return false;
	if (objtools.deepEquals(a[1], b[1])) return false;

	return robustSegmentIntersect(...a, ...b);
};

/**
 * Ensures that the last point in an array of coordinates is the same as the
 * first point. This is necessary for valid GeoJson.
 *
 * @method linkEndpoints
 * @param {Array[]} points - Array of coordinates in the form of [ x, y ].
 * @return {Array[]} - A copy of points with the first point copied to the end,
 *   or points unchanged if the last point was alredy the same as the first.
 */
exports.linkEndpoints = function(points) {
	let first = points[0];
	let last = points[points.length - 1];
	if (!objtools.deepEquals(first, last)) {
		let clone = points.slice();
		clone.push(first);
		return clone;
	}

	return points;
};

/**
 * Ensures that the last point in an array of coordinates is not the same as the
 * first point. This is necessary for the simplification algorithm.
 *
 * @method linkEndpoints
 * @param {Array[]} points - Array of coordinates in the form of [ x, y ].
 * @return {Array[]} - A copy of points with the last point removed, or points
 *   unchanged if the last point was not the same as the first.
 */
exports.unlinkEndpoints = function(points) {
	let first = points[0];
	let last = points[points.length - 1];
	if (points.length > 0 && objtools.deepEquals(first, last)) {
		return points.slice(0, points.length - 1);
	}

	return points;
};
