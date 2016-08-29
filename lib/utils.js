const objtools = require('zs-objtools');
const lineSegmentsIntersect = require('line-segments-intersect');

exports.intersects = function(a, b) {
	if (objtools.deepEquals(a[0], b[0])) return false;
	if (objtools.deepEquals(a[0], b[1])) return false;
	if (objtools.deepEquals(a[1], b[0])) return false;
	if (objtools.deepEquals(a[1], b[1])) return false;

	return lineSegmentsIntersect(a, b);
};

exports.linkEndpoints = function(points) {
	let first = points[0];
	let last = points[points.length - 1];
	if (!objtools.deepEquals(first, last)) {
		points.push(first);
	}
};

exports.unlinkEndpoints = function(points) {
	let first = points[0];
	let last = points[points.length - 1];
	if (objtools.deepEquals(first, last)) {
		points.pop();
	}
};
