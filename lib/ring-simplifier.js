const LinearRing = require('./linear-ring');
const utils = require('./utils');
const Heap = require('heap');
const XError = require('xerror');

/**
 * Class for representing a ring of line segments, with simplification methods.
 *
 * @class RingSimplifier
 * @constructor
 * @extends LinearRing
 * @param {Array[]} points - Array of ordered vertex coordinates.
 */
class RingSimplifier extends LinearRing {
	constructor(points) {
		super(points);

		// Track vertices with a least-area heap.
		this.areaHeap = new Heap((a, b) => a.getArea() - b.getArea());
		for (let vertex of this.vertices) {
			this.areaHeap.push(vertex);
		}

		// Ensure that heap positions are kept up to date following changes
		// to ring vertices.
		this.on('vertexChanged', (vertex) => {
			if (!vertex.skipped) this.areaHeap.updateItem(vertex);
		});

		// Store removed vertex history in an array.
		this.removedVertices = [];
	}

	/**
	 * Removes the vertex with the smallest area from the ring. Removed vertex
	 * history is tracked, and can be undone using the undo method.
	 *
	 * @method simplify
	 */
	simplify() {
		if (this.vertexCount <= 3) {
			throw new XError(XError.INVALID_ARGUMENT, 'Cannot simplify below three vertices.');
		}

		// Pop the smallest-area vertex from the area heap.
		let vertex = this.areaHeap.pop();

		// Remove smallest-area vertex from the ring.
		this.removeVertex(vertex);

		// Push removed vertex onto history.
		this.removedVertices.push(vertex);
	}

	/**
	 * Undoes the most recent simplification.
	 *
	 * @method undo
	 */
	undo() {
		if (this.removedVertices.length === 0) {
			throw new XError(XError.INVALID_ARGUMENT, 'Removed vertex history is empty.');
		}

		// Pop most recently-removed vertex from history.
		let vertex = this.removedVertices.pop();

		// Return most recently-removed vertex to the ring.
		this.restoreVertex(vertex);

		// Return restored vertex to the area heap.
		this.areaHeap.push(vertex);
	}

	/**
	 * Skips over the smallest-area vertex, and marks it so that it will never
	 * be removed in the future.
	 *
	 * @method skip
	 */
	skip() {
		// Pop the smallest-area vertex from the area heap.
		let vertex = this.areaHeap.pop();

		// Mark vertex as skipped.
		vertex.skipped = true;
	}

	/**
	 * Clears the history of removed vertices.
	 *
	 * @method clearHistory
	 */
	clearHistory() {
		this.removedVertices = [];
	}

	willIntersect() {
		let { prev, next } = this.areaHeap.peek();
		let newSegment = [ prev.point, next.point ];

		for (let existingSegment of this.toLineSegments()) {
			if (utils.intersects(newSegment, existingSegment)) return true;
		}

		return false;
	}

	rewind() {
		let minVertexCount = this.vertexCount;
		let bisectSearch = () => {
			if (this.hasIntersections()) {
				minVertexCount = this.vertexCount;
				let targetHistoryLength = Math.floor(this.removedVertices.length / 2);
				while (this.removedVertices.length > targetHistoryLength) {
					this.undo();
				}

				bisectSearch();
			} else if (!this.willIntersect()) {
				this.clearHistory();
				let forwardRange = this.vertexCount - minVertexCount;
				if (forwardRange === 0) {
					throw new XError(XError.INVALID_ARGUMENT, 'No self-intersections found.');
				}

				let targetHistoryLength = Math.ceil(forwardRange / 2);
				while (this.removedVertices.length < targetHistoryLength) {
					this.simplify();
				}

				bisectSearch();
			}
		};

		bisectSearch();
		this.clearHistory();
	}
}

module.exports = RingSimplifier;
