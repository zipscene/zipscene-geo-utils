# zipscene-geo-utils

GeoJson utility library. Includes several classes for working with GeoJson
entities, as well as a static simplification function.


## simplifyPolygon
A simplification function for GeoJson geometries that removes vertices until
specified tolerances are reached. It is capable of removing internal rings and
individual MultiPolygon parts as part of the simplification process.

```javascript
const { simplifyPolygon } = require('zipscene-geo-utils');

let geoJson = {
	type: 'Polygon', // Can also be a MultiPolygon
	coordinates: [
		// GeoJSON coordinate rings
	]
};

let options = {
	// A strict maximum vertex count. Defaults to 200.
	maxVertices: 100,

	// Stopping point based on vertex count. Defaults to 30.
	minVertices: 20,

	// // Stopping point based on percent change to the polygon. Defaults to 0.05.
	maxError: 0.01,

	// If set to true, the algorithm will attempt to resolve self-intersections
	// that may occur as a result of simplification. Will fail for some complex polygons.
	fixIntersections: true
};

// Simplification occurs in place.
simplifyPolygon(geoJson, options);
```


## GeoSimplifier
A class for performing simplification operations on GeoJson geometries. It is
used internally by `simplifyPolygon` above.

```javascript
const { GeoSimplifier, LinearRing } = require('zipscene-geo-utils');

// See more about the LinearRing class below.
let ring = new LinearRing([
	[ 0, 0 ],
	[ 0, 10 ],
	[ 8.8, 8.9 ],
	[ 9, 9 ],
	[ 9.9, 9.9 ],
	[ 10, 10 ],
	[ 10, 0 ],
	[ 0, 0 ]
]);

// Also accepts Polygon and MultiPolygon instances.
let simplifier = new GeoSimplifier(ring);

// Simplify by one vertex.
simplifier.simplify();

// Note that the ring is changed in-place.
console.log(ring.toGeoJson());
// [ [ 0, 0 ],
//   [ 0, 10 ],
//   [ 8.8, 8.9 ],
//   [ 9, 9 ],
//   [ 10, 10 ],
//   [ 10, 0 ],
//   [ 0, 0 ] ]

// And again...
simplifier.simplify();

console.log(ring.toGeoJson());
// [ [ 0, 0 ],
//   [ 0, 10 ],
//   [ 8.8, 8.9 ],
//   [ 10, 10 ],
//   [ 10, 0 ],
//   [ 0, 0 ] ]

// Simplification can be undone.
simplifier.undo();

console.log(ring.toGeoJson());
// [ [ 0, 0 ],
//   [ 0, 10 ],
//   [ 8.8, 8.9 ],
//   [ 9, 9 ],
//   [ 10, 10 ],
//   [ 10, 0 ],
//   [ 0, 0 ] ]
```


## Geometry
An abstract class for GeoJson geometries that can be simplified by the
`GeoSimplifier` class above. Derived classes must override the following
methods:

- `listVertices()`: Returns a flat array of all `Vertex` objects remaining in the geometry.
- `calculateArea()`': Returns the area of the geometry.
- `toLineSegments()`: Returns a flat array of line segments remaining in the geometry in the form [ [x1, y1] , [ x2, y2 ] ].
- `toGeoJson()`: Returns the vertices remaining geometry as a GeoJson coordinates array.


## Vertex
The simplest GeoJson entity class. Represents a point in a GeoJson coordinate
ring, with references to its neighboring points.

```javascript
const { Vertex } = require('zipscene-geo-utils');

let vertex = new Vertex([ 0, 0 ]);
vertex.prev = new Vertex([ 1, 0 ]);
vertex.next = new Vertex([ 0, 1 ]);

// Calculate the area of the triangle formed by the vertex and its neighbors.
let area = vertex.getArea();

console.log(area);
// 0.5
```

## LinearRing
A concrete subtype of `Geometry`, this class represents a GeoJson coordinate
ring. Individual vertices can be accessed and manipulated through the `vertices`
property. Note that vertices are indexed by their *original* positions in the
ring, not by their current positions, which might change based on removal and
restoration.

```javascript
const { LinearRing } = require('zipscene-geo-utils');

let ring = new LinearRing([
	[ 0, 0 ],
	[ 0, 4 ],
	[ 4, 4 ],
	[ 4, 0 ],
	[ 0, 0 ] // repeated start point is optional.
]);

console.log(ring.calculateArea());
// 16

// Remove the top right corner.
let corner = ring.vertices[2];
corner.remove();

console.log(ring.calculateArea());
// 8

// Restore the top right corner.
corner.restore();

console.log(ring.calculateArea());
// 16
```
**Note:** For efficiency, removed vertices maintain references to the neighbors
they had at the time they were removed. These references are used in the
restoration process. As a result, **restored vertices must be restored in the
same order they were removed.**


## Polygon
Another subtype of `Geometry`, this class represents a collection of linear
rings, the first being the outer ring of the polygon, and the other being inner
holes.

```javascript
const { Polygon } = reqiure('zipscene-geo-utils');

let polygon = new Polygon([
	[
		[ 0, 0 ],
		[ 0, 4 ],
		[ 4, 4 ],
		[ 4, 0 ],
		[ 0, 0 ]  // repeated start point is optional.
	],
	[
		[ 1, 1 ],
		[ 1, 3 ],
		[ 3, 3 ],
		[ 3, 1 ],
		[ 1, 1 ]  // repeated start point is optional.
	]
]);

polygon.rings[0].vertices[2].remove();

console.log(polygon.toGeoJson());
// [
// 	[
// 		[0, 0],
// 		[0, 4],
// 		[4, 0],
// 		[0, 0]
// 	],
// 	[
// 		[1, 1],
// 		[1, 3],
// 		[3, 3],
// 		[3, 1],
// 		[1, 1]
// 	]
// ]
```


## MultiPolygon
Yet another subtype of `Geometry`, this class represents a collection of
disconnected polygons, each with a series of rings as described under
`LinearRing` above.

```javascript
const { MultiPolygon } = require('zipscene-geo-utils');

let multiPolygon = new MultiPolygon([
	[
		[
			[ 0, 0 ],
			[ 0, 4 ],
			[ 4, 4 ],
			[ 4, 0 ],
			[ 0, 0 ]  // repeated start point is optional
		],
		[
			[ 1, 1 ],
			[ 1, 3 ],
			[ 3, 3 ],
			[ 3, 1 ],
			[ 1, 1 ]  // repeated start point is optional
		]
	],
	[
		[
			[ 1.5, 1.5 ],
			[ 1.5, 2.5 ],
			[ 2.5, 2.5 ],
			[ 2.5, 1.5 ],
			[ 1.5, 1.5 ] // repeated start point is optional
		]
	]
]);

multiPolygon.polygons[0].rings[1].vertices[2].remove();

console.log(JSON.stringify(multiPolygon.toGeoJson()));
// [
// 	[
// 		[
// 			[0, 0],
// 			[0, 4],
// 			[4, 4],
// 			[4, 0],
// 			[0, 0]
// 		],
// 		[
// 			[1, 1],
// 			[1, 3],
// 			[3, 1],
// 			[1, 1]
// 		]
// 	],
// 	[
// 		[
// 			[1.5, 1.5],
// 			[1.5, 2.5],
// 			[2.5, 2.5],
// 			[2.5, 1.5],
// 			[1.5, 1.5]
// 		]
// 	]
// ]
```
