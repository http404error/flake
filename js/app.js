"use strict";
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
	var MAX_RADIUS = 6;
	var BRANCH_MIN_PHI = Math.PI / 12;
	var BRANCH_RANGE_PHI = Math.PI / 3;
	var DOUBLEEND_MIN_PHI = Math.PI / 12;
	var DOUBLEEND_RANGE_PHI = Math.PI / 3;
	var BRANCH_EXTRA_DEGREES = 2;
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
var branchOnlyChance = 5/100;
var baseBranchChance = 20/100;


//Get the ball rolling
window.onload = init;

function init() {
	var canvas = document.getElementById("c");
	ctx = canvas.getContext("2d");

	for (var x = 100; x <= 700; x += 200) {
		for (var y = 100; y <= 500; y += 200) {
			gbListSnowflakes.push(initSnowflake(x, y, 0, 0, 0, Math.random() * 1.5 + 0.5));
		}
	}

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
sumPolarVectors()
	Sums two objects of the form {r: radius in pixels, th: angle in radians}
	a: the first object
	b: the second object
*/
function sumPolarVectors(a, b) {
	var total_x = (a.r * Math.cos(a.th)) + (b.r * Math.cos(b.th));
	var total_y = (a.r * Math.sin(a.th)) + (b.r * Math.sin(b.th));
	var radius = Math.sqrt(total_x * total_x + total_y * total_y);
	var angle = Math.atan2(total_y, total_x);
	return {r: radius, th: angle};
}

/*
Snowflake Object
	pos.x/pos.y are in pixels (from upper left)
	pos.th is in radians (in standard position)
	vel is delta pos PER SECOND
*/
function initSnowflake(x_pos, y_pos, th_pos, x_vel, y_vel, th_vel) {
	var snowflake = {
		pos: {x: x_pos, y: y_pos, th: th_pos},
		vel: {x: x_vel, y: y_vel, th: th_vel},
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
				this.children[i].draw();
			}
		},
		str: function() {
			var s = "";
			s += "pos: (" + this.pos.x + ", " + this.pos.y + ", " + this.pos.th + ")\n";
			s += "vel: (" + this.vel.x + ", " + this.vel.y + ", " + this.vel.th + ")\n";
			s += this.children[0].str(0);
			return s;
		}
	};

	//choose a random STARTER type and make the first child
	snowflake.children[0] = initFlake(getRandomStarter(), 0, 0);
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
	pos: base coordinate position and rotation
	offset: intended to be constant, defined on creation or immediately afterwards
		r: distance from the parent flake (the center for first children)
		th: rotation from the parent's orientation (0 for first children)
		ph: rotation about the point defined by r and th
	degree: number of flakes from the center, with branches getting extra in order to end sooner
*/
function initFlake(flake_type, offset_angle, degree) {
	var child_offset, rand, do_branch, do_stem;
	var flake = {
		type: flake_type,
		pos: {x: 0, y: 0, th: 0},
		offset: offset_angle,
		children: [],
		tick: function(origin_pos) {
			this.pos.x = origin_pos.x;
			this.pos.y = origin_pos.y;
			this.pos.th = origin_pos.th + this.offset;
			var tip_pos = {};
			tip_pos.x = this.pos.x + this.type.radius * Math.cos(this.pos.th);
			tip_pos.y = this.pos.y + this.type.radius * Math.sin(this.pos.th);
			tip_pos.th = this.pos.th;
			for (var i = 0; i < this.children.length; i++) {
				this.children[i].tick(tip_pos);
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
				this.children[i].draw();
			}
		},
		str: function(degree) {
			var ind = "";
			for (var i = 0; i < degree; i++) {
				ind += "  ";
			}
			var s = "";
			s += ind + "type: " + this.type.name + "\n";
			s += ind + "offset: " + this.offset + "\n";
			for (var i = 0; i < this.children.length; i++) {
				s += this.children[i].str(degree + 1);
			}
			return s;
		}
	};

	//the end is the end
	if (flake.type.role == "ender") {
		return flake;
	}

	if (degree >= MAX_RADIUS || (degree >= MIN_RADIUS && Math.random() < earlyEndChance)) { //place an ender
		if (Math.random() < doubleEnderChance) {
			child_offset = Math.random() * DOUBLEEND_RANGE_PHI + DOUBLEEND_MIN_PHI;
			var tip = initFlake(getRandomEnder(), child_offset, degree + 2);
			var tip2 = cloneFlake(tip, 0);
			tip2.offset *= -1;
			flake.children.push(tip);
			flake.children.push(tip2);
		} else {
			flake.children.push(initFlake(getRandomEnder(), 0, degree + 1));
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
			child_offset = Math.random() * BRANCH_RANGE_PHI + BRANCH_MIN_PHI;
			var branch = initFlake(getRandomLinker(), child_offset, degree + 1 + BRANCH_EXTRA_DEGREES);
			flake.children.push(branch);
			var mirror = cloneFlake(branch, 0);
			mirror.offset *= -1;
			flake.children.push(mirror);
		}
		if (do_stem) {
			flake.children.push(initFlake(getRandomLinker(), 0, degree + 1));
		}
	}

	return flake;
}

/*
cloneFlake Function
	original: Flake Object to copy
	rotation: angle to rotate by in radians
	returns the copied flake
*/
function cloneFlake(original, /*optional*/ rotation) {
	var rot = 0;
	if (typeof rotation != "undefined") {
		rot = rotation;
	}
	var copy = {
		type: original.type, //it was a reference to begin with
		pos: {x: 0, y: 0, th: 0}, //this will update on tick()
		offset: original.offset + rot,
		children: [], //we'll get to this in a moment
		tick: original.tick,
		draw: original.draw,
		str: original.str
	};

	for (var i = 0; i < original.children.length; i++) {
		copy.children[i] = cloneFlake(original.children[i], 0);
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
