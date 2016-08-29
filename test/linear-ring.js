const { LinearRing, Vertex } = require('../lib');
const sinon = require('sinon');
const XError = require('xerror');

describe('LinearRing', function() {
	describe('constructor', function() {
		let points, ring;

		beforeEach(function() {
			points = [
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ]
			];
			ring = new LinearRing(points);
		});

		it('calculates and stores original area', function() {
			expect(ring.originalArea).to.equal(16);
		});

		it('sets initial vertex count and area changed', function() {
			expect(ring.vertexCount).to.equal(points.length);
			expect(ring.areaChanged).to.equal(0);
		});

		it('maps points to vertices', function() {
			expect(ring.vertices).to.be.an.instanceof(Array);
			expect(ring.vertices).to.have.length(points.length);
			ring.vertices.forEach((vertex, index) => {
				expect(vertex).to.be.an.instanceof(Vertex);
				expect(vertex.point).to.equal(points[index]);
				expect(vertex.index).to.equal(index);
			});
		});

		it('sets prev and next of each vertex', function() {
			expect(ring.vertices[0].next).to.equal(ring.vertices[1]);
			expect(ring.vertices[0].prev).to.equal(ring.vertices[3]);

			expect(ring.vertices[1].next).to.equal(ring.vertices[2]);
			expect(ring.vertices[1].prev).to.equal(ring.vertices[0]);

			expect(ring.vertices[2].next).to.equal(ring.vertices[3]);
			expect(ring.vertices[2].prev).to.equal(ring.vertices[1]);

			expect(ring.vertices[3].next).to.equal(ring.vertices[0]);
			expect(ring.vertices[3].prev).to.equal(ring.vertices[2]);
		});
	});

	describe('#relativeAreaChanged', function() {
		it('returns areaChanged divided by originalArea', function() {
			let ring = new LinearRing([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ]
			]);
			ring.removeVertex(ring.vertices[0]);

			expect(ring.relativeAreaChanged)
				.to.equal(ring.areaChanged / ring.originalArea);
		});
	});

	describe('#removeVertex()', function() {
		let ring, vertex;

		beforeEach(function() {
			ring = new LinearRing([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ]
			]);
			vertex = ring.vertices[0];
		});

		it('replaces provided vertex with null', function() {
			ring.removeVertex(vertex);

			expect(ring.vertices[vertex.index]).to.be.null;
		});

		it('updates adjacent vertices, emitting vertexChanged events', function() {
			let prev = ring.vertices[3];
			let next = ring.vertices[1];
			let handler = sinon.spy((changed) => {
				// The order of updates does not matter, but the event for the
				// first must be emitted *before* the second vertex is changed.

				if (changed === prev) {
					// Ensure prev.next was updated before call.
					expect(prev.next).to.equal(next);

					if (handler.callCount === 1) {
						// Ensure next.prev has not yet been updated.
						expect(next.prev).to.equal(vertex);
					}
				}

				if (changed === next) {
					// Ensure next.prev was updated before call.
					expect(next.prev).to.equal(prev);

					if (handler.callCount === 1) {
						// Ensure prev.next has not yet been updated.
						expect(prev.next).to.equal(vertex);
					}
				}
			});
			ring.on('vertexChanged', handler);

			ring.removeVertex(vertex);

			expect(handler).to.be.calledTwice;
			expect(handler).to.be.calledWith(prev);
			expect(handler).to.be.calledWith(next);
		});

		it('updates vertexCount', function() {
			ring.removeVertex(vertex);

			expect(ring.vertexCount).to.equal(3);
		});

		it('updates areaChanged', function() {
			ring.removeVertex(vertex);

			expect(ring.areaChanged).to.equal(8);
		});
	});

	describe('#restoreVertex()', function() {
		let ring, removedVertices;

		beforeEach(function() {
			ring = new LinearRing([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 2, 2 ],
				[ 4, 4 ],
				[ 4, 0 ]
			]);
			removedVertices = [
				ring.vertices[2],
				ring.vertices[3]
			];
			removedVertices.forEach((vertex) => {
				ring.removeVertex(vertex);
			});
		});

		context('correct restoration order', function() {
			let vertex;

			beforeEach(function() {
				vertex = removedVertices[1];
			});

			it('replaces null with vertex at proper index', function() {
				ring.restoreVertex(vertex);

				expect(ring.vertices[vertex.index]).to.equal(vertex);
			});

			it('reverts adjacent vertices, emitting vertexChanged events', function() {
				let prev = ring.vertices[1];
				let next = ring.vertices[4];
				let handler = sinon.spy((changed) => {
					// The order of updates does not matter, but the event for the
					// first must be emitted *before* the second vertex is changed.

					if (changed === prev) {
						// Ensure prev.next was updated before call.
						expect(prev.next).to.equal(vertex);

						if (handler.callCount === 1) {
							// Ensure next.prev has not yet been updated.
							expect(next.prev).to.equal(prev);
						}
					}

					if (changed === next) {
						// Ensure next.prev was updated before call.
						expect(next.prev).to.equal(vertex);

						if (handler.callCount === 1) {
							// Ensure prev.next has not yet been updated.
							expect(prev.next).to.equal(next);
						}
					}
				});
				ring.on('vertexChanged', handler);

				ring.restoreVertex(vertex);

				expect(handler).to.be.calledTwice;
				expect(handler).to.be.calledWith(prev);
				expect(handler).to.be.calledWith(next);
			});

			it('reverts vertexCount', function() {
				ring.restoreVertex(vertex);

				expect(ring.vertexCount).to.equal(4);
			});

			it('reverts areaChanged', function() {
				ring.restoreVertex(vertex);

				expect(ring.areaChanged).to.equal(4);
			});
		});

		context('incorrect restoration order', function() {
			it('throws XError with appropriate message', function() {
				expect(() => {
					ring.restoreVertex(removedVertices[0]);
				}).to.throw(XError, 'Incorrect restoration order');
			});
		});
	});

	describe('#toArray()', function() {
		let ring;

		beforeEach(function() {
			ring = new LinearRing([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ]
			]);
		});

		it('returns vertices as an array of points', function() {
			expect(ring.toArray()).to.deep.equal([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ]
			]);
		});

		it('filters out removed vertices', function() {
			ring.removeVertex(ring.vertices[0]);
			expect(ring.toArray()).to.deep.equal([
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ]
			]);
		});
	});

	describe('#toLineSegments()', function() {
		let ring;

		beforeEach(function() {
			ring = new LinearRing([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ]
			]);
		});

		it('returns array of start and end points for all line segments', function() {
			expect(ring.toLineSegments()).to.deep.equal([
				[ [ 0, 0 ], [ 0, 4 ] ],
				[ [ 0, 4 ], [ 4, 4 ] ],
				[ [ 4, 4 ], [ 4, 0 ] ],
				[ [ 4, 0 ], [ 0, 0 ] ]
			]);
		});

		it('filters out removed vertices', function() {
			ring.removeVertex(ring.vertices[0]);
			expect(ring.toLineSegments()).to.deep.equal([
				[ [ 0, 4 ], [ 4, 4 ] ],
				[ [ 4, 4 ], [ 4, 0 ] ],
				[ [ 4, 0 ], [ 0, 4 ] ]
			]);
		});
	});

	describe('#hasIntersections()', function() {
		context('ring has no intersections with itself', function() {
			it('returns false', function() {
				let ring = new LinearRing([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				]);

				expect(ring.hasIntersections()).to.be.false;
			});
		});

		context('ring has an intersection with itself', function() {
			it('returns true', function() {
				let ring = new LinearRing([
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 0 ],
					[ 4, 4 ]
				]);

				expect(ring.hasIntersections()).to.be.true;
			});
		});
	});
});
