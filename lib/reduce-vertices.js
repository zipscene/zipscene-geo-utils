const _ = require('lodash');
const BSTree = require('binary-search-tree').BinarySearchTree;
const calcArea = require('area-polygon');
const XError = require('xerror');

const DEFAULT_MAX_ERROR = 0.05;
const DEFAULT_MAX_VERTICES = 200;
const DEFAULT_MIN_VERTICES = 30;

module.exports = function(vertices, {
	maxVertices = DEFAULT_MAX_VERTICES,
	minVertices = DEFAULT_MIN_VERTICES,
	maxError = DEFAULT_MAX_ERROR }
) {
	if (maxVertices < 3) throw new XError(XError.INVALID_ARGUMENT, 'Max vertices must be at least 3');
	if (maxError > 1 || maxError < 0) throw new XError(XError.INVALID_ARGUMENT, 'Max error must be between 1 and 0');

	// save original polygon's area to caclulate error
	let startingArea = calcArea(vertices);
	// initialize the AVL tree to hold our areas
	let areaBSTree = new BSTree({ unique: true });
	let neighborIdMap = {};
	// initialize neighborIdMap and areaBSTree
	for (let i = 0; i < vertices.length; i++) {
		let leftNeighborIdx = mod(i - 1, vertices.length);
		let rightNeighborIdx = mod(i + 1, vertices.length);
		// get neightbors
		let vertex = vertices[i];
		let leftNeighbor = vertices[leftNeighborIdx];
		let rightNeighbor = vertices[rightNeighborIdx];
		// caclulate area
		let area = calcArea([ vertex, leftNeighbor, rightNeighbor ]);
		neighborIdMap[i] = {
			id: i,
			point: vertex,
			area
		};
	}
	// insert each vertex into the BST tree and populate all next and prev references
	// NOTE: randomization of the keys is to avoid having a very imbalanced BST tree
	let vertexIds = _.shuffle(Object.keys(neighborIdMap));
	for (let vertexId of vertexIds) {
		let rightNeighborIdx = mod(parseInt(vertexId, 10) + 1, vertexIds.length);
		let leftNeighborIdx = mod(parseInt(vertexId, 10) - 1, vertexIds.length);

		let vertex = neighborIdMap[vertexId];
		vertex.next = neighborIdMap[rightNeighborIdx];
		vertex.prev = neighborIdMap[leftNeighborIdx];

		let areaId = createAreaId(vertex.area, vertex.id);
		areaBSTree.insert(areaId, vertex.id);
	}

	// FIRST, we simplify the polygon down to our maxVertices
	let numVerticies = areaBSTree.getNumberOfKeys();
	let totalAreaChanged = 0;
	while (maxVertices && numVerticies > maxVertices) {
		let removedVertex = removeSmallestArea(areaBSTree, neighborIdMap);
		// keep track of total area removed/added
		totalAreaChanged += removedVertex.area;
		// delete the removed vertex from the neighbor map
		delete neighborIdMap[removedVertex.id];
		// update numVerticies
		numVerticies = areaBSTree.getNumberOfKeys();
	}
	// NEXT, we further simplify until either we either hit our error threshold or our minVertices
	while (
		maxError > (totalAreaChanged / startingArea) &&
		numVerticies > minVertices
	) {
		let removedVertex = removeSmallestArea(areaBSTree, neighborIdMap);
		totalAreaChanged += removedVertex.area;
		// if this removal causes our error to exceed the given threshold, break (we are done)
		if (maxError <= (totalAreaChanged / startingArea)) break;
		// delete the removed vertex from the neighbor map
		delete neighborIdMap[removedVertex.id];
		// update numVerticies
		numVerticies = areaBSTree.getNumberOfKeys();
	}
	// get coordinates of the remaining vertices
	let simplifiedPolygon = [];
	for (let vertexId in neighborIdMap) {
		simplifiedPolygon.push(vertices[vertexId]);
	}
	return simplifiedPolygon;
};

function removeSmallestArea(areaBSTree, neighborIdMap) {
	// first we remove the vertex with the smallest area
	let minArea = areaBSTree.getMinKey();
	let vertexId = areaBSTree.search(minArea)[0];
	let vertex = neighborIdMap[vertexId];
	areaBSTree.delete(minArea);

	// next we need to recalculate removed vertex's neighbor pointers
	let next = vertex.next;
	let prev = vertex.prev;
	vertex.prev.next = next;
	vertex.next.prev = prev;

	// remove the old areas from the BSTree
	let nextAreaId = createAreaId(next.area, next.id);
	let prevAreaId = createAreaId(prev.area, prev.id);
	areaBSTree.delete(nextAreaId);
	areaBSTree.delete(prevAreaId);


	// recalculate the areas of the neighbor vertecies
	next.area = calcArea([ next.point, next.next.point, next.prev.point ]);
	prev.area = calcArea([ prev.point, prev.next.point, prev.prev.point ]);

	// insert the newly caclulated vertices
	areaBSTree.insert(createAreaId(next.area, next.id), next.id);
	areaBSTree.insert(createAreaId(prev.area, prev.id), prev.id);

	return vertex;
}

// area id's are in the form <area>-<index>. The area is formated with 6 decimal places and 4 whole numbers.
// (i.e 0010-1 for area = 10 and index = 1)
function createAreaId(area, id) {
	area = area.toFixed(6);
	// get the number of zeroes we need to pad the area id with (sub 1 to account for decimal place)
	let zeroPad = 10 - (area.length - 1);
	let zeros = '';
	for (let i = 0; i < zeroPad; i++) {
		zeros += '0';
	}
	return `${zeros}${area}-${id}`;
}

function mod(n, m) {
	return ((n % m) + m) % m;
}
