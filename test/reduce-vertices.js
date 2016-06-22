const { expect } = require('chai');
const reduceVertices = require('../lib/reduce-vertices');

describe('Reduce Vertices', function() {
	it('should reduce polygon object\'s total vertices', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 9, 9 ],
				[ 10, 10 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = reduceVertices(polygon.coordinates[0], {
			maxVertices: 4
		});
		expect(newPoly).to.eql([ [ 0, 0 ], [ 0, 10 ], [ 10, 10 ], [ 10, 0 ] ]);
	});

	it('should handle equal areas', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 10, 10 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = reduceVertices(polygon.coordinates[0], {
			maxVertices: 3
		});
		expect(newPoly).to.eql([ [ 0, 10 ], [ 10, 10 ], [ 10, 0 ] ]);
	});
});
