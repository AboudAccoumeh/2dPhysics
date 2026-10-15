/* Demo: drops balls and boxes on a ground block. The sliders change all bodies live. */
const canvas = document.getElementById("canvas");
canvas.width = canvas.height = 350;
const renderer = new Renderer(canvas.getContext("2d"));
const world = new World(new Vec2(0, 200));

const settings = { friction: 0, restitution: 0 };
bindSlider("friction", (value) => (settings.friction = value));
bindSlider("restitution", (value) => (settings.restitution = value));

world.add(Polygon.box(new Vec2(175, 340), 310, 120, { mass: Infinity, ...settings }));

let spawnBox = false;
setInterval(() => {
	const position = new Vec2(10 + Math.random() * (canvas.width - 20), 100);
	const size = 5 + Math.random() * 20;
	const options = { mass: size / 2, ...settings };
	const body = spawnBox
		? Polygon.box(position, 2 * size, 2 * size, options)
		: new Circle(position, size, options);
	if (spawnBox) {
		body.rotate(Math.random() * Math.PI);
	}
	world.add(body);
	spawnBox = !spawnBox;
}, 600);

//shows the value next to the slider and copies it to every body
function bindSlider(property, onChange) {
	const slider = document.getElementById(property);
	const output = document.getElementById(property + "-value");
	const update = () => {
		const value = Number(slider.value);
		output.textContent = value.toFixed(2);
		onChange(value);
		world.bodies.forEach((body) => (body[property] = value));
	};
	slider.addEventListener("input", update);
	update();
}

let lastFrameTime = performance.now();
function animate(time) {
	//clamp so a hidden tab does not make bodies jump through each other
	const dt = Math.min((time - lastFrameTime) / 1000, 1 / 30);
	lastFrameTime = time;
	world.step(dt);
	world.bodies = world.bodies.filter((body) => body.center.y < canvas.height + 150);//drop bodies that fell off
	renderer.draw(world);
	requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
