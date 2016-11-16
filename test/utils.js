// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { utils } = require('../lib');

describe('utils', function() {
	describe('.intersects()', function() {
		context('line segments do not intersect', function() {
			it('returns false', function() {
				let a = [ [ 0, 0 ], [ 4, 0 ] ];
				let b = [ [ 0, 4 ], [ 4, 4 ] ];

				expect(utils.intersects(a, b)).to.be.false;
				expect(utils.intersects(b, a)).to.be.false;
			});
		});

		context('line segments intersect at first endpoints', function() {
			it('returns false', function() {
				let a = [ [ 0, 0 ], [ 4, 0 ] ];
				let b = [ [ 0, 0 ], [ 4, 4 ] ];

				expect(utils.intersects(a, b)).to.be.false;
				expect(utils.intersects(b, a)).to.be.false;
			});
		});

		context('line segments intersect at last endpoints', function() {
			it('returns false', function() {
				let a = [ [ 0, 0 ], [ 4, 4 ] ];
				let b = [ [ 0, 4 ], [ 4, 4 ] ];

				expect(utils.intersects(a, b)).to.be.false;
				expect(utils.intersects(b, a)).to.be.false;
			});
		});

		context('line segments intersect at inverse endpoints', function() {
			it('returns false', function() {
				let a = [ [ 0, 0 ], [ 4, 0 ] ];
				let b = [ [ 4, 0 ], [ 4, 4 ] ];

				expect(utils.intersects(a, b)).to.be.false;
				expect(utils.intersects(b, a)).to.be.false;
			});
		});

		context('line segments intersect at non-endpoint', function() {
			it('returns true', function() {
				let a = [ [ 0, 0 ], [ 4, 4 ] ];
				let b = [ [ 0, 4 ], [ 4, 0 ] ];

				expect(utils.intersects(a, b)).to.be.true;
				expect(utils.intersects(b, a)).to.be.true;
			});
		});
	});

	describe('.linkEndpoints()', function() {
		context('first and last points are not the same point', function() {
			it('returns clone of array with first point copied to end', function() {
				let points = [
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				];

				let result = utils.linkEndpoints(points);

				expect(result).to.deep.equal([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ],
					[ 0, 0 ]
				]);
				expect(points).to.deep.equal([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				]);
			});
		});

		context('first and last points are already the same point', function() {
			it('returns unchanged array', function() {
				let points = [
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ],
					[ 0, 0 ]
				];

				let result = utils.linkEndpoints(points);

				expect(result).to.equal(points);
				expect(points).to.deep.equal([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ],
					[ 0, 0 ]
				]);
			});
		});

		context('array is empty', function() {
			it('returns unchanged array', function() {
				let points = [];

				let result = utils.linkEndpoints(points);

				expect(result).to.equal(points);
				expect(points).to.deep.equal([]);
			});
		});
	});

	describe('.unlinkEndpoints()', function() {
		context('first and last points are the same point', function() {
			it('returns clone of array with last point removed', function() {
				let points = [
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ],
					[ 0, 0 ]
				];

				let result = utils.unlinkEndpoints(points);

				expect(result).to.deep.equal([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				]);
				expect(points).to.deep.equal([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ],
					[ 0, 0 ]
				]);
			});
		});

		context('first and last points are not the same point', function() {
			it('returns unchanged array', function() {
				let points = [
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				];

				let result = utils.unlinkEndpoints(points);

				expect(result).to.equal(points);
				expect(points).to.deep.equal([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				]);
			});
		});

		context('array is empty', function() {
			it('returns unchanged array', function() {
				let points = [];

				let result = utils.unlinkEndpoints(points);

				expect(result).to.equal(points);
				expect(points).to.deep.equal([]);
			});
		});
	});
});
