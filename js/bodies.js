/* Rigid bodies. A mass of Infinity makes a static body. */
class RigidBody {
	constructor(center, { mass = 1, velocity = new Vec2(), restitution = 0.5, friction = 0.3, damping = 1 } = {}) {
		this.center = center;
		this.velocity = velocity;
		this.angle = 0;
		this.angularVelocity = 0;
		this.invMass = 1 / mass;
		this.invInertia = 0;//set by the shape
		this.restitution = restitution;
		this.friction = friction;
		this.damping = damping;//fraction of velocity kept per second
	}
	get isStatic() {
		return this.invMass === 0;
	}
	translate(offset) {
		this.center = this.center.add(offset);
	}
	rotate(angle) {
		this.angle += angle;
	}
	velocityAt(point) {
		const arm = point.subtract(this.center);
		return this.velocity.add(arm.perp().scale(this.angularVelocity));
	}
	applyImpulse(impulse, point) {
		const arm = point.subtract(this.center);
		this.velocity = this.velocity.add(impulse.scale(this.invMass));
		this.angularVelocity += arm.cross(impulse) * this.invInertia;
	}
	integrate(dt, gravity) {
		this.translate(this.velocity.scale(dt));
		this.rotate(this.angularVelocity * dt);
		const keep = Math.pow(this.damping, dt);
		this.velocity = this.velocity.add(gravity.scale(dt)).scale(keep);
		this.angularVelocity *= keep;
	}
}

class Circle extends RigidBody {
	constructor(center, radius, options) {
		super(center, options);
		this.shape = "circle";
		this.radius = radius;
		this.invInertia = 2 * this.invMass / (radius * radius);//I = m*r^2/2
	}
}

/* Convex polygon. Give the vertices in clockwise order on screen. */
class Polygon extends RigidBody {
	constructor(vertices, options) {
		const { centroid, inertiaPerMass } = Polygon.massProperties(vertices);
		super(centroid, options);
		this.shape = "polygon";
		this.localVertices = vertices.map((v) => v.subtract(centroid));
		this.invInertia = this.invMass / inertiaPerMass;
		this.updateVertices();
	}
	static box(center, width, height, options) {
		const w = width / 2;
		const h = height / 2;
		return new Polygon([
			new Vec2(center.x - w, center.y - h),
			new Vec2(center.x + w, center.y - h),
			new Vec2(center.x + w, center.y + h),
			new Vec2(center.x - w, center.y + h),
		], options);
	}
	//triangle, pentagon, hexagon...: vertices on a circle, clockwise on screen
	static regular(center, radius, sides, options) {
		const vertices = [];
		for (let i = 0; i < sides; i++) {
			vertices.push(center.add(new Vec2(radius, 0).rotate(2 * Math.PI * i / sides)));
		}
		return new Polygon(vertices, options);
	}
	//area centroid and inertia/mass of a convex polygon, from its triangle fan
	static massProperties(vertices) {
		let area2 = 0;
		let sum = new Vec2();
		forEachEdge(vertices, (a, b) => {
			const cross = a.cross(b);
			area2 += cross;
			sum = sum.add(a.add(b).scale(cross));
		});
		const centroid = sum.scale(1 / (3 * area2));
		let num = 0;
		let den = 0;
		forEachEdge(vertices, (a, b) => {
			const ca = a.subtract(centroid);
			const cb = b.subtract(centroid);
			const cross = Math.abs(ca.cross(cb));
			num += cross * (ca.dot(ca) + ca.dot(cb) + cb.dot(cb));
			den += cross;
		});
		return { centroid, inertiaPerMass: num / (6 * den) };
	}
	translate(offset) {
		super.translate(offset);
		this.updateVertices();
	}
	rotate(angle) {
		super.rotate(angle);
		this.updateVertices();
	}
	updateVertices() {
		this.vertices = this.localVertices.map((v) => v.rotate(this.angle).add(this.center));
		this.normals = [];
		forEachEdge(this.vertices, (a, b) => {
			const edge = b.subtract(a).normalize();
			this.normals.push(new Vec2(edge.y, -edge.x));//outward for clockwise order
		});
	}
}

function forEachEdge(vertices, callback) {
	for (let i = 0; i < vertices.length; i++) {
		callback(vertices[i], vertices[(i + 1) % vertices.length], i);
	}
}
