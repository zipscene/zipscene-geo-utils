const XError = require('xerror');

const reduceVertices = require('../lib/reduce-vertices');

module.exports = function(polygon, errorOptions) {
	let { coordinates, type } = polygon;
	if (type === 'Polygon') {
		simplifyPolygon(coordinates, errorOptions);
	} else if (type === 'MultiPolygon') {
		for (let i = 0; i < coordinates.length; i++) {
			let multiCoordinate = coordinates[i];
			simplifyPolygon(multiCoordinate, errorOptions);
		}
	} else {
		throw new XError(XError.INVALID_ARGUMENT, `Polygon type '${type}' not supported`);
	}
	return polygon;
};

function simplifyPolygon(coordinates, errorOptions) {
	for (let i = 0; i < coordinates.length; i++) {
		let coordinatePoints = coordinates[i];
		let simplifiedVertices = reduceVertices(coordinatePoints, errorOptions);
		coordinates[i] = simplifiedVertices;
	}
}
