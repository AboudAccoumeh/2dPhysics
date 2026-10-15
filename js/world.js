/* Holds the bodies and advances the simulation. */
class World {
	constructor(gravity) {
		this.gravity = gravity;
		this.bodies = [];
		this.contacts = [];//contacts of the last step, for drawing
		this.iterations = 5;
		this.positionCorrection = 0.8;//fraction of the overlap removed per iteration
	}
	add(body) {
		this.bodies.push(body);
		return body;
	}
	step(dt) {
		this.bodies.forEach((body) => {
			if (!body.isStatic) {
				body.integrate(dt, this.gravity);
			}
		});
		this.contacts = [];
		for (let k = 0; k < this.iterations; k++) {
			this.forEachPair((a, b) => {
				const contact = collide(a, b);
				if (!contact) {
					return;
				}
				if (k === 0) {
					this.contacts.push(contact);
				}
				this.separate(a, b, contact);
				this.resolve(a, b, contact);
			});
		}
	}
	forEachPair(callback) {
		for (let i = 0; i < this.bodies.length; i++) {
			for (let j = i + 1; j < this.bodies.length; j++) {
				const a = this.bodies[i];
				const b = this.bodies[j];
				if (!(a.isStatic && b.isStatic)) {
					callback(a, b);
				}
			}
		}
	}
	//push the bodies apart, the lighter body moves more
	separate(a, b, { normal, depth }) {
		const correction = normal.scale(depth * this.positionCorrection / (a.invMass + b.invMass));
		a.translate(correction.scale(-a.invMass));
		b.translate(correction.scale(b.invMass));
	}
	//impulse at the contact point changes linear and angular velocity together
	//reference: http://www.myphysicslab.com/collision.html
	resolve(a, b, { normal, depth, point: pointOnB }) {
		//between the two surfaces, nearer the lighter body
		const point = pointOnB.add(normal.scale(depth * a.invMass / (a.invMass + b.invMass)));
		const relativeVelocity = b.velocityAt(point).subtract(a.velocityAt(point));
		const normalSpeed = relativeVelocity.dot(normal);
		if (normalSpeed > 0) {
			return;//moving apart
		}
		const restitution = Math.min(a.restitution, b.restitution);
		const friction = Math.min(a.friction, b.friction);
		const normalImpulse = -(1 + restitution) * normalSpeed / effectiveInvMass(a, b, point, normal);
		applyPairImpulse(a, b, normal.scale(normalImpulse), point);
		//friction is against the sliding direction and at most friction * normal impulse
		const tangent = relativeVelocity.subtract(normal.scale(normalSpeed)).normalize();
		const tangentImpulse = Math.max(
			-relativeVelocity.dot(tangent) / effectiveInvMass(a, b, point, tangent),
			-friction * normalImpulse
		);
		applyPairImpulse(a, b, tangent.scale(tangentImpulse), point);
	}
}

function effectiveInvMass(a, b, point, direction) {
	const armA = point.subtract(a.center).cross(direction);
	const armB = point.subtract(b.center).cross(direction);
	return a.invMass + b.invMass + armA * armA * a.invInertia + armB * armB * b.invInertia;
}

//impulse is from a to b
function applyPairImpulse(a, b, impulse, point) {
	a.applyImpulse(impulse.scale(-1), point);
	b.applyImpulse(impulse, point);
}
