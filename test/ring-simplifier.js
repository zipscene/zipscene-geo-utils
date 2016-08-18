const { RingSimplifier, LinearRing } = require('../lib');
const sinon = require('sinon');
const Heap = require('heap');
const XError = require('xerror');

describe('RingSimplifier', function() {
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
				[ 0, 0 ], // Area: 2
				[ 0, 2 ], // Area: 5
				[ 5, 3 ], // Area: 6
				[ 2, 0 ]  // Area: 3
			];
			simplifier = new RingSimplifier(points);
		});

		it('extends LinearRing', function() {
			expect(simplifier).to.be.an.instanceof(LinearRing);
			expect(simplifier.toArray()).to.deep.equal(points);
		});

		it('pushes vertices onto an area-based heap', function() {
			expect(simplifier.areaHeap).to.be.an.instanceof(Heap);

			let vertices = [];
			while (!simplifier.areaHeap.empty()) {
				vertices.push(simplifier.areaHeap.pop());
			}

			expect(vertices).to.deep.equal([
				simplifier.vertices[0],
				simplifier.vertices[3],
				simplifier.vertices[1],
				simplifier.vertices[2]
			]);
		});

		it('sets up event handler to keep heap positions of vertices up to date', function() {
			let changedVertex = simplifier.vertices[1];
			let updateItem = sandbox.spy(simplifier.areaHeap, 'updateItem');

			simplifier.emit('vertexChanged', changedVertex);

			expect(updateItem).to.be.calledOnce;
			expect(updateItem).to.be.calledOn(simplifier.areaHeap);
			expect(updateItem).to.be.calledWith(changedVertex);
		});

		it('does not attempt to update skipped vertices', function() {
			simplifier.skip();
			let skippedVertex = simplifier.vertices[0];
			let updateItem = sandbox.spy(simplifier.areaHeap, 'updateItem');

			simplifier.emit('vertexChanged', skippedVertex);

			expect(updateItem).to.not.be.called;
		});

		it('creates array for storing removed vertices', function() {
			expect(simplifier.removedVertices).to.deep.equal([]);
		});
	});

	describe('#simplify()', function() {
		let simplifier, areaHeap, removedVertices;

		beforeEach(function() {
			simplifier = new RingSimplifier([
				[ 0, 0 ], // Area: 2
				[ 0, 2 ], // Area: 5
				[ 5, 3 ], // Area: 6
				[ 2, 0 ]  // Area: 3
			]);

			({ areaHeap, removedVertices } = simplifier);
			sandbox.spy(areaHeap, 'pop');
			sandbox.spy(simplifier, 'removeVertex');
			sandbox.spy(removedVertices, 'push');

			simplifier.simplify();
		});

		it('pops smallest-area vertex from the area heap', function() {
			expect(areaHeap.pop).to.be.calledOnce;
			expect(areaHeap.pop).to.be.calledOn(areaHeap);
		});

		it('removes smallest-area vertex from the ring', function() {
			expect(simplifier.removeVertex).to.be.calledOnce;
			expect(simplifier.removeVertex).to.be.calledOn(simplifier);
			expect(simplifier.removeVertex).to.be.calledWith(areaHeap.pop.firstCall.returnValue);
		});

		it('pushes smallest-area onto the array of removed vertices', function() {
			expect(removedVertices.push).to.be.calledOnce;
			expect(removedVertices.push).to.be.calledOn(removedVertices);
			expect(removedVertices.push).to.be.calledWith(areaHeap.pop.firstCall.returnValue);
		});

		context('ring has three vertices', function() {
			it('throws XError with appropriate message', function() {
				expect(() => {
					simplifier.simplify();
				}).to.throw(XError, 'Cannot simplify below three vertices.');
			});
		});
	});

	describe('#unsimplify()', function() {
		let simplifier, areaHeap, removedVertices;

		beforeEach(function() {
			simplifier = new RingSimplifier([
				[ 0, 0 ], // Area: 2
				[ 0, 2 ], // Area: 5
				[ 5, 3 ], // Area: 6
				[ 2, 0 ]  // Area: 3
			]);
			simplifier.simplify();

			({ areaHeap, removedVertices } = simplifier);
			sandbox.spy(removedVertices, 'pop');
			sandbox.spy(simplifier, 'restoreVertex');
			sandbox.spy(areaHeap, 'push');

			simplifier.unsimplify();
		});

		it('pops last-removed vertex from array of removed vertices', function() {
			expect(removedVertices.pop).to.be.calledOnce;
			expect(removedVertices.pop).to.be.calledOn(removedVertices);
		});

		it('restores last-removed vertex to ring', function() {
			expect(simplifier.restoreVertex).to.be.calledOnce;
			expect(simplifier.restoreVertex).to.be.calledOn(simplifier);
			expect(simplifier.restoreVertex).to.be.calledWith(removedVertices.pop.firstCall.returnValue);
		});

		it('pushes last-removed vertex back onto the area heap', function() {
			expect(areaHeap.push).to.be.calledOnce;
			expect(areaHeap.push).to.be.calledOn(areaHeap);
			expect(areaHeap.push).to.be.calledWith(removedVertices.pop.firstCall.returnValue);
		});

		context('removed vertices array is empty', function() {
			it('throws XError with appropriate message', function() {
				expect(() => {
					simplifier.unsimplify();
				}).to.throw(XError, 'Removed vertex history is empty.');
			});
		});
	});

	describe('#skip()', function() {
		let simplifier, areaHeap;

		beforeEach(function() {
			simplifier = new RingSimplifier([
				[ 0, 0 ], // Area: 2
				[ 0, 2 ], // Area: 5
				[ 5, 3 ], // Area: 6
				[ 2, 0 ]  // Area: 3
			]);

			areaHeap = simplifier.areaHeap;
			sandbox.spy(areaHeap, 'pop');

			simplifier.skip();
		});

		it('pops smallest-area vertex from the area heap', function() {
			expect(areaHeap.pop).to.be.calledOnce;
			expect(areaHeap.pop).to.be.calledOn(areaHeap);
		});

		it('marks smallest-area vertex as skipped', function() {
			expect(areaHeap.pop.firstCall.returnValue.skipped).to.be.true;
		});
	});

	describe('#clearHistory()', function() {
		it('clears removedVertices array', function() {
			let simplifier = new RingSimplifier([
				[ 0, 0 ], // Area: 2
				[ 0, 2 ], // Area: 5
				[ 5, 3 ], // Area: 6
				[ 2, 0 ]  // Area: 3
			]);
			simplifier.simplify();

			simplifier.clearHistory();

			expect(simplifier.removedVertices).to.deep.equal([]);
		});
	});
});
