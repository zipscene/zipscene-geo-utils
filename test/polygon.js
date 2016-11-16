// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { Polygon, Geometry, LinearRing } = require('../lib');
const sinon = require('sinon');

describe('Polygon', function() {
	let coordinates, polygon;

	beforeEach(function() {
		coordinates = [
			[
				[ 0, 0 ],
				[ 0, 4 ],
				[ 4, 4 ],
				[ 4, 0 ],
				[ 0, 0 ]  //endpoint
			],
			[
				[ 1, 1 ],
				[ 1, 3 ],
				[ 3, 3 ],
				[ 3, 1 ],
				[ 1, 1 ]  //endpoint
			]
		];
		polygon = new Polygon(coordinates);
	});

	it('extends Geometry', function() {
		expect(polygon).to.be.an.instanceof(Geometry);
	});

	describe('constructor', function() {
		it('maps coordinates to LinearRings', function() {
			expect(polygon.rings).to.be.an.instanceof(Array);
			expect(polygon.rings).to.have.length(coordinates.length);
			polygon.rings.forEach((ring, index) => {
				expect(ring).to.be.an.instanceof(LinearRing);
				expect(ring.toGeoJson()).to.deep.equal(coordinates[index]);
			});
		});

		it('adds event handlers to propagate vertexChanged', function() {
			let handler = sinon.stub();
			polygon.on('vertexChanged', handler);

			for (let ring of polygon.rings) {
				let vertex = ring.vertices[0];
				ring.emit('vertexChanged', vertex);

				expect(handler).to.be.calledOnce;
				expect(handler).to.be.calledWith(vertex);

				handler.reset();
			}
		});
	});

	describe('#listVertices()', function() {
		it('returns concatenation of vertices from rings', function() {
			let [ outerRing, innerRing ] = polygon.rings;
			let outerVertices = outerRing.listVertices();
			let innerVertices = innerRing.listVertices();
			sinon.spy(outerRing, 'listVertices');
			sinon.spy(innerRing, 'listVertices');

			let result = polygon.listVertices();

			expect(outerRing.listVertices).to.be.calledOnce;
			expect(outerRing.listVertices).to.be.calledOn(outerRing);
			expect(innerRing.listVertices).to.be.calledOnce;
			expect(innerRing.listVertices).to.be.calledOn(innerRing);
			expect(result).to.deep.equal(outerVertices.concat(innerVertices));
		});
	});

	describe('#calculateArea()', function() {
		it('returns area of outer ring minus areas of inner rings', function() {
			let [ outerRing, innerRing ] = polygon.rings;
			let outerArea = outerRing.calculateArea();
			let innerArea = innerRing.calculateArea();
			sinon.spy(outerRing, 'calculateArea');
			sinon.spy(innerRing, 'calculateArea');

			let result = polygon.calculateArea();

			expect(outerRing.calculateArea).to.be.calledOnce;
			expect(outerRing.calculateArea).to.be.calledOn(outerRing);
			expect(innerRing.calculateArea).to.be.calledOnce;
			expect(innerRing.calculateArea).to.be.calledOn(innerRing);
			expect(result).to.deep.equal(outerArea - innerArea);
		});
	});

	describe('#toLineSegments()', function() {
		it('returns concatenation of line segments from rings', function() {
			let [ outerRing, innerRing ] = polygon.rings;
			let outerSegments = outerRing.toLineSegments();
			let innerSegments = innerRing.toLineSegments();
			sinon.spy(outerRing, 'toLineSegments');
			sinon.spy(innerRing, 'toLineSegments');

			let result = polygon.toLineSegments();

			expect(outerRing.toLineSegments).to.be.calledOnce;
			expect(outerRing.toLineSegments).to.be.calledOn(outerRing);
			expect(innerRing.toLineSegments).to.be.calledOnce;
			expect(innerRing.toLineSegments).to.be.calledOn(innerRing);
			expect(result).to.deep.equal(outerSegments.concat(innerSegments));
		});
	});

	describe('#toGeoJson()', function() {
		let outerRing, innerRing;

		beforeEach(function() {
			[ outerRing, innerRing ] = polygon.rings;
			sinon.spy(outerRing, 'toGeoJson');
		});

		it('returns rings as GeoJson coordinate arrays', function() {
			sinon.spy(innerRing, 'toGeoJson');

			let result = polygon.toGeoJson();

			expect(outerRing.toGeoJson).to.be.calledOnce;
			expect(outerRing.toGeoJson).to.be.calledOn(outerRing);
			expect(innerRing.toGeoJson).to.be.calledOnce;
			expect(innerRing.toGeoJson).to.be.calledOn(innerRing);
			expect(result).to.deep.equal([
				outerRing.toGeoJson.firstCall.returnValue,
				innerRing.toGeoJson.firstCall.returnValue
			]);
		});

		it('filters out empty rings', function() {
			sinon.stub(innerRing, 'toGeoJson', () => []);

			expect(polygon.toGeoJson()).to.deep.equal([
				outerRing.toGeoJson.firstCall.returnValue
			]);
		});
	});
});
