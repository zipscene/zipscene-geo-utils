const BSTree = require('binary-search-tree').BinarySearchTree;
const calcArea = require('area-polygon');
const XError = require('xerror');

module.exports = function({ maxVertices, maxError }, vertices) {
	if (!maxVertices && !maxError) {
		throw new XError(XError.INVALID_ARGUMENT, 'A simplification condition must be given');
	}
	if (maxVertices && maxVertices < 3) throw new XError(XError.INVALID_ARGUMENT, 'Max vertices must be at least 3');
	if (maxError > 1 || maxError < 0) throw new XError(XError.INVALID_ARGUMENT, 'Max error must be between 1 and 0');

	// save original polygon's area to caclulate error
	let startingArea = calcArea(vertices);
	// initialize the AVL tree to hold our areas
	let areaBSTree = new BSTree({
		unique: true,
		compareKeys: (a, b) => {
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		}
	});
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
		let area = calcTriangleArea(vertex, leftNeighbor, rightNeighbor);
		neighborIdMap[i] = {
			id: i,
			point: vertex,
			area,
			next: {},
			prev: {}
		};
	}
	// insert each vertex into the BST tree and populate all next and prev references
	// NOTE: randomization of the keys is to avoid having a very imbalanced BST tree
	let vertexIds = shuffle(Object.keys(neighborIdMap));
	for (let vertexId of vertexIds) {
		let rightNeighborIdx = mod(parseInt(vertexId) + 1, vertexIds.length);
		let leftNeighborIdx = mod(parseInt(vertexId) - 1, vertexIds.length);

		let vertex = neighborIdMap[vertexId];
		vertex.next = neighborIdMap[rightNeighborIdx];
		vertex.prev = neighborIdMap[leftNeighborIdx];

		let areaId = createAreaId(vertex.area, vertex.id);
		areaBSTree.insert(areaId, vertex.id);
	}
	let totalAreaChanged = 0;
	// remove all vertices that form smallest area triangles
	while (
		(maxVertices && areaBSTree.getNumberOfKeys() > maxVertices) ||
		(maxError && maxError > (totalAreaChanged / startingArea) )
	) {
		// first we remove the vertex with the smallest area
		let minArea = areaBSTree.getMinKey();
		let vertexId = areaBSTree.search(minArea)[0];
		let vertex = neighborIdMap[vertexId];
		totalAreaChanged += vertex.area;
		areaBSTree.delete(minArea);

		// next we need to recalculate removed vertex's neighbors
		let next = vertex.next;
		let prev = vertex.prev;
		vertex.prev.next = next;
		vertex.next.prev = prev;

		// delete the removed vertex from the neighbor map
		delete neighborIdMap[vertexId];

		// remove the old areas from the BSTree
		let nextAreaId = createAreaId(next.area, next.id);
		let prevAreaId = createAreaId(prev.area, prev.id);
		areaBSTree.delete(nextAreaId);
		areaBSTree.delete(prevAreaId);

		// recalculate the areas of the neighbor vertecies
		next.area = calcTriangleArea(next.point, next.next.point, next.prev.point);
		prev.area = calcTriangleArea(prev.point, prev.next.point, prev.prev.point);

		// insert the newly caclulated vertices
		areaBSTree.insert(createAreaId(next.area, next.id), next.id);
		areaBSTree.insert(createAreaId(prev.area, prev.id), prev.id);
	}
	// get coordinates of the remaining vertices
	let simplifiedPolygon = [];
	for (let vertexId of Object.keys(neighborIdMap)) {
		simplifiedPolygon.push(vertices[vertexId]);
	}
	return simplifiedPolygon;
};

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

function calcTriangleArea(A, B, C) {
	let numerator = A[0] * ( B[1] - C[1] ) + B[0] * ( C[1] - A[1] ) + C[0] * ( A[1] - B[1] );
	return Math.abs(numerator / 2);
}

function mod(n, m) {
	return ((n % m) + m) % m;
}

function shuffle(array) {
	let currentIndex = array.length, temporaryValue, randomIndex;
	// While there remain elements to shuffle...
	while (currentIndex !== 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}
