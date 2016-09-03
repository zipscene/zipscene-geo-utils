const Geometry = require('./geometry');
const LinearRing = require('./linear-ring');

/**
 * Class for representing a GeoJson Polygon.
 *
 * @class MultiPolygon
 * @constructor
 * @extends Geometry
 * @param {Array[]} coordinates - Nested arrays of coordinates.
 */
class Polygon extends Geometry {
	constructor(coordinates) {
		super();

		// Map coordinates to an array of linear rings.
		this.rings = coordinates.map((c) => new LinearRing(c));

		// Propagate vertexChanged events from each ring.
		for (let ring of this.rings) {
			ring.on('vertexChanged', (vertex) => {
				this.emit('vertexChanged', vertex);
			});
		}
	}

	listVertices() {
		return this.rings.reduce((p, r) => p.concat(r.listVertices()), []);
	}

	calculateArea() {
		let outerArea = this.rings[0].calculateArea();
		let innerArea = this.rings.slice(1)
			.reduce((p, v) => p + v.calculateArea(), 0);

		return outerArea - innerArea;
	}

	toLineSegments() {
		return this.rings.reduce((p, v) => p.concat(v.toLineSegments()), []);
	}

	toGeoJson() {
		return this.rings
			.map((r) => r.toGeoJson())
			.filter((r) => r.length > 0);
	}
}

module.exports = Polygon;
