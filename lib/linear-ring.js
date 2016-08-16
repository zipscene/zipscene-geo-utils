const calcArea = require('area-polygon');
const Vertex = require('./vertex');
const XError = require('xerror');
const EventEmitter = require('events');

class LinearRing extends EventEmitter {
	constructor(points) {
		super();

		this.originalArea = calcArea(points);
		this.vertexCount = points.length;
		this.areaChanged = 0;

		this.vertices = points.map((point, index) => new Vertex(point, index));
		this.vertices.forEach((vertex, index) => {
			vertex.next = this.vertices[mod(index + 1, this.vertices.length)];
			vertex.prev = this.vertices[mod(index - 1, this.vertices.length)];
		});
	}

	get relativeAreaChanged() {
		return this.areaChanged / this.originalArea;
	}

	removeVertex(vertex) {
		let { prev, next } = vertex;

		this.vertices[vertex.index] = null;
		this.vertexCount -= 1;
		this.areaChanged += vertex.getArea();

		prev.next = next;
		next.prev = prev;

		this.emit('vertexChanged', next);
		this.emit('vertexChanged', prev);
	}

	restoreVertex(vertex) {
		let { prev, next } = vertex;

		if (prev.next !== next || next.prev !== prev) {
			throw new XError(XError.INVALID_ARGUMENT, 'Incorrect restoration order');
		}

		this.vertices[vertex.index] = vertex;
		this.vertexCount += 1;
		this.areaChanged -= vertex.getArea();

		prev.next = vertex;
		next.prev = vertex;

		this.emit('vertexChanged', prev);
		this.emit('vertexChanged', next);
	}

	toArray() {
		return this.vertices
			.filter((vertex) => !!vertex)
			.map((vertex) => vertex.point);
	}
}

function mod(n, m) {
	return ((n % m) + m) % m;
}

module.exports = LinearRing;
