const { Vertex, LinearRing } = require('../lib');

describe('Vertex', function() {
	describe('constructor', function() {
		it('initializes vertex', function() {
			let point = [ 0, 1 ];
			let index = 0;
			let ring = new LinearRing([]);

			let vertex = new Vertex(point, index, ring);

			expect(vertex.point).to.equal(point);
			expect(vertex.index).to.equal(index);
			expect(vertex.ring).to.equal(ring);
			expect(vertex.prev).to.be.null;
			expect(vertex.next).to.be.null;
			expect(vertex.skipped).to.be.false;
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

		it('returns correct area after change to prev', function() {
			vertex.getArea();
			vertex.prev = new Vertex([ 0, 2 ]);

			expect(vertex.getArea()).to.equal(2);
		});

		it('returns correct area after change to next', function() {
			vertex.getArea();
			vertex.next = new Vertex([ 1, 0 ]);

			expect(vertex.getArea()).to.equal(0.5);
		});

		it('returns zero when prev and next are the same', function() {
			vertex.next = vertex.prev;

			expect(vertex.getArea()).to.equal(0);
		});

		it('returns zero when vertex is its own prev and next', function() {
			vertex.next = vertex.prev = vertex;

			expect(vertex.getArea()).to.equal(0);
		});
	});
});
