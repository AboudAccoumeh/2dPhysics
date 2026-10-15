/*
 * Collision detection. collide(a, b) returns null or a contact:
 * { normal: unit vector from a to b, depth: overlap, point: deepest point of b inside a }
 */
const CONTACT_SLOP = 0.25;//a point this close above a face still touches, so a flat polygon gets a centered contact

function collide(a, b) {
	if (a.shape === "circle" && b.shape === "circle") {
		return circleCircle(a, b);
	}
	if (a.shape === "polygon" && b.shape === "polygon") {
		return polygonPolygon(a, b);
	}
	if (a.shape === "polygon") {
		return polygonCircle(a, b);
	}
	return flip(polygonCircle(b, a));
}

//swap a and b: the deepest point moves to the other surface
function flip(contact) {
	return contact && {
		normal: contact.normal.scale(-1),
		depth: contact.depth,
		point: contact.point.add(contact.normal.scale(contact.depth)),
	};
}

function circleCircle(a, b) {
	const offset = b.center.subtract(a.center);
	const distance = offset.length();
	const radii = a.radius + b.radius;
	if (distance > radii) {
		return null;
	}
	const normal = distance > 0 ? offset.scale(1 / distance) : new Vec2(0, -1);
	return { normal, depth: radii - distance, point: b.center.subtract(normal.scale(b.radius)) };
}

function polygonCircle(poly, circle) {
	//face with the largest separation from the circle center
	let best = { separation: -Infinity, index: 0 };
	poly.normals.forEach((n, i) => {
		const separation = circle.center.subtract(poly.vertices[i]).dot(n);
		if (separation > best.separation) {
			best = { separation, index: i };
		}
	});
	if (best.separation > circle.radius) {
		return null;
	}
	const v1 = poly.vertices[best.index];
	const v2 = poly.vertices[(best.index + 1) % poly.vertices.length];
	let normal = poly.normals[best.index];
	let distance = best.separation;
	//outside, near a corner: the closest feature is the vertex, not the face
	if (best.separation > 0) {
		const corner = circle.center.subtract(v1).dot(v2.subtract(v1)) < 0 ? v1
			: circle.center.subtract(v2).dot(v1.subtract(v2)) < 0 ? v2 : null;
		if (corner) {
			const offset = circle.center.subtract(corner);
			distance = offset.length();
			if (distance > circle.radius) {
				return null;
			}
			normal = offset.normalize();
		}
	}
	return { normal, depth: circle.radius - distance, point: circle.center.subtract(normal.scale(circle.radius)) };
}

function polygonPolygon(a, b) {
	const faceA = leastPenetrationFace(a, b);
	if (!faceA) {
		return null;
	}
	const faceB = leastPenetrationFace(b, a);
	if (!faceB) {
		return null;
	}
	//the face with the shorter penetration is the reference face
	if (faceA.depth < faceB.depth) {
		return { normal: faceA.normal, depth: faceA.depth, point: contactPoint(faceA, b) };
	}
	//contactPoint is on a here, move it to b's surface
	const point = contactPoint(faceB, a).add(faceB.normal.scale(faceB.depth));
	return { normal: faceB.normal.scale(-1), depth: faceB.depth, point };
}

//separating axis test over the faces of poly, null when other is outside one of them
function leastPenetrationFace(poly, other) {
	let best = null;
	for (let i = 0; i < poly.normals.length; i++) {
		const normal = poly.normals[i];
		const v1 = poly.vertices[i];
		const depth = -Math.min(...other.vertices.map((v) => v.subtract(v1).dot(normal)));
		if (depth < 0) {
			return null;
		}
		if (!best || depth < best.depth) {
			best = { depth, normal, v1, v2: poly.vertices[(i + 1) % poly.vertices.length] };
		}
	}
	return best;
}

//one deepest vertex as contact gives a resting polygon a false torque,
//so clip the incident edge to the reference face and average its touching points
function contactPoint(face, incidentPoly) {
	const n = face.normal;
	const { vertices: incidentVertices, normals } = incidentPoly;
	//incident edge: the edge that faces most against the reference normal
	let incident = 0;
	normals.forEach((m, i) => {
		if (m.dot(n) < normals[incident].dot(n)) {
			incident = i;
		}
	});
	const tangent = face.v2.subtract(face.v1).normalize();
	let points = [incidentVertices[incident], incidentVertices[(incident + 1) % incidentVertices.length]];
	points = clip(points, tangent, face.v1.dot(tangent));
	points = clip(points, tangent.scale(-1), -face.v2.dot(tangent));
	points = points.filter((p) => face.v1.subtract(p).dot(n) > -CONTACT_SLOP);
	if (points.length === 0) {
		//fallback: the deepest vertex
		return incidentVertices.reduce((deepest, v) => (v.dot(n) < deepest.dot(n) ? v : deepest));
	}
	return points.reduce((sum, p) => sum.add(p)).scale(1 / points.length);
}

//keep the part of the segment where p.dot(dir) >= offset
function clip(points, dir, offset) {
	const d = points.map((p) => p.dot(dir) - offset);
	const out = points.filter((p, i) => d[i] >= 0);
	if (points.length === 2 && d[0] * d[1] < 0) {
		out.push(points[0].add(points[1].subtract(points[0]).scale(d[0] / (d[0] - d[1]))));
	}
	return out;
}
