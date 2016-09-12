const { simplifyPolygon } = require('../lib');

describe('Simplify Polygons', function() {
	it('should reduce polygon object\'s total vertices', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 8.8, 8.9 ],
				[ 9, 9 ],
				[ 9.9, 9.9 ],
				[ 10, 10 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = simplifyPolygon(polygon, {
			maxVertices: 4,
			minVertices: 3
		});
		expect(newPoly.coordinates).to.eql([ [ [ 0, 0 ], [ 0, 10 ], [ 10, 10 ], [ 10, 0 ], [ 0, 0 ] ] ]);
	});

	it('should reduce multi polygon object\'s total vertices', function() {
		let polygon = {
			type: 'MultiPolygon',
			coordinates: [ [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 9, 9 ],
				[ 10, 10 ],
				[ 10, 0 ]
			] ] ]
		};

		let newPoly = simplifyPolygon(polygon, {
			maxVertices: 4,
			minVertices: 3
		});
		expect(newPoly.coordinates).to.eql([ [ [ [ 0, 0 ], [ 0, 10 ], [ 10, 10 ], [ 10, 0 ], [ 0, 0 ] ] ] ]);
	});

	it('should reduce polygon using maxError', function() {
		let polygon = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 10 ],
				[ 4, 10 ],
				[ 5, 11 ],
				[ 5, 12 ],
				[ 10, 10 ],
				[ 10, 0 ]
			] ]
		};

		let newPoly = simplifyPolygon(polygon, {
			maxError: 0.05,
			minVertices: 3
		});
		expect(newPoly.coordinates).to.eql([ [ [ 0, 0 ], [ 0, 10 ], [ 5, 12 ], [ 10, 10 ], [ 10, 0 ], [ 0, 0 ] ] ]);
	});

	it('should simplify msa polygon to minVertices', function() {
		let testPoly = {
			type: 'Polygon',
			coordinates: [ [
				[ -90.312404, 43.640988 ],
				[ -89.785809, 43.641049 ],
				[ -89.732238, 43.571826 ],
				[ -89.599357, 43.558041 ],
				[ -89.600719, 43.380006 ],
				[ -89.677613, 43.361197 ],
				[ -89.720463, 43.293084 ],
				[ -89.716761, 43.27399 ],
				[ -89.838135, 43.206057 ],
				[ -90.000123, 43.194624 ],
				[ -90.05866, 43.145291 ],
				[ -90.193814, 43.164464 ],
				[ -90.191938, 43.380083 ],
				[ -90.191964, 43.554996 ],
				[ -90.311069, 43.553991 ],
				[ -90.312404, 43.640988 ]
			] ]
		};

		let newPoly = simplifyPolygon(testPoly, {
			minVertices: 4,
			maxError: 0.9999 // force min vertices
		});
		expect(newPoly.coordinates).to.eql([ [
			[ -89.785809, 43.641049 ],
			[ -89.600719, 43.380006 ],
			[ -90.193814, 43.164464 ],
			[ -90.191964, 43.554996 ],
			[ -89.785809, 43.641049 ] ] ]);
	});

	it('should simplify msa polygon to maxError', function() {
		let testPoly = {
			type: 'Polygon',
			coordinates: [ [
				[ -90.312404, 43.640988 ],
				[ -89.785809, 43.641049 ],
				[ -89.732238, 43.571826 ],
				[ -89.599357, 43.558041 ],
				[ -89.600719, 43.380006 ],
				[ -89.677613, 43.361197 ],
				[ -89.720463, 43.293084 ],
				[ -89.716761, 43.27399 ],
				[ -89.838135, 43.206057 ],
				[ -90.000123, 43.194624 ],
				[ -90.05866, 43.145291 ],
				[ -90.193814, 43.164464 ],
				[ -90.191938, 43.380083 ],
				[ -90.191964, 43.554996 ],
				[ -90.311069, 43.553991 ],
				[ -90.312404, 43.640988 ]
			] ]
		};

		let newPoly = simplifyPolygon(testPoly, {
			maxVertices: 12,
			minVertices: 5,
			maxError: 0.05 // force max error break condition
		});

		expect(newPoly.coordinates).to.eql([ [
			[ -90.312404, 43.640988 ],
			[ -89.785809, 43.641049 ],
			[ -89.732238, 43.571826 ],
			[ -89.599357, 43.558041 ],
			[ -89.600719, 43.380006 ],
			[ -89.838135, 43.206057 ],
			[ -90.05866, 43.145291 ],
			[ -90.193814, 43.164464 ],
			[ -90.191964, 43.554996 ],
			[ -90.311069, 43.553991 ],
			[ -90.312404, 43.640988 ] ] ]);
	});

	it('should support option to fix intersections', function() {
		let testPoly = {
			type: 'Polygon',
			coordinates: [ [
				[ 0, 0 ],
				[ 0, 7 ],
				[ 3, 6 ],
				[ 4, 8 ],
				[ 5, 6 ],
				[ 8, 6 ],
				[ 8, 0 ],
				[ 4, 7 ]
			] ]
		};

		let newPoly = simplifyPolygon(testPoly, {
			minVertices: 3,
			maxVertices: 6,
			fixIntersections: true
		});

		expect(newPoly.coordinates).to.deep.equal([ [
			[ 0, 0 ],
			[ 0, 7 ],
			[ 4, 8 ],
			[ 8, 6 ],
			[ 8, 0 ],
			[ 4, 7 ],
			[ 0, 0 ]
		] ]);
	});
});
