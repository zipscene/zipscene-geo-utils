const { Geometry } = require('../lib');
const EventEmitter = require('events');
const XError = require('xerror');

describe('Geometry', function() {
	let geometry;

	beforeEach(function() {
		geometry = new Geometry();
	});

	it('extends EventEmitter', function() {
		expect(geometry).to.be.an.instanceof(EventEmitter);
	});

	describe('#listVertices()', function() {
		it('throws unsupported operation XError', function() {
			expect(() => {
				geometry.listVertices();
			}).to.throw(XError, XError.UNSUPPORTED_OPERATION);
		});
	});

	describe('#calculateArea()', function() {
		it('throws unsupported operation XError', function() {
			expect(() => {
				geometry.calculateArea();
			}).to.throw(XError, XError.UNSUPPORTED_OPERATION);
		});
	});

	describe('#toGeoJson()', function() {
		it('throws unsupported operation XError', function() {
			expect(() => {
				geometry.toGeoJson();
			}).to.throw(XError, XError.UNSUPPORTED_OPERATION);
		});
	});

	describe('#toLineSegments()', function() {
		it('throws unsupported operation XError', function() {
			expect(() => {
				geometry.toLineSegments();
			}).to.throw(XError, XError.UNSUPPORTED_OPERATION);
		});
	});
});
