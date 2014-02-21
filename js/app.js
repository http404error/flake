/*
FLAKE - a game
	for a wintery day
	of a wintery day
	and by a wintery day

Benjamin Arvey
Elisabeth Arvey
*/

//CONSTANTS
	//WINDOW AND RENDERING
	var FRAME_DELAY = 20;
	var FRAME_RATE = 1000 / FRAME_DELAY;
	var WIDTH = 800;
	var HEIGHT = 600;

	//DRAW INFO
	var BG_COLOR = "#120040";
	var ICE_COLOR = "#FFFFFF";

	//SNOWFLAKE PARAMETERS
	var NUM_POINTS = 6;
	var MIN_RADIUS = 2; //note that the first spokes are 0
	var MAX_RADIUS = 10;
	var FLAKE_TYPES = {
		STARTER: [
			{role: "starter", name: "diamond_s", radius: 18, vertices: [{x:0, y:0}, {x:10, y:-3}, {x:20, y:0}, {x:10, y:3}]},
			{role: "starter", name: "hex_s", radius: 18, vertices: [{x:0, y:0}, {x:15, y:-5*Math.sqrt(3)}, {x:20, y:0}, {x:15, y:5*Math.sqrt(3)}]},
			{role: "starter", name: "point_s", radius: 15, vertices: [{x:0, y:0}, {x:0, y:-2}, {x:25, y:0}, {x:0, y:2}]},
			{role: "starter", name: "chevron_s", radius: 15, vertices: [{x:0, y:0}, {x:20, y:-5}, {x:15, y:0}, {x:20, y:5}]},
		],
		LINKER: [
			{role: "linker", name: "diamond_l", radius: 9, vertices: [{x:0, y:0}, {x:5, y:-3}, {x:10, y:0}, {x:5, y:3}]},
			{role: "linker", name: "hex_l", radius: 8, vertices: [{x:0, y:0}, {x:2.5, y:-4}, {x:7.5, y:-4}, {x:10, y:0}, {x:7.5, y:4}, {x:2.5, y:4}]},
			{role: "linker", name: "point_l", radius: 10, vertices: [{x:0, y:0}, {x:2, y:-2}, {x:15, y:0}, {x:2, y:2}]},
			{role: "linker", name: "chevron_l", radius: 10, vertices: [{x:0, y:0}, {x:15, y:-3}, {x:10, y:0}, {x:15, y:3}]},
			{role: "linker", name: "bar_l", radius: 12, vertices: [{x:0, y:0}, {x:2, y:-2}, {x:13, y:-2}, {x:15, y:0}, {x:13, y:2}, {x:2, y:2}]},
		],
		ENDER: [
			{role: "ender", name: "diamond_e", vertices: [{x:0, y:0}, {x:10, y:-3}, {x:20, y:0}, {x:10, y:3}]}
		]
	};

//GLOBALS
var ctx;
var gbListSnowflakes = [];
var earlyEndChance = 15/100;
var doubleEnderChance = 20/100;
var branchOnlyChance = 10/100;
var baseBranchChance = 30/100;


//Get the ball rolling
window.onload = init;

function init() {
	var canvas = document.getElementById("c");
	ctx = canvas.getContext("2d");

	gbListSnowflakes.push(initSnowflake(400, 300, 1));

	setInterval(tick, FRAME_DELAY);
}

function tick() {
	//generate new snowflakes

	//call tick on each snowflake
	for (var i = 0; i < gbListSnowflakes.length; i++) {
		gbListSnowflakes[i].tick();
	}

	//call draw event
	draw();
}

function draw() {
	//background
	ctx.fillStyle = BG_COLOR;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);

	//snowflakes
	ctx.fillStyle = ICE_COLOR;
	for (var i = 0; i < gbListSnowflakes.length; i++) {
		gbListSnowflakes[i].draw(ctx);
	}
}

/*
drawPoly
	vertices: an array of point objects [{x,y}]
*/
function drawPoly(vertices) {
	ctx.beginPath();
	ctx.moveTo(vertices[0].x, vertices[0].y);
	for (var i = 1; i < vertices.length; i++) {
		ctx.lineTo(vertices[i].x, vertices[i].y);
	}
	ctx.closePath();
	ctx.fill();
}

/*
rotatePointCCW
	Rotates a point counter-clockwise about the origin
	p: point to rotate {x,y}
	th: radians to rotate by
	return: rotated point {x,y};
*/
function rotatePointCCW(p, th) {
	var output = {};
	output.x = Math.cos(th) * p.x - Math.sin(th) * p.y;
	output.y = Math.sin(th) * p.x + Math.cos(th) * p.y;
	return output;
}

/*
rotateArrayCCW
	Rotates an array of points counter-clockwise about the origin
	points: an array of points to rotate [{x,y}]
	th: rotation in radians
	return: an array of rotated points [{x,y}]
*/
function rotateArrayCCW(points, th) {
	var output = [];
	for (var i = 0; i < points.length; i++) {
		output.push(rotatePointCCW(points[i], th));
	}
	return output;
}

