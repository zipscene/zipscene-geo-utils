const { PolygonSimplifier, LinearRing } = require('../lib');
const sinon = require('sinon');
const Heap = require('heap');
const XError = require('xerror');

describe('PolygonSimplifier', function() {
	let sandbox;

	beforeEach(function() {
		sandbox = sinon.sandbox.create();
	});

	afterEach(function() {
		sandbox.restore();
	});

	describe('constructor', function() {
		let points, simplifier;

		beforeEach(function() {
			points = [
				[
					[ 0, 0 ],  // Area: 8
					[ 0, 4 ],  // Area: 20
					[ 10, 6 ], // Area: 24
					[ 4, 0 ],  // Area: 12
					[ 0, 0 ]   // endpoint
				],
				[
					[ 1, 1 ], // Area: 4.5
					[ 1, 4 ], // Area: 9
					[ 7, 5 ], // Area: 10.5
					[ 4, 1 ], // Area: 6
					[ 1, 1 ]  // endpoint
				]
			];
			simplifier = new PolygonSimplifier(points);
		});

		it('creates a LinearRing for each set of points', function() {
			expect(simplifier.rings).to.be.an.instanceof(Array);
			expect(simplifier.rings).to.have.length(points.length);
			expect(simplifier.rings[0]).to.be.an.instanceof(LinearRing);
			expect(simplifier.rings[1]).to.be.an.instanceof(LinearRing);
			expect(simplifier.rings[0].toGeoJson()).to.deep.equal(points[0]);
			expect(simplifier.rings[1].toGeoJson()).to.deep.equal(points[1]);
		});

		it('pushes vertices onto an area-based heap, ascending', function() {
			expect(simplifier.heap).to.be.an.instanceof(Heap);

			let vertices = [];
			while (!simplifier.heap.empty()) {
				vertices.push(simplifier.heap.pop());
			}

			expect(vertices).to.deep.equal([
				simplifier.rings[1].vertices[0],
				simplifier.rings[1].vertices[3],
				simplifier.rings[0].vertices[0],
				simplifier.rings[1].vertices[1],
				simplifier.rings[1].vertices[2],
				simplifier.rings[0].vertices[3],
				simplifier.rings[0].vertices[1],
				simplifier.rings[0].vertices[2]
			]);
		});

		it('sets up event handlers to keep vertex heap positions up to date', function() {
			let firstRingVertex = simplifier.rings[0].vertices[1];
			let secondRingVertex = simplifier.rings[1].vertices[2];
			let updateItem = sandbox.spy(simplifier.heap, 'updateItem');

			simplifier.rings[0].emit('vertexChanged', firstRingVertex);
			simplifier.rings[1].emit('vertexChanged', secondRingVertex);

			expect(updateItem).to.be.calledTwice;
			expect(updateItem).to.always.be.calledOn(simplifier.heap);
			expect(updateItem).to.be.calledWith(firstRingVertex);
			expect(updateItem).to.be.calledWith(secondRingVertex);
		});

		it('does not attempt to update skipped vertices', function() {
			let updateItem = sandbox.spy(simplifier.heap, 'updateItem');
			let skippedVertex = simplifier.heap.peek();
			simplifier.skip();

			skippedVertex.ring.emit('vertexChanged', skippedVertex);

			expect(updateItem).to.not.be.called;
		});

		it('creates array for storing simplification history', function() {
			expect(simplifier.history).to.deep.equal([]);
		});

		it('sets initial area changed to zero', function() {
			expect(simplifier.areaChanged).to.equal(0);
		});

		it('calculates and stores original area', function() {
			expect(simplifier.originalArea).to.equal(17);
		});
	});

	describe('#vertexCount', function() {
		it('returns sum of ring vertex counts', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],
					[ 0, 4 ],
					[ 10, 6 ],
					[ 4, 0 ]
				],
				[
					[ 1, 4 ],
					[ 7, 5 ],
					[ 4, 1 ]
				]
			]);

			expect(simplifier.vertexCount).to.equal(7);
		});
	});

	describe('#relativeAreaChanged', function() {
		it('returns area divided by original area', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],  // Area: 8
					[ 0, 4 ],  // Area: 20
					[ 10, 6 ], // Area: 24
					[ 4, 0 ]   // Area: 12
				],
				[
					[ 1, 1 ], // Area: 4.5
					[ 1, 4 ], // Area: 9
					[ 7, 5 ], // Area: 10.5
					[ 4, 1 ]  // Area: 6
				]
			]);
			simplifier.simplify();

			expect(simplifier.relativeAreaChanged)
				.to.equal(simplifier.areaChanged / simplifier.originalArea);
		});
	});

	describe('#simplify()', function() {
		let simplifier, heap, history, vertex;

		beforeEach(function() {
			simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],  // Area: 8
					[ 0, 4 ],  // Area: 20
					[ 10, 6 ], // Area: 24
					[ 4, 0 ]   // Area: 12
				],
				[
					[ 1, 1 ], // Area: 4.5
					[ 1, 4 ], // Area: 9
					[ 7, 5 ], // Area: 10.5
					[ 4, 1 ]  // Area: 6
				]
			]);

			({ heap, history } = simplifier);
			vertex = heap.peek();

			sandbox.spy(heap, 'pop');
			sandbox.spy(vertex.ring, 'removeVertex');
			sandbox.spy(history, 'push');

			simplifier.simplify();
		});

		it('pops vertex from the area heap', function() {
			expect(heap.pop).to.be.calledOnce;
			expect(heap.pop).to.be.calledOn(heap);
		});

		it('removes vertex from its ring', function() {
			expect(vertex.ring.removeVertex).to.be.calledOnce;
			expect(vertex.ring.removeVertex).to.be.calledOn(vertex.ring);
			expect(vertex.ring.removeVertex).to.be.calledWith(vertex);
		});

		it('pushes vertex onto simplification history', function() {
			expect(history.push).to.be.calledOnce;
			expect(history.push).to.be.calledOn(history);
			expect(history.push).to.be.calledWith(vertex);
		});

		it('adds area of removed vertex to area changed', function() {
			expect(simplifier.areaChanged).to.equal(vertex.getArea());
		});

		context('no remaining vertices', function() {
			it('throws XError with appropriate message', function() {
				let simplifier = new PolygonSimplifier([ [], [] ]);

				expect(() => {
					simplifier.simplify();
				}).to.throw(XError, 'No remaining vertices.');
			});
		});
	});

	describe('#undo()', function() {
		let simplifier, heap, history, vertex;

		beforeEach(function() {
			simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],  // Area: 8
					[ 0, 4 ],  // Area: 20
					[ 10, 6 ], // Area: 24
					[ 4, 0 ]   // Area: 12
				],
				[
					[ 1, 1 ], // Area: 4.5
					[ 1, 4 ], // Area: 9
					[ 7, 5 ], // Area: 10.5
					[ 4, 1 ]  // Area: 6
				]
			]);
			simplifier.simplify();

			({ heap, history } = simplifier);
			vertex = history[history.length - 1];

			sandbox.spy(history, 'pop');
			sandbox.spy(vertex.ring, 'restoreVertex');
			sandbox.spy(heap, 'push');

			simplifier.undo();
		});

		it('pops vertex from simplification history', function() {
			expect(history.pop).to.be.calledOnce;
			expect(history.pop).to.be.calledOn(history);
		});

		it('restores vertex to its ring', function() {
			expect(vertex.ring.restoreVertex).to.be.calledOnce;
			expect(vertex.ring.restoreVertex).to.be.calledOn(vertex.ring);
			expect(vertex.ring.restoreVertex).to.be.calledWith(vertex);
		});

		it('pushes vertex back onto the heap', function() {
			expect(heap.push).to.be.calledOnce;
			expect(heap.push).to.be.calledOn(heap);
			expect(heap.push).to.be.calledWith(vertex);
		});

		it('reverts area changed', function() {
			expect(simplifier.areaChanged).to.equal(0);
		});

		context('history is empty', function() {
			it('throws XError with appropriate message', function() {
				expect(() => {
					simplifier.undo();
				}).to.throw(XError, 'Simplification history is empty.');
			});
		});
	});

	describe('#skip()', function() {
		let simplifier, heap;

		beforeEach(function() {
			simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],  // Area: 8
					[ 0, 4 ],  // Area: 20
					[ 10, 6 ], // Area: 24
					[ 4, 0 ]   // Area: 12
				],
				[
					[ 1, 1 ], // Area: 4.5
					[ 1, 4 ], // Area: 9
					[ 7, 5 ], // Area: 10.5
					[ 4, 1 ]  // Area: 6
				]
			]);

			heap = simplifier.heap;
			sandbox.spy(heap, 'pop');

			simplifier.skip();
		});

		it('pops smallest-area vertex from the area heap', function() {
			expect(heap.pop).to.be.calledOnce;
			expect(heap.pop).to.be.calledOn(heap);
		});

		it('marks smallest-area vertex as skipped', function() {
			expect(heap.pop.firstCall.returnValue.skipped).to.be.true;
		});

		context('no remaining vertices', function() {
			it('throws XError with appropriate message', function() {
				let simplifier = new PolygonSimplifier([ [], [] ]);

				expect(() => {
					simplifier.skip();
				}).to.throw(XError, 'No remaining vertices.');
			});
		});
	});

	describe('#clearHistory()', function() {
		it('clears history array', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				]
			]);
			simplifier.simplify();

			simplifier.clearHistory();

			expect(simplifier.history).to.deep.equal([]);
		});
	});

	describe('#toGeoJson()', function() {
		it('returns array of GeoJson coordinates for each ring', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				],
				[
					[ 1, 1 ],
					[ 1, 3 ],
					[ 3, 3 ],
					[ 3, 1 ]
				]
			]);
			let outerRing = simplifier.rings[0];
			let innerRing = simplifier.rings[1];
			sandbox.spy(outerRing, 'toGeoJson');
			sandbox.spy(innerRing, 'toGeoJson');

			let result = simplifier.toGeoJson();

			expect(outerRing.toGeoJson).to.be.calledOnce;
			expect(outerRing.toGeoJson).to.be.calledOn(outerRing);
			expect(innerRing.toGeoJson).to.be.calledOnce;
			expect(innerRing.toGeoJson).to.be.calledOn(innerRing);
			expect(result).to.deep.equal([
				outerRing.toGeoJson.firstCall.returnValue,
				innerRing.toGeoJson.firstCall.returnValue
			]);
		});

		it('filters out inner rings with fewer than three vertices', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				],
				[
					[ 1, 1 ],
					[ 3, 3 ]
				]
			]);
			let outerRing = simplifier.rings[0];
			sandbox.spy(outerRing, 'toGeoJson');

			let result = simplifier.toGeoJson();

			expect(outerRing.toGeoJson).to.be.calledOnce;
			expect(outerRing.toGeoJson).to.be.calledOn(outerRing);
			expect(result).to.deep.equal([
				outerRing.toGeoJson.firstCall.returnValue
			]);
		});
	});

	describe('#toLineSegments()', function() {
		it('returns array of all line segments in the polygon', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],
					[ 0, 4 ],
					[ 4, 4 ],
					[ 4, 0 ]
				],
				[
					[ 1, 1 ],
					[ 1, 3 ],
					[ 3, 3 ],
					[ 3, 1 ]
				]
			]);
			let outerRing = simplifier.rings[0];
			let innerRing = simplifier.rings[1];
			let outerSegments = outerRing.toLineSegments();
			let innerSegments = innerRing.toLineSegments();
			sandbox.spy(outerRing, 'toLineSegments');
			sandbox.spy(innerRing, 'toLineSegments');

			let result = simplifier.toLineSegments();

			expect(outerRing.toLineSegments).to.be.calledOnce;
			expect(outerRing.toLineSegments).to.be.calledOn(outerRing);
			expect(innerRing.toLineSegments).to.be.calledOnce;
			expect(innerRing.toLineSegments).to.be.calledOn(innerRing);
			expect(result).to.deep.equal(outerSegments.concat(innerSegments));
		});
	});

	describe('#hasIntersections()', function() {
		context('no intersections', function() {
			it('returns false', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ],
						[ 0, 4 ],
						[ 10, 6 ],
						[ 4, 0 ]
					],
					[
						[ 1, 1 ],
						[ 1, 4 ],
						[ 7, 5 ],
						[ 4, 1 ]
					]
				]);

				expect(simplifier.hasIntersections()).to.be.false;
			});
		});

		context('outer ring intersects itself', function() {
			it('returns true', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ],
						[ 0, 4 ],
						[ 10, 6 ],
						[ 9, 6 ],
						// Intersection occurs here.
						[ 4, 0 ]
					],
					[
						[ 1, 1 ],
						[ 1, 4 ],
						[ 7, 5 ],
						[ 4, 1 ]
					]
				]);

				expect(simplifier.hasIntersections()).to.be.true;
			});
		});

		context('inner ring intersects itself', function() {
			it('returns true', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ],
						[ 0, 4 ],
						[ 10, 6 ],
						[ 4, 0 ]
					],
					[
						[ 1, 1 ],
						[ 1, 4 ],
						[ 7, 5 ],
						[ 6, 5 ],
						// Intersection occurs here.
						[ 4, 1 ]
					]
				]);

				expect(simplifier.hasIntersections()).to.be.true;
			});
		});

		context('outer ring intersects with inner ring', function() {
			it('returns true', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ],
						[ 0, 4 ],
						// Intersections occur here...
						[ 10, 6 ],
						[ 4, 0 ]
					],
					[
						[ 1, 1 ],
						[ 1, 4 ],
						// here...
						[ 7, 6 ],
						// and here.
						[ 4, 1 ]
					]
				]);

				expect(simplifier.hasIntersections()).to.be.true;
			});
		});
	});

	describe('#willIntersect()', function() {
		context('next simplify call will not cause an intersection', function() {
			it('returns false', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ],  // Area: 8
						[ 0, 4 ],  // Area: 20
						[ 10, 6 ], // Area: 24
						[ 4, 0 ]   // Area: 12
					],
					[
						[ 1, 1 ], // Area: 4.5
						[ 1, 4 ], // Area: 9
						[ 7, 5 ], // Area: 10.5
						[ 4, 1 ]  // Area: 6
					]
				]);

				expect(simplifier.willIntersect()).to.be.false;
			});
		});

		context('outer ring will intersect itself', function() {
			it('returns true', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ], // Area: 14
						[ 0, 7 ], // Area: 10.5
						[ 3, 6 ], // Area: 3.5
						[ 4, 8 ], // Area: 2
						// intersection will occur here...
						[ 5, 6 ], // Area: 3
						[ 8, 6 ], // Area: 9
						[ 8, 0 ], // Area: 12
						// here...
						[ 4, 7 ]  // Area: 28
						// and here.
					]
				]);

				expect(simplifier.willIntersect()).to.be.true;
			});
		});

		context('inner ring will intersect itself', function() {
			it('returns true', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ],   // Area: 50
						[ 0, 10 ],  // Area: 50
						[ 10, 10 ], // Area: 50
						[ 10, 0 ]   // Area: 50
					],
					[
						[ 1, 1 ], // Area: 14
						[ 1, 8 ], // Area: 10.5
						[ 4, 7 ], // Area: 3.5
						[ 5, 9 ], // Area: 2
						// intersection will occur here...
						[ 6, 7 ], // Area: 3
						[ 9, 7 ], // Area: 9
						[ 9, 1 ], // Area: 12
						// here...
						[ 5, 8 ]  // Area: 28
						// and here.
					]
				]);

				expect(simplifier.willIntersect()).to.be.true;
			});
		});

		context('inner ring will intersect outer ring', function() {
			it('returns true', function() {
				let simplifier = new PolygonSimplifier([
					[
						[ 0, 0 ], // Area: 10
						[ 0, 5 ], // Area: 5
						[ 2, 7 ], // Area: 4
						// intersection will occur here...
						[ 4, 5 ], // Area: 5
						[ 4, 0 ]  // Area: 10
					],
					[
						[ 1, 1 ], // Area: 5
						// here...
						[ 2, 6 ], // Area: 5
						// and here.
						[ 3, 1 ]  // Area: 5
					]
				]);

				expect(simplifier.willIntersect()).to.be.true;
			});
		});
	});

	describe('#rewind()', function() {
		it('reverts polygon to just before first intersection, then clears history', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],
					[ 0, 7 ],
					[ 3, 6 ], // Removed fourth.
					[ 4, 8 ], // Removed second, causing intersection.
					[ 5, 6 ], // Removed third.
					[ 7, 7 ], // Removed first.
					[ 8, 6 ],
					[ 8, 0 ],
					[ 6, 2 ], // Removed fifth.
					[ 4, 7 ],
					[ 2, 1 ]  // Removed sixth.
				]
			]);
			while (simplifier.vertexCount > 5) {
				simplifier.simplify();
			}

			simplifier.rewind();

			expect(simplifier.toGeoJson()).to.deep.equal([
				[
					[ 0, 0 ],
					[ 0, 7 ],
					[ 3, 6 ],
					[ 4, 8 ],
					[ 5, 6 ],
					// [ 7, 7 ] Removed before intersection, should remain so.
					[ 8, 6 ],
					[ 8, 0 ],
					[ 6, 2 ],
					[ 4, 7 ],
					[ 2, 1 ],
					[ 0, 0 ]
				]
			]);
			expect(simplifier.history).to.deep.equal([]);
		});

		it('throws if intersection never occurred', function() {
			let simplifier = new PolygonSimplifier([
				[
					[ 0, 0 ],
					[ 0, 7 ],
					[ 3, 6 ], // Removed fifth.
					[ 4, 8 ], // Removed third.
					[ 5, 6 ], // Removed fourth.
					[ 7, 7 ], // Removed second.
					[ 8, 6 ],
					[ 8, 0 ],
					[ 6, 2 ], // Removed first.
					[ 4, 5 ],
					[ 2, 1 ]  // Removed sixth.
				]
			]);
			while (simplifier.vertexCount > 5) {
				simplifier.simplify();
			}

			expect(() => {
				simplifier.rewind();
			}).to.throw(XError, 'First intersection could not be found.');
		});
	});
});
