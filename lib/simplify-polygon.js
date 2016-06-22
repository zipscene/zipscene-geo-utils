const XError = require('xerror');

const reduceVertices = require('../lib/reduce-vertices');

module.exports = function(errorOptions, polygon) {
	let { coordinates, type } = polygon;
	if (type === 'Polygon') {
		simplifyPolygon(errorOptions, coordinates);
	} else if (type === 'MultiPolygon') {
		for (let i = 0; i < coordinates.length; i++) {
			let multiCoordinate = coordinates[i];
			simplifyPolygon(errorOptions, multiCoordinate);
		}
	} else {
		throw new XError(XError.INVALID_ARGUMENT, `Polygon type '${type}' not supported`);
	}
	return polygon;
};

function simplifyPolygon(errorOptions, coordinates) {
	for (let i = 0; i < coordinates.length; i++) {
		let coordinate = coordinates[i];
		let simplifyedVertices = reduceVertices(errorOptions, coordinate);
		coordinates[i] = simplifyedVertices;
	}
}
