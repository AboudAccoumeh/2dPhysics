/* Immutable 2D vector. Screen coordinates: x right, y down. */
class Vec2 {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}
	add(v) {
		return new Vec2(this.x + v.x, this.y + v.y);
	}
	subtract(v) {
		return new Vec2(this.x - v.x, this.y - v.y);
	}
	scale(n) {
		return new Vec2(this.x * n, this.y * n);
	}
	dot(v) {
		return this.x * v.x + this.y * v.y;
	}
	cross(v) {
		return this.x * v.y - this.y * v.x;
	}
	//perpendicular vector: angularVelocity * perp() is the velocity of this arm
	perp() {
		return new Vec2(-this.y, this.x);
	}
	length() {
		return Math.sqrt(this.dot(this));
	}
	normalize() {
		const len = this.length();
		return len > 0 ? this.scale(1 / len) : new Vec2();
	}
	//rotate around the origin, positive angle turns x toward y
	rotate(angle) {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
	}
}
