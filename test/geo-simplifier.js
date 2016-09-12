const { GeoSimplifier, Geometry, Vertex, LinearRing } = require('../lib');
const sinon = require('sinon');
const Heap = require('heap');
const XError = require('xerror');

describe('GeoSimplifier', function() {
	let geometry, vertices, simplifier;

	beforeEach(function() {
		vertices = [ 4, 2, 1, 3 ].map((area, index) => {
			let vertex = new Vertex([ index, index ]);
			sinon.stub(vertex, 'getArea').returns(area);
			sinon.stub(vertex, 'remove');
			sinon.stub(vertex, 'restore');
			return vertex;
		});

		geometry = new Geometry();
		sinon.stub(geometry, 'listVertices').returns(vertices);
		sinon.stub(geometry, 'calculateArea').returns(10);

		simplifier = new GeoSimplifier(geometry);
	});

	describe('constructor', function() {
		it('stores provided geometry', function() {
			expect(simplifier.geometry).to.equal(geometry);
		});

		it('pushes all vertices onto an ascending area heap', function() {
			expect(geometry.listVertices).to.be.calledOnce;
			expect(geometry.listVertices).to.be.calledOn(geometry);
			expect(simplifier.heap).to.be.an.instanceof(Heap);
			expect(intoArray(simplifier.heap)).to.deep.equal([
				vertices[2],
				vertices[1],
				vertices[3],
				vertices[0]
			]);
		});

		it('sets up event handlers to keep heap positions up to date', function() {
			let updateItem = sinon.stub(simplifier.heap, 'updateItem');
			let vertex = new Vertex();

			geometry.emit('vertexChanged', vertex);

			expect(updateItem).to.be.calledOnce;
			expect(updateItem).to.always.be.calledOn(simplifier.heap);
			expect(updateItem).to.be.calledWith(vertex);
		});

		it('does not attempt to update skipped vertices', function() {
			let updateItem = sinon.stub(simplifier.heap, 'updateItem');
			let vertex = new Vertex();
			vertex.skipped = true;

			geometry.emit('vertexChanged', vertex);

			expect(updateItem).to.not.be.called;
		});

		it('creates array for storing simplification history', function() {
			expect(simplifier.history).to.deep.equal([]);
		});

		it('sets initial vertex count', function() {
			expect(simplifier.vertexCount).to.equal(vertices.length);
		});

		it('calculates and stores original area', function() {
			expect(geometry.calculateArea).to.be.calledOnce;
			expect(geometry.calculateArea).to.be.calledOn(geometry);
			expect(simplifier.originalArea).to
				.equal(geometry.calculateArea.firstCall.returnValue);
		});

		it('sets initial area changed to zero', function() {
			expect(simplifier.areaChanged).to.equal(0);
		});
	});

	describe('#relativeAreaChanged', function() {
		it('returns area changed divided by original area', function() {
			let simplifier = new GeoSimplifier(geometry);
			simplifier.areaChanged = 4.2;

			expect(simplifier.relativeAreaChanged)
				.to.equal(simplifier.areaChanged / simplifier.originalArea);
		});
	});

	describe('#simplify()', function() {
		let heap, history, initialVertexCount, initialAreaChanged, vertex;

		beforeEach(function() {
			({ heap, history } = simplifier);
			initialVertexCount = simplifier.vertexCount;
			initialAreaChanged = simplifier.areaChanged = 3;
			vertex = heap.peek();

			sinon.spy(heap, 'pop');
			sinon.spy(history, 'push');

			simplifier.simplify();
		});

		it('pops vertex from the area heap', function() {
			expect(heap.pop).to.be.calledOnce;
			expect(heap.pop).to.be.calledOn(heap);
		});

		it('removes vertex from its ring', function() {
			expect(vertex.remove).to.be.calledOnce;
			expect(vertex.remove).to.be.calledOn(vertex);
		});

		it('pushes vertex onto simplification history', function() {
			expect(history.push).to.be.calledOnce;
			expect(history.push).to.be.calledOn(history);
			expect(history.push).to.be.calledWith(vertex);
		});

		it('decrements vertex count', function() {
			expect(simplifier.vertexCount).to.equal(initialVertexCount - 1);
		});

		it('adds area of removed vertex to area changed', function() {
			expect(simplifier.areaChanged).to
				.equal(initialAreaChanged + vertex.getArea());
		});

		it('throws when heap is empty', function() {
			while (!heap.empty()) {
				heap.pop();
			}

			expect(() => {
				simplifier.simplify();
			}).to.throw(XError, `${XError.INVALID_ARGUMENT}: No remaining vertices.`);
		});
	});

	describe('#undo()', function() {
		let history, heap, initialVertexCount, initialAreaChanged, vertex;

		beforeEach(function() {
			simplifier.simplify();

			({ heap, history } = simplifier);
			initialVertexCount = simplifier.vertexCount;
			initialAreaChanged = simplifier.areaChanged = 3;
			vertex = history[history.length - 1];

			sinon.spy(history, 'pop');
			sinon.spy(heap, 'push');

			simplifier.undo();
		});

		it('pops vertex from history', function() {
			expect(history.pop).to.be.calledOnce;
			expect(history.pop).to.be.calledOn(history);
		});

		it('restores vertex to its ring', function() {
			expect(vertex.restore).to.be.calledOnce;
			expect(vertex.restore).to.be.calledOn(vertex);
		});

		it('pushes vertex back onto heap', function() {
			expect(heap.push).to.be.calledOnce;
			expect(heap.push).to.be.calledOn(heap);
			expect(heap.push).to.be.calledWith(vertex);
		});

		it('increments vertex count', function() {
			expect(simplifier.vertexCount).to.equal(initialVertexCount + 1);
		});

		it('subtracts area of removed vertex to area changed', function() {
			expect(simplifier.areaChanged).to
				.equal(initialAreaChanged - vertex.getArea());
		});

		it('throws when history is empty', function() {
			expect(() => {
				simplifier.undo();
			}).to.throw(XError, `${XError.INVALID_ARGUMENT}: Simplification history is empty.`);
		});
	});

	describe('#skip()', function() {
		let heap, vertex;

		beforeEach(function() {
			({ heap } = simplifier);
			vertex = heap.peek();

			sinon.spy(heap, 'pop');

			simplifier.skip();
		});

		it('pops smallest-area vertex from the area heap', function() {
			expect(heap.pop).to.be.calledOnce;
			expect(heap.pop).to.be.calledOn(heap);
		});

		it('marks popped vertex as skipped', function() {
			expect(vertex.skipped).to.be.true;
		});

		it('throws when heap is empty', function() {
			while (!heap.empty()) {
				heap.pop();
			}

			expect(() => {
				simplifier.skip();
			}).to.throw(XError, `${XError.INVALID_ARGUMENT}: No remaining vertices.`);
		});
	});

	describe('#clearHistory()', function() {
		it('clears history array', function() {
			simplifier.simplify();

			simplifier.clearHistory();

			expect(simplifier.history).to.deep.equal([]);
		});
	});

	describe('#simplifyTo()', function() {
		let simplify, undo;

		beforeEach(function() {
			simplify = sinon.spy(simplifier, 'simplify');
			undo = sinon.spy(simplifier, 'undo');

			// Tracked values after n simplify calls:
			// n = 0: vertexCount = 4, relativeAreaChanged = 0.0
			// n = 1: vertexCount = 3, relativeAreaChanged = 0.1
			// n = 2: vertexCount = 2, relativeAreaChanged = 0.3
			// n = 3: vertexCount = 1, relativeAreaChanged = 0.6
			// n = 4: vertexCount = 0, relativeAreaChanged = 1.0
		});

		it('simplifies to maxVertices', function() {
			simplifier.simplifyTo({ maxVertices: 3 });

			expect(simplify).to.be.calledOnce;
			expect(simplify).to.always.be.calledOn(simplifier);
		});

		it('simplifies to minVertices', function() {
			simplifier.simplifyTo({ minVertices: 1 });

			expect(simplify).to.be.calledThrice;
			expect(simplify).to.always.be.calledOn(simplifier);
		});

		it('simplifies to maxError', function() {
			simplifier.simplifyTo({ maxError: 0.3 });

			expect(simplify).to.be.calledTwice;
			expect(simplify).to.always.be.calledOn(simplifier);
		});

		it('undoes last simplification if maxError was exceeded', function() {
			simplifier.simplifyTo({ maxError: 0.2 });

			expect(simplify).to.be.calledTwice;
			expect(simplify).to.always.be.calledOn(simplifier);
			expect(undo).to.be.calledOnce;
			expect(undo).to.be.calledOn(simplifier);
		});

		it('priortizes maxVertices over other options', function() {
			simplifier.simplifyTo({
				maxVertices: 1,
				minVertices: 3,
				maxError: 0.3
			});

			expect(simplify).to.be.calledThrice;
			expect(simplify).to.always.be.calledOn(simplifier);
		});

		it('stops at minVertices, if reached before maxError', function() {
			simplifier.simplifyTo({
				minVertices: 3,
				maxError: 0.3
			});

			expect(simplify).to.be.calledOnce;
			expect(simplify).to.always.be.calledOn(simplifier);
		});

		it('stops at maxError, if reached before minVertices', function() {
			simplifier.simplifyTo({
				minVertices: 1,
				maxError: 0.3
			});

			expect(simplify).to.be.calledTwice;
			expect(simplify).to.always.be.calledOn(simplifier);
		});
	});

	describe('#hasIntersections()', function() {
		let toLineSegments;

		beforeEach(function() {
			toLineSegments = sinon.stub(geometry, 'toLineSegments');
		});

		context('line segments do not intersect', function() {
			it('returns false', function() {
				toLineSegments.returns([
					[ [ 0, 0 ], [ 0, 4 ] ],
					[ [ 0, 4 ], [ 4, 4 ] ],
					[ [ 4, 4 ], [ 4, 0 ] ],
					[ [ 4, 0 ], [ 0, 0 ] ]
				]);

				let result = simplifier.hasIntersections();

				expect(toLineSegments).to.be.calledOnce;
				expect(toLineSegments).to.be.calledOn(geometry);
				expect(result).to.be.false;
			});
		});

		context('line segments intersect', function() {
			it('returns true', function() {
				toLineSegments.returns([
					[ [ 0, 0 ], [ 0, 4 ] ],
					[ [ 0, 4 ], [ 4, 0 ] ], // this intersects...
					[ [ 4, 0 ], [ 4, 4 ] ],
					[ [ 4, 4 ], [ 0, 0 ] ]  // with this.
				]);

				let result = simplifier.hasIntersections();

				expect(toLineSegments).to.be.calledOnce;
				expect(toLineSegments).to.be.calledOn(geometry);
				expect(result).to.be.true;
			});
		});
	});

	describe('#willIntersect()', function() {
		let heap, toLineSegments;

		beforeEach(function() {
			({ heap } = simplifier);
			toLineSegments = sinon.stub(geometry, 'toLineSegments');

			// New line segment would be added between prev and next of
			// smallest-area vertex.
			let vertex = new Vertex();
			vertex.next = new Vertex([ 2, 3 ]);
			vertex.prev = new Vertex([ 2, 5 ]);
			sinon.stub(heap, 'peek').returns(vertex);
		});

		context('line segments do not intersect with new segment', function() {
			it('returns false', function() {
				toLineSegments.returns([
					[ [ 0, 0 ], [ 0, 2 ] ],
					[ [ 0, 2 ], [ 4, 2 ] ],
					[ [ 4, 2 ], [ 4, 0 ] ],
					[ [ 4, 0 ], [ 0, 0 ] ]
				]);

				let result = simplifier.willIntersect();

				expect(toLineSegments).to.be.calledOnce;
				expect(toLineSegments).to.be.calledOn(geometry);
				expect(result).to.be.false;
			});
		});

		context('line segments intersect with new segment', function() {
			it('returns true', function() {
				toLineSegments.returns([
					[ [ 0, 0 ], [ 0, 4 ] ],
					[ [ 0, 4 ], [ 4, 4 ] ], // new segment intersects with this.
					[ [ 4, 4 ], [ 4, 0 ] ],
					[ [ 4, 0 ], [ 0, 0 ] ]
				]);

				let result = simplifier.willIntersect();

				expect(toLineSegments).to.be.calledOnce;
				expect(toLineSegments).to.be.calledOn(geometry);
				expect(result).to.be.true;
			});
		});
	});

	describe('#undoToIntersection()', function() {
		it('reverts polygon to just before first intersection, then clears history', function() {
			geometry = new LinearRing([
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
			]);
			simplifier = new GeoSimplifier(geometry);
			while (simplifier.vertexCount > 5) {
				simplifier.simplify();
			}

			simplifier.undoToIntersection();

			expect(geometry.toGeoJson()).to.deep.equal([
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
				[ 0, 0 ] //endpoint
			]);
			expect(simplifier.history).to.deep.equal([]);
		});

		it('throws if intersection never occurred', function() {
			geometry = new LinearRing([
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
			]);
			simplifier = new GeoSimplifier(geometry);
			while (simplifier.vertexCount > 5) {
				simplifier.simplify();
			}

			expect(() => {
				simplifier.undoToIntersection();
			}).to.throw(XError, 'First intersection could not be found.');
		});
	});
});

function intoArray(heap) {
	let array = [];
	while (!heap.empty()) {
		array.push(heap.pop());
	}

	return array;
}
