const LinearRing = require('./linear-ring');
const Heap = require('heap');
const XError = require('xerror');

class RingSimplifier extends LinearRing {
	constructor(points) {
		super(points);

		this.areaHeap = new Heap((a, b) => a.getArea() - b.getArea());
		for (let vertex of this.vertices) {
			this.areaHeap.push(vertex);
		}

		this.on('vertexChanged', (vertex) => {
			if (!vertex.skipped) this.areaHeap.updateItem(vertex);
		});

		this.removedVertices = [];
	}

	simplify() {
		if (this.vertexCount <= 3) {
			throw new XError(XError.INVALID_ARGUMENT, 'Cannot simplify below three vertices.');
		}

		let vertex = this.areaHeap.pop();
		this.removeVertex(vertex);
		this.removedVertices.push(vertex);
	}

	unsimplify() {
		if (this.removedVertices.length === 0) {
			throw new XError(XError.INVALID_ARGUMENT, 'Removed vertex history is empty.');
		}

		let vertex = this.removedVertices.pop();
		this.restoreVertex(vertex);
		this.areaHeap.push(vertex);
	}

	skip() {
		let vertex = this.areaHeap.pop();
		vertex.skipped = true;
	}

	clearHistory() {
		this.removedVertices = [];
	}
}

module.exports = RingSimplifier;
