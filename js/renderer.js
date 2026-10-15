/* Draws a World on a 2D canvas. */
class Renderer {
	constructor(ctx) {
		this.ctx = ctx;
	}
	draw(world) {
		const { ctx } = this;
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.strokeStyle = "black";
		ctx.lineWidth = 1;
		world.bodies.forEach((body) => (body.shape === "circle" ? this.drawCircle(body) : this.drawPolygon(body)));
		world.contacts.forEach((contact) => this.drawContact(contact));
	}
	drawCircle({ center, radius, angle }) {
		const { ctx } = this;
		ctx.beginPath();
		ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
		//radius line shows the rotation
		ctx.moveTo(center.x, center.y);
		ctx.lineTo(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));
		ctx.stroke();
	}
	drawPolygon({ vertices }) {
		const { ctx } = this;
		ctx.beginPath();
		vertices.forEach((v) => ctx.lineTo(v.x, v.y));
		ctx.closePath();
		ctx.stroke();
	}
	//red line along the contact normal, as long as the overlap
	drawContact({ point, normal, depth }) {
		const { ctx } = this;
		const end = point.add(normal.scale(depth));
		ctx.save();
		ctx.strokeStyle = "rgb(255,100,100)";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(point.x, point.y);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();
		ctx.restore();
	}
}
