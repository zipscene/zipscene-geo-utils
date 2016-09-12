const Geometry = require('./geometry');
const Polygon = require('./polygon');

/**
 * Class for representing a GeoJson MultiPolygon.
 *
 * @class MultiPolygon
 * @constructor
 * @extends Geometry
 * @param {Array[]} coordinates - Nested arrays of coordinates.
 */
class MultiPolygon extends Geometry {
	constructor(coordinates) {
		super();

		this.polygons = coordinates.map((c) => new Polygon(c));

		let propagateVertexChanged = (vertex) => {
			this.emit('vertexChanged', vertex);
		};

		for (let polygon of this.polygons) {
			polygon.on('vertexChanged', propagateVertexChanged);
		}
	}

	listVertices() {
		return this.polygons.reduce((p, v) => p.concat(v.listVertices()), []);
	}

	calculateArea() {
		return this.polygons.reduce((p, v) => p + v.calculateArea(), 0);
	}

	toLineSegments() {
		return this.polygons.reduce((p, v) => p.concat(v.toLineSegments()), []);
	}

	toGeoJson() {
		return this.polygons
			.map((p) => p.toGeoJson())
			.filter((p) => p.length > 0);
	}
}

module.exports = MultiPolygon;
