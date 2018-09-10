// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { fixSelfIntersections } = require('../lib');
const jsts = require('jsts');

function checkSimplified(input, output) {
	let geoReader = new jsts.io.GeoJSONReader();
	let actualOutput = fixSelfIntersections(input);
	expect(geoReader.read(actualOutput).equalsTopo(geoReader.read(output))).to.be.true;
}

describe('Fix Self Intersections', function() {

	it('should combine outer rings when appropriate', function() {
		let bigPoly = [ [ [ 0, 0 ], [ 0, 10 ], [ 10, 10 ], [ 10, 0 ], [ 0, 0 ] ] ];
		let centerPoly = [ [ [ 5, 5 ], [ 5, 6 ], [ 6, 6 ], [ 6, 5 ], [ 5, 5 ] ] ];
		let cornerPoly = [ [ [ 8, 8 ], [ 8, 12 ], [ 12, 12 ], [ 12, 8 ], [ 8, 8 ] ] ];

		checkSimplified(
			{ type: 'MultiPolygon', coordinates: [ centerPoly, bigPoly ] },
			{ type: 'Polygon', coordinates: bigPoly }
		);

		checkSimplified(
			{ type: 'MultiPolygon', coordinates: [ bigPoly, centerPoly ] },
			{ type: 'Polygon', coordinates: bigPoly }
		);

		checkSimplified(
			{ type: 'MultiPolygon', coordinates: [ cornerPoly, centerPoly ] },
			{ type: 'MultiPolygon', coordinates: [ cornerPoly, centerPoly ] }
		);

		checkSimplified(
			{ type: 'MultiPolygon', coordinates: [ cornerPoly, bigPoly ] },
			{
				type: 'Polygon',
				coordinates: [ [
					[ 0, 0 ],
					[ 10, 0 ],
					[ 10, 8 ],
					[ 12, 8 ],
					[ 12, 12 ],
					[ 8, 12 ],
					[ 8, 10 ],
					[ 0, 10 ],
					[ 0, 0 ]
				] ]
			}
		);

	});

	it('should combine inner holes when appropriate', function() {
		let bigLeft = [ [ 0, 0 ], [ 0, 5 ], [ 5, 5 ], [ 5, 0 ], [ 0, 0 ] ];
		let holeLeft1 = [ [ 1, 1 ], [ 1, 3 ], [ 3, 3 ], [ 3, 1 ], [ 1, 1 ] ];
		let holeLeft2 = [ [ 2, 1 ], [ 2, 3 ], [ 4, 3 ], [ 4, 1 ], [ 2, 1 ] ];
		let fullHoleLeft = [ [ 1, 1 ], [ 1, 3 ], [ 4, 3 ], [ 4, 1 ], [ 1, 1 ] ];
		let smallHole = [ [ 1.5, 1.5 ], [ 1.5, 1.6 ], [ 1.6, 1.6 ], [ 1.5, 1.5 ] ];
		let bigRight = [ [ 3, 0 ], [ 3, 5 ], [ 8, 5 ], [ 8, 0 ], [ 3, 0 ] ];
		let holeRight = [ [ 6, 2 ], [ 6, 3 ], [ 7, 3 ], [ 7, 2 ], [ 6, 2 ] ];
		let bigRect = [ [ 0, 0 ], [ 0, 5 ], [ 8, 5 ], [ 8, 0 ], [ 0, 0 ] ];

		checkSimplified(
			{ type: 'Polygon', coordinates: [ bigLeft, holeLeft1, holeLeft2 ] },
			{ type: 'Polygon', coordinates: [ bigLeft, fullHoleLeft ] }
		);

		checkSimplified(
			{ type: 'Polygon', coordinates: [ bigLeft, smallHole, holeLeft2, holeLeft1 ] },
			{ type: 'Polygon', coordinates: [ bigLeft, fullHoleLeft ] }
		);

		checkSimplified(
			{ type: 'MultiPolygon', coordinates: [ [ bigLeft, holeLeft1, holeLeft2 ], [ bigRight, holeRight ] ] },
			{ type: 'Polygon', coordinates: [ bigRect, fullHoleLeft, holeRight ] }
		);
	});

	it('should merge holes with intersecting outer rings when appropriate', function() {
		checkSimplified({
			type: 'Polygon',
			coordinates: [
				[ [ 0, 0 ], [ 0, 10 ], [ 10, 0 ], [ 0, 0 ] ],
				[ [ 1, 1 ], [ 1, 2 ], [ 2, 1 ], [ 1, 1 ] ],
				[ [ 20, 20 ], [ 20, 25 ], [ 25, 20 ], [ 20, 20 ] ],
				[ [ 0, 9 ], [ 0, 10 ], [ 1, 10 ], [ 1, 9 ], [ 0, 9 ] ]
			]
		}, {
			type: 'Polygon',
			coordinates: [
				[ [ 0, 0 ], [ 0, 9 ], [ 1, 9 ], [ 10, 0 ], [ 0, 0 ] ],
				[ [ 1, 1 ], [ 1, 2 ], [ 2, 1 ], [ 1, 1 ] ]
			]
		});
	});

});
