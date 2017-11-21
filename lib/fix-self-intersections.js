const XError = require('xerror');
const jsts = require('jsts');

// This fixes intersections between outer polygons and holes, rather than fixing individual
// linear rings.
function fixSelfIntersections(geoJson) {
	let { coordinates, type } = geoJson;
	let geoReader = new jsts.io.GeoJSONReader();
	let geoWriter = new jsts.io.GeoJSONWriter();
	let madeChange = false;
	// Transform the geoJson into an object form easy to recurse over
	let polygons = [];
	function addPolygon(polygon) {
		let obj = {
			outerRing: geoReader.read({ type: 'Polygon', coordinates: [ polygon[0] ] }),
			holes: polygon.slice(1).map((ring) => {
				return geoReader.read({ type: 'Polygon', coordinates: [ ring ] });
			})
		};
		polygons.push(obj);
	}

	if (type === 'MultiPolygon') {
		for (let polygon of coordinates) {
			addPolygon(polygon);
		}
	} else if (type === 'Polygon') {
		addPolygon(coordinates);
	} else {
		throw new XError(XError.INVALID_ARGUMENT, `type '${type}' not supported`);
	}

	// First fix intersections between outer polygons.
	while (true) {
		let foundIntersection = false;
		for (let x = 0; x < polygons.length; x++) {
			for (let y = x + 1; y < polygons.length; y++) {
				let poly1 = polygons[x], poly2 = polygons[y];
				if (poly1.outerRing.intersects(poly2.outerRing)) {
					// Create a new ring consisting of the union of both old ones
					poly1.outerRing = poly1.outerRing.union(poly2.outerRing);
					// New polygon inherits the holes of both progenitors
					poly1.holes = poly1.holes.concat(poly2.holes);
					polygons = polygons.slice(0, y).concat(polygons.slice(y + 1));
					foundIntersection = true;
					madeChange = true;
					break;
				}
			}
			if (foundIntersection) break;
		}
		if (!foundIntersection) break;
	}

	// Find intersections between the holes of the linear polygon.
	while (true) {
		let foundIntersection = false;
		for (let polygon of polygons) {
			for (let x = 0; x < polygon.holes.length; x++) {
				for (let y = x + 1; y < polygon.holes.length; y++) {
					let hole1 = polygon.holes[x], hole2 = polygon.holes[y];
					if (hole1.intersects(hole2)) {
						// Create a new ring consisting of the union of both old ones
						let newHole = hole1.union(hole2);
						polygon.holes[x] = newHole;
						polygon.holes = polygon.holes.slice(0, y).concat(polygon.holes.slice(y + 1));
						foundIntersection = true;
						madeChange = true;
						break;
					}
				}
				if (foundIntersection) break;
			}
			if (foundIntersection) break;
		}
		if (!foundIntersection) break;
	}

	// Find intersections of holes with outer polygons, or holes outside their parent polygons
	while (true) {
		let foundIntersection = false;
		for (let polygon of polygons) {
			for (let x = 0; x < polygon.holes.length; x++) {
				let hole = polygon.holes[x];
				if (!polygon.outerRing.intersects(hole)) {
					// Hole is outside polygon and can be discarded
					polygon.holes = polygon.holes.slice(0, x).concat(polygon.holes.slice(x + 1));
					foundIntersection = true;
					madeChange = true;
					break;
				}
				if (!polygon.outerRing.contains(hole)) {
					// Hole crosses boundary of outer ring. Modify outer ring and discard hole
					polygon.outerRing = polygon.outerRing.difference(hole);
					polygon.holes = polygon.holes.slice(0, x).concat(polygon.holes.slice(x + 1));
					foundIntersection = true;
					madeChange = true;
					break;
				}
			}
			if (foundIntersection) break;
		}
		if (!foundIntersection) break;
	}

	if (!madeChange) return geoJson;
	// Write the result out as GeoJSON
	let outputCoordinates = polygons.map((polyObj) => {
		let outputArr = [ geoWriter.write(polyObj.outerRing).coordinates[0] ];
		for (let hole of polyObj.holes) {
			outputArr.push(geoWriter.write(hole).coordinates[0]);
		}
		return outputArr;
	});
	if (outputCoordinates.length === 1) {
		return { type: 'Polygon', coordinates: outputCoordinates[0] };
	} else {
		return { type: 'MultiPolygon', coordinates: outputCoordinates };
	}

}

module.exports = fixSelfIntersections;
