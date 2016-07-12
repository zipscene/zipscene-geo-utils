const { expect } = require('chai');
const reduceVertices = require('../lib/reduce-vertices');

describe('Reduce Vertices', function() {
	it('should reduce polygon to MAX vertices given an error tolerance of 0%', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 9, 9 ],
				[ 10, 10 ],
				[ 11, 9 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = reduceVertices(polygon.coordinates[0], {
			maxError: 0.0,
			minVertices: 3,
			maxVertices: 5
		});
		expect(newPoly).to.eql([ [ 0, 0 ], [ 0, 10 ], [ 9, 9 ], [ 11, 9 ], [ 10, 0 ], [ 0, 0 ] ]);
	});

	it('should reduce polygon to MIN vertices given an error tolerance of 99.9999%', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 9, 9 ],
				[ 10, 10 ],
				[ 11, 9 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = reduceVertices(polygon.coordinates[0], {
			maxError: 0.9999999999999,
			minVertices: 3,
			maxVertices: 5
		});
		expect(newPoly).to.eql([ [ 0, 0 ], [ 0, 10 ], [ 11, 9 ], [ 0, 0 ] ]);
	});

	it('should reduce polygon to MAX vertices given an error tolerance of 0.000001%', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 9, 9 ],
				[ 10, 10 ],
				[ 11, 9 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = reduceVertices(polygon.coordinates[0], {
			maxError: 0.00000001,
			minVertices: 3,
			maxVertices: 5
		});
		expect(newPoly).to.eql([ [ 0, 0 ], [ 0, 10 ], [ 9, 9 ], [ 11, 9 ], [ 10, 0 ], [ 0, 0 ] ]);
	});

	it('should reduce polygon to error threshold and add previously removed point', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0.5, 9 ],
				[ 0, 10 ],
				[ 9, 9 ],
				[ 10, 10 ],
				[ 11, 9 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = reduceVertices(polygon.coordinates[0], {
			maxError: 0.01,
			minVertices: 3,
			maxVertices: 5
		});
		expect(newPoly).to.eql([ [ 0, 0 ], [ 0.5, 9 ], [ 0, 10 ], [ 11, 9 ], [ 10, 0 ], [ 0, 0 ] ]);
	});

	it('should correctly handle min and max discrepancy', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0.5, 9 ],
				[ 0, 10 ],
				[ 9, 9 ],
				[ 10, 10 ],
				[ 11, 9 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = reduceVertices(polygon.coordinates[0], {
			maxError: 0.01,
			minVertices: 5,
			maxVertices: 3
		});
		expect(newPoly).to.eql([ [ 0, 0 ], [ 0, 10 ], [ 11, 9 ], [ 0, 0 ] ]);
	});
});