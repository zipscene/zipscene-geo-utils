const { Vertex, LinearRing } = require('../lib');
const EventEmitter = require('events');
const sinon = require('sinon');
const XError = require('xerror');

describe('Vertex', function() {
	it('extends EventEmitter', function() {
		expect(new Vertex()).to.be.an.instanceof(EventEmitter);
	});

	describe('constructor', function() {
		let point, ring, index, vertex;

		beforeEach(function() {
			point = [ 0, 1 ];
			ring = new LinearRing([]);
			index = 0;

			vertex = new Vertex(point, ring, index);
		});

		it('stores point', function() {
			expect(vertex.point).to.equal(point);
		});

		it('stores reference to containing ring', function() {
			expect(vertex.ring).to.equal(ring);
		});

		it('stores index of vertex within containing ring', function() {
			expect(vertex.index).to.equal(index);
		});

		it('sets initial prev and next to null', function() {
			expect(vertex.prev).to.be.null;
			expect(vertex.next).to.be.null;
		});

		it('sets skipped property to false', function() {
			expect(vertex.skipped).to.be.false;
		});
	});

	describe('#prev', function() {
		context('set', function() {
			it('clears area cache, then emits vertexChanged event', function() {
				let vertex = new Vertex([ 0, 0 ]);
				vertex.prev = new Vertex([ 0, 1 ]);
				vertex.next = new Vertex([ 2, 0 ]);
				let originalArea = vertex.getArea();
				let handler = sinon.spy((arg) => {
					expect(arg).to.equal(vertex);
					expect(vertex.getArea()).to.not.equal(originalArea);
				});
				vertex.on('vertexChanged', handler);

				vertex.prev = new Vertex([ 0, 2 ]);

				expect(handler).to.be.calledOnce;
			});
		});
	});

	describe('#next', function() {
		context('set', function() {
			it('clears area cache, then emits vertexChanged event', function() {
				let vertex = new Vertex([ 0, 0 ]);
				vertex.prev = new Vertex([ 0, 1 ]);
				vertex.next = new Vertex([ 2, 0 ]);
				let originalArea = vertex.getArea();
				let handler = sinon.spy((arg) => {
					expect(arg).to.equal(vertex);
					expect(vertex.getArea()).to.not.equal(originalArea);
				});
				vertex.on('vertexChanged', handler);

				vertex.next = new Vertex([ 4, 0 ]);

				expect(handler).to.be.calledOnce;
			});
		});
	});

	describe('#getArea()', function() {
		let vertex;

		beforeEach(function() {
			vertex = new Vertex([ 0, 0 ]);
			vertex.prev = new Vertex([ 0, 1 ]);
			vertex.next = new Vertex([ 2, 0 ]);
		});

		it('returns area of triangle formed by ajacent vertices', function() {
			expect(vertex.getArea()).to.equal(1);
		});

		it('returns zero when prev and next are the same', function() {
			vertex.next = vertex.prev;

			expect(vertex.getArea()).to.equal(0);
		});

		it('returns zero when vertex is its own prev and next', function() {
			vertex.next = vertex.prev = vertex;

			expect(vertex.getArea()).to.equal(0);
		});

		it('throws invalid argument when prev is not set', function() {
			vertex.prev = null;

			expect(() =>{
				vertex.getArea();
			}).to.throw(XError, `${XError.INVALID_ARGUMENT}: prev not set.`);
		});

		it('throws invalid argument when next is not set', function() {
			vertex.next = null;

			expect(() =>{
				vertex.getArea();
			}).to.throw(XError, `${XError.INVALID_ARGUMENT}: next not set.`);
		});
	});

	describe('#remove()', function() {
		it('removes vertex from its ring', function() {
			let ring = new LinearRing([]);
			let vertex = new Vertex([ 0, 0 ], ring);
			sinon.stub(ring, 'removeVertex');

			vertex.remove();

			expect(ring.removeVertex).to.be.calledOnce;
			expect(ring.removeVertex).to.be.calledOn(ring);
			expect(ring.removeVertex).to.be.calledWith(vertex);
		});
	});

	describe('#restore()', function() {
		it('restores vertex to its ring', function() {
			let ring = new LinearRing([]);
			let vertex = new Vertex([ 0, 0 ], ring);
			sinon.stub(ring, 'restoreVertex');

			vertex.restore();

			expect(ring.restoreVertex).to.be.calledOnce;
			expect(ring.restoreVertex).to.be.calledOn(ring);
			expect(ring.restoreVertex).to.be.calledWith(vertex);
		});
	});
});
