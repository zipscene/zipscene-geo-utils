const { LinearRing, Geometry, Vertex } = require('../lib');
const sinon = require('sinon');
const XError = require('xerror');

describe('LinearRing', function() {
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

	it('extends Geometry', function() {
		expect(ring).to.be.an.instanceof(Geometry);
	});

	describe('constructor', function() {
		it('maps points to vertices', function() {
			expect(ring.vertices).to.be.an.instanceof(Array);
			expect(ring.vertices).to.have.length(points.length);
			ring.vertices.forEach((vertex, index) => {
				expect(vertex).to.be.an.instanceof(Vertex);
				expect(vertex.point).to.equal(points[index]);
				expect(vertex.ring).to.equal(ring);
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

		it('adds event handlers to propagate vertexChanged', function() {
			let handler = sinon.stub();
			ring.on('vertexChanged', handler);

			for (let vertex of ring.vertices) {
				vertex.emit('vertexChanged', vertex);

				expect(handler).to.be.calledOnce;
				expect(handler).to.be.calledWith(vertex);

				handler.reset();
			}
		});

		it('ignores endpoint if it is the same as start', function() {
			ring = new LinearRing([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ],
				[ 0, 0 ] // endpoint
			]);

			expect(ring.vertices).to.have.length(4);
		});
	});

	describe('#removeVertex()', function() {
		let prev, vertex, next;

		beforeEach(function() {
			[ prev, vertex, next ] = ring.vertices;
			ring.removeVertex(vertex);
		});

		it('replaces vertex with null', function() {
			expect(ring.vertices[vertex.index]).to.be.null;
		});

		it('updates adjacent vertices', function() {
			expect(prev.next).to.equal(next);
			expect(next.prev).to.equal(prev);
		});
	});

	describe('#restoreVertex()', function() {
		let removedVertices;

		beforeEach(function() {
			removedVertices = [
				ring.vertices[0],
				ring.vertices[1]
			];
			removedVertices.forEach((vertex) => {
				ring.removeVertex(vertex);
			});
		});

		context('correct restoration order', function() {
			let vertex, prev, next;

			beforeEach(function() {
				vertex = removedVertices[1];
				({ prev, next } = vertex);

				ring.restoreVertex(vertex);
			});

			it('replaces null with vertex at its index', function() {
				expect(ring.vertices[vertex.index]).to.equal(vertex);
			});

			it('reverts adjacent vertices', function() {
				expect(prev.next).to.equal(vertex);
				expect(next.prev).to.equal(vertex);
			});
		});

		context('incorrect restoration order', function() {
			it('throws XError with appropriate message', function() {
				expect(() => {
					ring.restoreVertex(removedVertices[0]);
				}).to.throw(XError, `${XError.INVALID_ARGUMENT}: Incorrect restoration order.`);
			});
		});
	});

	describe('#listVertices()', function() {
		it('returns array of all vertices', function() {
			expect(ring.listVertices()).to.deep.equal(ring.vertices);
		});

		it('filters out removed vertices', function() {
			ring.removeVertex(ring.vertices[0]);

			expect(ring.listVertices())
				.to.deep.equal(ring.vertices.filter((v) => !!v));
		});
	});

	describe('#calculateArea()', function() {
		it('returns area encompassed by the ring', function() {
			expect(ring.calculateArea()).to.equal(16);
		});

		it('filters out removed vertices', function() {
			ring.removeVertex(ring.vertices[0]);

			expect(ring.calculateArea()).to.equal(8);
		});
	});

	describe('#toLineSegments()', function() {
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

	describe('#toGeoJson()', function() {
		it('returns vertices as a valid GeoJson coordinates array', function() {
			expect(ring.toGeoJson()).to.deep.equal([
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ],
				[ 0, 0 ]
			]);
		});

		it('filters out removed vertices', function() {
			ring.removeVertex(ring.vertices[0]);

			expect(ring.toGeoJson()).to.deep.equal([
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ],
				[ 0, 4 ]
			]);
		});

		it('returns empty array if fewer than three vetices remain', function() {
			ring.removeVertex(ring.vertices[0]);
			ring.removeVertex(ring.vertices[1]);

			expect(ring.toGeoJson()).to.deep.equal([]);
		});
	});
});
