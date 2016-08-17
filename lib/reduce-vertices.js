const _ = require('lodash');
const Heap = require('heap');
const objtools = require('zs-objtools');
const XError = require('xerror');
const LinearRing = require('./linear-ring');

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
	if (points.length > 0) {
		let firstPoint = points[0];
		let lastPoint = points[points.length - 1];
		let isEqual = objtools.deepEquals(firstPoint, lastPoint);
		if (isEqual) {
			points = points.slice(0, points.length - 1);
		}
	}

	// Initialize linear ring of points, placing each vertex in an area heap.
	let ring = new LinearRing(points);
	let areaHeap = new Heap((a, b) => a.getArea() - b.getArea());
	for (let vertex of ring.vertices) {
		areaHeap.push(vertex);
	}

	// Ensure that heap positions of vertices are kept up to date.
	ring.on('vertexChanged', (vertex) => {
		areaHeap.updateItem(vertex);
	});

	// FIRST, we simplify the ring down to our maxVertices
	while (ring.vertexCount && ring.vertexCount > maxVertices) {
		ring.removeVertex(areaHeap.pop());
	}

	// NEXT, we further simplify until either we either hit our error threshold or our minVertices
	while (ring.vertexCount > minVertices) {
		let vertex = areaHeap.pop();
		ring.removeVertex(vertex);

		if (ring.relativeAreaChanged > maxError) {
			// Removing this vertex exceeded our maxError. Put it back and exit the loop.
			ring.restoreVertex(vertex);
			break;
		}
	}

	// get coordinates of the remaining vertices
	let simplifiedPolygon = ring.toArray();

	// add the first point as the last point (for valid geojson)
	if (simplifiedPolygon.length > 0) {
		let firstPoint = simplifiedPolygon[0];
		let lastPoint = simplifiedPolygon[simplifiedPolygon.length - 1];
		let isEqual = objtools.deepEquals(firstPoint, lastPoint);
		if (!isEqual) {
			simplifiedPolygon.push(firstPoint);
		}
	}

	return simplifiedPolygon;
};
