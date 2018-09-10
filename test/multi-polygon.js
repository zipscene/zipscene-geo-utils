// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const { MultiPolygon, Geometry, Polygon } = require('../lib');
const sinon = require('sinon');

describe('MultiPolygon', function() {
	let coordinates, multiPolygon;

	beforeEach(function() {
		coordinates = [
			[
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
			],
			[
				[
					[ 1.5, 1.5 ],
					[ 1.5, 2.5 ],
					[ 2.5, 2.5 ],
					[ 2.5, 1.5 ],
					[ 1.5, 1.5 ] //endpoint
				]
			]
		];
		multiPolygon = new MultiPolygon(coordinates);
	});

	it('extends Geometry', function() {
		expect(multiPolygon).to.be.an.instanceof(Geometry);
	});

	describe('constructor', function() {
		it('maps coordinates to Polygons', function() {
			expect(multiPolygon.polygons).to.be.an.instanceof(Array);
			expect(multiPolygon.polygons).to.have.length(coordinates.length);
			multiPolygon.polygons.forEach((polygon, index) => {
				expect(polygon).to.be.an.instanceof(Polygon);
				expect(polygon.toGeoJson()).to.deep.equal(coordinates[index]);
			});
		});

		it('adds event handlers to propagate vertexChanged', function() {
			let handler = sinon.stub();
			multiPolygon.on('vertexChanged', handler);

			for (let polygon of multiPolygon.polygons) {
				let vertex = polygon.rings[0].vertices[0];
				polygon.emit('vertexChanged', vertex);

				expect(handler).to.be.calledOnce;
				expect(handler).to.be.calledWith(vertex);

				handler.reset();
			}
		});
	});

	describe('#listVertices()', function() {
		it('returns concatenation of vertices from polygons', function() {
			let [ firstPoly, secondPoly ] = multiPolygon.polygons;
			let firstPolyVertices = firstPoly.listVertices();
			let secondPolyVertices = secondPoly.listVertices();
			sinon.spy(firstPoly, 'listVertices');
			sinon.spy(secondPoly, 'listVertices');

			let result = multiPolygon.listVertices();

			expect(firstPoly.listVertices).to.be.calledOnce;
			expect(firstPoly.listVertices).to.be.calledOn(firstPoly);
			expect(secondPoly.listVertices).to.be.calledOnce;
			expect(secondPoly.listVertices).to.be.calledOn(secondPoly);
			expect(result).to.deep.equal(firstPolyVertices.concat(secondPolyVertices));
		});
	});

	describe('#calculateArea()', function() {
		it('returns sum of all polygon areas', function() {
			let [ firstPoly, secondPoly ] = multiPolygon.polygons;
			let firstPolyArea = firstPoly.calculateArea();
			let secondPolyArea = secondPoly.calculateArea();
			sinon.spy(firstPoly, 'calculateArea');
			sinon.spy(secondPoly, 'calculateArea');

			let result = multiPolygon.calculateArea();

			expect(firstPoly.calculateArea).to.be.calledOnce;
			expect(firstPoly.calculateArea).to.be.calledOn(firstPoly);
			expect(secondPoly.calculateArea).to.be.calledOnce;
			expect(secondPoly.calculateArea).to.be.calledOn(secondPoly);
			expect(result).to.deep.equal(firstPolyArea + secondPolyArea);
		});
	});

	describe('#toLineSegments()', function() {
		it('returns concatenation of line segments from polygons', function() {
			let [ firstPoly, secondPoly ] = multiPolygon.polygons;
			let firstPolySegments = firstPoly.toLineSegments();
			let secondPolySegments = secondPoly.toLineSegments();
			sinon.spy(firstPoly, 'toLineSegments');
			sinon.spy(secondPoly, 'toLineSegments');

			let result = multiPolygon.toLineSegments();

			expect(firstPoly.toLineSegments).to.be.calledOnce;
			expect(firstPoly.toLineSegments).to.be.calledOn(firstPoly);
			expect(secondPoly.toLineSegments).to.be.calledOnce;
			expect(secondPoly.toLineSegments).to.be.calledOn(secondPoly);
			expect(result).to.deep.equal(firstPolySegments.concat(secondPolySegments));
		});
	});

	describe('#toGeoJson', function() {
		let firstPoly, secondPoly;

		beforeEach(function() {
			[ firstPoly, secondPoly ] = multiPolygon.polygons;
			sinon.spy(firstPoly, 'toGeoJson');
		});

		it('returns polygons as GeoJson coordinate arrays', function() {
			sinon.spy(secondPoly, 'toGeoJson');

			let result = multiPolygon.toGeoJson();

			expect(firstPoly.toGeoJson).to.be.calledOnce;
			expect(firstPoly.toGeoJson).to.be.calledOn(firstPoly);
			expect(secondPoly.toGeoJson).to.be.calledOnce;
			expect(secondPoly.toGeoJson).to.be.calledOn(secondPoly);
			expect(result).to.deep.equal([
				firstPoly.toGeoJson.firstCall.returnValue,
				secondPoly.toGeoJson.firstCall.returnValue
			]);
		});

		it('filters out empty polygons', function() {
			sinon.stub(secondPoly, 'toGeoJson').callsFake(() => []);

			expect(multiPolygon.toGeoJson()).to.deep.equal([
				firstPoly.toGeoJson.firstCall.returnValue
			]);
		});
	});
});