/*
Snowflake Object
	pos.x/pos.y are in pixels (from upper left)
	pos.th is in radians (in standard position)
	vel is delta pos PER SECOND
*/
function initSnowflake(x_pos, y_pos, th_vel) {
	var snowflake = {
		pos: {x: x_pos, y: y_pos, th: 0},
		vel: {x: 0, y: 0, th: th_vel},
		children: [],
		tick: function() {
			this.pos.x += this.vel.x / FRAME_RATE;
			this.pos.y += this.vel.y / FRAME_RATE;
			this.pos.th += this.vel.th / FRAME_RATE;
			this.pos.th %= 2 * Math.PI;
			for (var i = 0; i < this.children.length; i++) {
				this.children[i].tick(this.pos);
			}
		},
		draw: function() {
			//draw children only
			for(var i = 0; i < this.children.length; i++) {
				this.children[i].draw(this.pos);
			}
		}
	};

	//choose a random STARTER type and make the first child
	snowflake.children[0] = initFlake(getRandomStarter(), 0, 0, 0, 0);
	//initFlake generates all the various grandchildren for that particular spoke

	//copy the first child for each other point in the snowflake
	for (var i = 1; i < NUM_POINTS; i++) {
		snowflake.children[i] = cloneFlake(snowflake.children[0], i * 2 * Math.PI / NUM_POINTS);
	}

	return snowflake;
}

/*
Flake Object
	type: reference to FLAKE_TYPE object defined at the top, should be static
	offset: intended to be constant, defined on creation
		r: distance from the center of the snowflake
		th: rotation from the center
		ph: rotation about the point defined by r and th
	degree: number of flakes from the center, with branches getting extra
*/
function initFlake(flake_type, r_offset, th_offset, ph_offset, degree) {
	var inter_x, inter_y, child_r, child_th, child_ph, rand, do_branch, do_stem;
	var flake = {
		type: flake_type,
		pos: {x: 0, y: 0, th: 0},
		offset: {r: r_offset, th: th_offset, ph: ph_offset},
		children: [],
		tick: function(root_pos) {
			this.pos.th = root_pos.th + this.offset.th;
			this.pos.x = root_pos.x + (this.offset.r * Math.cos(this.pos.th));
			this.pos.y = root_pos.y + (this.offset.r * Math.sin(this.pos.th));
			this.pos.th += this.offset.ph;
			for (var i = 0; i < this.children.length; i++) {
				this.children[i].tick(root_pos);
			}
		},
		draw: function() {
			var vertices = rotateArrayCCW(this.type.vertices, this.pos.th);
			for (var i = 0; i < vertices.length; i++) {
				vertices[i].x += this.pos.x;
				vertices[i].y += this.pos.y;
			}
			drawPoly(vertices);
			for (i = 0; i < this.children.length; i++) {
				this.children[i].draw(this.pos);
			}
		}
	};

	//the end is the end
	if (flake.type.role == "ender") {
		return flake;
	}

	inter_x = (flake.offset.r * Math.cos(flake.offset.th)) + (flake.type.radius * Math.cos(flake.offset.ph));
	inter_y = (flake.offset.r * Math.sin(flake.offset.th)) + (flake.type.radius * Math.sin(flake.offset.ph));
	child_r = Math.sqrt(inter_x * inter_x + inter_y * inter_y);
	child_th = Math.atan2(inter_x, inter_y);

	if (degree >= MAX_RADIUS || (degree >= MIN_RADIUS && Math.random() < earlyEndChance)) {
		rand = Math.random();
		if (rand < doubleEnderChance) {
			child_ph = Math.random() * Math.PI / 3;
			var tip = initFlake(getRandomEnder(), child_r, child_th, child_ph, degree + 2);
			flake.children.push(tip);
			flake.children.push(cloneFlake(tip, child_ph * -2));
		} else {
			flake.children.push(initFlake(getRandomEnder(), child_r, child_th, 0, degree + 1));
		}
	} else { //continue growth
		rand = Math.random();
		do_branch = 0;
		do_stem = 0;
		if (rand < branchOnlyChance) {
			do_branch = 1;
			do_stem = 0;
		} else if (rand < branchOnlyChance + baseBranchChance) {
			do_branch = 1;
			do_stem = 1;
		} else {
			do_branch = 0;
			do_stem = 1;
		}

		if (do_branch) {
			child_ph = Math.random() * Math.PI / 2;
			var branch = initFlake(getRandomLinker(), child_r, child_th, child_ph, degree + 2);
			flake.children.push(branch);
			flake.children.push(cloneFlake(branch, child_ph * -2));
		}
		if (do_stem) {
			flake.children.push(initFlake(getRandomLinker(), child_r, child_th, 0, degree + 1));
		}
	}

	return flake;
}

function cloneFlake(original, rotation) {
	var copy = {
		type: original.type, //it was a reference to begin with
		pos: {x: 0, y: 0, th: 0}, //this will update on tick()
		offset: {r: original.offset.r, th: original.offset.th + rotation, ph: original.offset.ph},
		children: [],
		tick: original.tick,
		draw: original.draw
	};
	
	for (var i = 0; i < original.children.length; i++) {
		copy.children[i] = cloneFlake(original.children[i], rotation);
	}
	
	return copy;
}

function getRandomStarter() {
	return FLAKE_TYPES.STARTER[Math.floor(Math.random() * FLAKE_TYPES.STARTER.length)];
}

function getRandomLinker() {
	return FLAKE_TYPES.LINKER[Math.floor(Math.random() * FLAKE_TYPES.LINKER.length)];
}

function getRandomEnder() {
	return FLAKE_TYPES.ENDER[Math.floor(Math.random() * FLAKE_TYPES.ENDER.length)];
}