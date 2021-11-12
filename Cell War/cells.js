const gameStart = document.querySelector(".game_start");	// game start screen
const gameOver = document.querySelector(".game_over"); 		// game over screen
const startButton= document.querySelector(".game_start > button"); // start button
const replayButton= document.querySelector(".game_over > button"); // replay button
const scoreBoard = document.getElementById( "score_board" ); 	// score board
const scoreNum = document.getElementById( "score" ); 	// number of score
const loading = document.querySelector( ".loading" ); 	// loading screen

// state of cancers
const GROWING = 0;
const ADJUSTING = 1;
const DEAD = 2;

var num_cancer = 0; 	// the number of remaining cancer cell
var win = false; 		// bool variable to determine win/loss
var over = false; 		// bool variable to terminate the game
var handle = 0; 		// used to terminate the animation
var score = 0; 			// score

var maxMapSize = 300;
var minMapSize = -300;

var canvas;
var renderer;
var scene;
var camera;
var light;
var loader;
var controls;

let speed = 0.3; // Speed of rotating the camera
let distance = 3; // Speed of moving 
let vector = new THREE.Vector3(); // Vector of direction the camera's facing
let direction = new THREE.Vector3(); // Vector of direction the camera's facing with distance
let rightDir = new THREE.Vector3(1, 0, 0); // Direction of x-axis

let left = 65, right = 68 // LEFT: "A" RIGHT: "D"
let up = 87, down = 83; // UP: "W" DOWN: "S"

let cell; // immune cell

var cancerIndex = 0;	// total number of cancers (including dead cancers)
var cancerList = [];	// list of cancer cell variables

var bloodCellIndex = 0;	// total number of blood cells (including dead blood cells)
var bloodCellList = [];	// list of cancer cell variables
var totalNumOfBloodCells = 100;	// number of alive blood cells (no dead blood cells)

// list for storing variables required to interrupt the setInterval() function at the end of the game
var intervalVariables = [];

window.onload = function showGameStart(){
	gameStart.style.display = "flex"
}

// An object to hold all the things needed for our loading screen
var loadingScreen = {
	scene: new THREE.Scene(),
	camera: new THREE.PerspectiveCamera(90, 1280/720, 0.1, 100),
	box: new THREE.Mesh(
		new THREE.BoxGeometry(0.5,0.5,0.5),
		new THREE.MeshBasicMaterial({ color:0x4444ff })
	)
};
var loadingManager = null;
var RESOURCES_LOADED = false;

function init(){
	canvas = document.getElementById( "gl-canvas" );
	canvas.width = window.innerWidth; 
	canvas.height = window.innerHeight;

	// about lock
	canvas.requestPointerLock = canvas.requestPointerLock ||
                            	canvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock ||
                        		document.mozExitPointerLock;

	// when game starts, window is locked
	if (document.pointerLockElement === canvas ||
			document.mozPointerLockElement === canvas) {
		console.log('The pointer lock status is now unlocked');
	} else {
		canvas.requestPointerLock();
		console.log('The pointer lock status is now locked');
	}

	// if user clicks canvas, window is locked
	canvas.onclick = function() {
  		canvas.requestPointerLock();
	};

	renderer = new THREE.WebGLRenderer({canvas, alpha: true});
	renderer.setSize(canvas.width, canvas.height);

	// Create a loading manager to set RESOURCES_LOADED when appropriate.
	// Pass loadingManager to all resource loaders.
	loadingManager = new THREE.LoadingManager();
	
	loadingManager.onProgress = function(item, loaded, total){
		console.log(item, loaded, total);
	};
	
	loadingManager.onLoad = function(){
		console.log("All resources loaded");
		RESOURCES_LOADED = true;
	};

	scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');  // background color

	//3D background texture
	const tloader = new THREE.TextureLoader(loadingManager);
    const texture = tloader.load('galaxy1.jpg', () => {
		const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
        rt.fromEquirectangularTexture(renderer, texture);
        scene.background = rt.texture;
    });
	texture.minFilter = THREE.LinearFilter; // texture resizing

	camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
	camera.rotation.y = 45 / 180 * Math.PI;
	camera.position.x = 150;
	camera.position.y = 0;
	camera.position.z = 50;

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.rotateSpeed = speed;
	controls.enablePan = false;

	light = new THREE.PointLight(0xA9A9A9,10);
	light.position.set(0,3000,5000);
	scene.add(light);

	window.addEventListener("keydown", keyCodeOn, false); // Get the keystroke.
	scoreNum.innerHTML = score;	// show score in game dispaly

	loader = new THREE.GLTFLoader(loadingManager);

	// load gltf model of immune cell (user)
    loadImmuneCell();
	
	// load gltf model of blood cell (food)
	loadBloodCell();

	// load gltf model of cancer (enemy)
	loadRootCancer();
	
	var interval = setInterval(updateCancersState, 1000);	// every second, update status and point of cancers
	intervalVariables.push(interval);

	interval = setInterval(changeCancersDirection, 500);	// every 0.5 seconds, adjust direction of cancers
	intervalVariables.push(interval);

	interval = setInterval(increaseCancersScale, 100);	// every 0.1 seconds, increase scale of cancers
	intervalVariables.push(interval);

	interval = setInterval(moveCancers, 100);	// every 0.1 seconds, move cancers
	intervalVariables.push(interval);

	interval = setInterval(detectCollision, 200);	// every 0.2 seconds, detect collision
	intervalVariables.push(interval);

	animate();
}

// rendering
function animate() {
	// This block runs while resources are loading.
	if( RESOURCES_LOADED == false ){
		requestAnimationFrame(animate);
		loading.style.display = "flex";
		return; // Stop the function here.
	}
	loading.style.display = "none";
	scoreBoard.style.display = "flex" ;

	camera.updateProjectionMatrix(); // Update camera position
	renderer.render(scene, camera);
	handle = requestAnimationFrame(animate);
}


/**** immune cell ****/
// function that load gltf model of immune cell and create user objet
function loadImmuneCell() {
   loader.load('./lympocyte/scene.gltf', function(gltf) {
       cell = gltf.scene.children[0];
	   cell.position.set(0, 0, 0);  
	   cell.scale.set(5, 5, 5);
	   cell.point = 0;
       scene.add(cell);
	   controls.target.set(cell.position.x, cell.position.y, cell.position.z); // Focus the camera to the cell
   }, undefined, function (error) {
       console.error(error);
   });
}

// Function that enables user controlling
function keyCodeOn(e) {
	direction = camera.getWorldDirection(vector).multiplyScalar(distance); // Get the direction vector
	
	// Left and right movement along the direction that the camera is facing.
	if (e.keyCode == left) {
		direction.copy(rightDir).transformDirection(camera.matrixWorld).multiplyScalar(distance).negate();
		cell.position.add(direction);
		camera.position.add(direction);
	}
	else if (e.keyCode == right) {
		direction.copy(rightDir).transformDirection(camera.matrixWorld).multiplyScalar(distance);
		cell.position.add(direction);
		camera.position.add(direction);
	}
	// Go forward and backward in the direction that the camera is facing.
	else if (e.keyCode == up) {
		cell.position.add(direction);
		camera.position.add(direction);
	}
	else if (e.keyCode == down) {
		direction = direction.negate();
		cell.position.add(direction);
		camera.position.add(direction);
	}

	// Keep looking at the user cell on the center
	controls.target.set(cell.position.x, cell.position.y, cell.position.z);
}


/**** canecr ****/
// function that load gltf model of cancer and create root cancer objet
function loadRootCancer() {

	loader.load('./cancer_model/scene.gltf', function(gltf){
		var cancer = gltf.scene.children[0];
		cancer.index = cancerIndex;
		cancer.point = 1;
		cancer.scale.set(3, 3, 3);
		cancer.state = GROWING;

		var rv1 = Math.round(Math.random() * (400) -200);
		var rv2 = Math.round(Math.random() * (400) -200);
		var rv3 = Math.round(Math.random() * (400) -200);
		cancer.position.set(rv1, rv2, rv3);
		
		var offset = getRandomOffset();
		cancer.direction = offset;

		scene.add(cancer);
		num_cancer = 1;
		cancerList[cancerIndex] = cancer;
		console.log("Mom " + cancerIndex + " is created [" + cancer.direction + "]")
		cancerIndex++;

	}, undefined, function (error) {
		  console.error(error);
	});
}

// function that determines the direction in which cancer cells move
function getRandomOffset() {
	var offset = [];

	for (var i = 0; i < 3; i++) {
		var randomValue = Math.floor(Math.random() * 3);

		// 0, 40, -40
		if (randomValue === 0)
			offset.push(0);
		else if (randomValue === 1) 
			offset.push(40);
		else
			offset.push(-40);
	}

	return offset;
}

 // function of generating baby cancer cells from mom cancer cell
function createBabyCancer(momIndex, offset) {

	// check to see if there is mom cancer cell
	var momCancer = cancerList[momIndex]
	if (!momCancer) 
		return;

	var babyCancer = momCancer.clone();

	babyCancer.index = cancerIndex;
	babyCancer.point = Math.round(Math.random() * 10 + 7);	// from 7 to 17
	var babyCancerScale = 3 + babyCancer.point * 0.1;
	babyCancer.scale.set(babyCancerScale, babyCancerScale, babyCancerScale);
	babyCancer.state = GROWING;

	babyCancer.position.x = momCancer.position.x + offset[0];
	babyCancer.position.y = momCancer.position.y + offset[1];
	babyCancer.position.z = momCancer.position.z + offset[2];

	babyCancer.direction = offset;

	scene.add(babyCancer);
	num_cancer = num_cancer + 1;
	cancerList[cancerIndex] = babyCancer;
	console.log(cancerIndex++ + " is created [" + babyCancer.direction + "]")
}

// Function to remove the scancer corresponding to the index value from the scene.
function removeCancer(i) {

	// return this function if there is nothing in the index.
	var cancer = cancerList[i];
	if (!cancer)
		return;
		
    scene.remove(cancer);				// Removed from the scene, no longer rendered.
	num_cancer = num_cancer - 1;
	cancerList[i] = undefined;
	console.log(cancer.index + " is killed");
}

// function that updates the state and points of cancer cells. Divides when points reach a certain level.
function updateCancersState() {
	for (var i = 0; i < cancerIndex; i++) {

		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// update point of caner
		if (cancer.state === GROWING) {
			cancer.point += 1;
		}

		// If it is not already dead, 
		// three baby cancer cells are created 
		// and removed when the point of the mother's cancer cells reaches 50.
		if (cancer.state !== DEAD && cancer.point === 50) {

			cancer.state = DEAD;

			// Random generation of the initial location and direction of cancer cells
			var offset1 = getRandomOffset();
			var offset2 = getRandomOffset();
			var offset3 = getRandomOffset();

			// prevent cancer cells from overlapping at first
			while (offset1 === offset2) {
				offset2 = getRandomOffset();
			}
			while (offset1 === offset3 || offset2 === offset3) {
				offset3 = getRandomOffset();
			}

			createBabyCancer(i, offset1);
			createBabyCancer(i, offset2);
			createBabyCancer(i, offset3);

			removeCancer(i);
		}
	}
	if (num_cancer > 15) {
		over = true; // game over 
		win = false; // lose
	}
	if (over) {
		showGameOver();
	}
}

// function that increase scale of cancers
function increaseCancersScale() {
	for (var i = 0; i < cancerIndex; i++) {

		if (!cancerList[i])
			continue;

		// increase scale of cancer
		var cancer = cancerList[i];
		if (cancer.state === GROWING) {
			cancer.scale.set(cancer.scale.x + 0.05, cancer.scale.y + 0.05, cancer.scale.z + 0.05);
		}
	}
}

// function that automatically moves cancer cells
function moveCancers() {
	for (var i = 0; i < cancerIndex; i++) {

		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// move cancer
		if (cancer.state === GROWING || cancer.state === ADJUSTING) {
			cancer.position.x += cancer.direction[0] / 30;
			cancer.position.y += cancer.direction[1] / 30;
			cancer.position.z += cancer.direction[2] / 30;

			// When cancer cells go out of the map
			if (cancer.state !== ADJUSTING &&
				(cancer.position.x >= maxMapSize || cancer.position.x <= minMapSize ||
				cancer.position.y >= maxMapSize || cancer.position.y <= minMapSize ||
				cancer.position.z >= maxMapSize|| cancer.position.z <= minMapSize)) {
					cancer.state = ADJUSTING;
					cancer.direction = cancer.direction.map(x => -x);
					var temp = cancer.direction[0];
					cancer.direction[0] = cancer.direction[1]
					cancer.direction[1] = cancer.direction[2]
					cancer.direction[2] = temp;
				}
			else if (cancer.state === ADJUSTING && 
				cancer.position.x <= maxMapSize && cancer.position.x >= minMapSize &&
				cancer.position.y <= maxMapSize && cancer.position.y >= minMapSize &&
				cancer.position.z <= maxMapSize && cancer.position.z >= minMapSize) {
					cancer.state = GROWING;
				}
		}
	}
}

// function that periodically adjusts the direction in which cancer cells move
function changeCancersDirection() {
	for (var i = 0; i < cancerIndex; i++) {

		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// adjust direction of cacners
		if (cancer.state === GROWING) {
			cancer.direction[0] += cancer.direction[1] / 20;
			cancer.direction[1] += cancer.direction[2] / 100;
			cancer.direction[2] += cancer.direction[0] / 100;
		}
		else if (cancer.state === ADJUSTING) {
			cancer.direction[0] += cancer.direction[2] / 20;
			cancer.direction[1] += cancer.direction[0] / 100;
			cancer.direction[2] += cancer.direction[1] / 100;
		}
	}
}

// detection of collision between immune cells - red blood cells and immune cells - cancer cells
function detectCollision() {
	var momBloodCell = bloodCellList[0];
	if (!momBloodCell)
		return;

	// collision between immune cells - red blood cells
	for (var i = 1; i < bloodCellIndex; i++) {
		var bloodCell = bloodCellList[i];
		if (!bloodCell)
			continue;

		// when it collides
		if (getCollision(cell, bloodCell)) {
			// remove the eaten red blood cell
			scene.remove(bloodCell);
			bloodCellList[i] = undefined;
			// increased immune cell points (by 10)
			cell.point += bloodCell.point;
			cell.scale.set(cell.scale.x + 1.0, cell.scale.y + 1.0, cell.scale.z + 1.0);
			console.log("point: " + cell.point);

			// create a new red blood cell
			createRandomBloodCell(momBloodCell);
		}
	}

	// collision between immune cells - cancers
	for (var i = 0; i < cancerIndex; i++) {
		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// when it collides
		if (getCollision(cell, cancer)) {
			var cellDecrease = cancer.point * 0.1;
			var cancerDecrease = cell.point * 0.1;

			cell.scale.set(cell.scale.x - cellDecrease, cell.scale.y - cellDecrease, cell.scale.z - cellDecrease);
			cancer.scale.set(cell.scale.x - cancerDecrease, cell.scale.y - cancerDecrease, cell.scale.z - cancerDecrease);
			
			// Decrease the points of immune cells as much as the points of cancer cells.
			var temp = cancer.point;
			cancer.point -= cell.point;
			cell.point -= temp;

			console.log("point: " + cell.point);
			if (cell.point <= 0) {
				// game over
				console.log("Game over because the point of the immune cell is below zero.");
				over = true; 
				win = false;
				stop();
				showGameOver();

				return;
			}

			if (cancer.point <= 0) {	// cancer cell death		
				score += 10;	// 10 points per one cancer cell
				scoreNum.innerHTML = score;		// update score

				scene.remove(cancer);
				num_cancer = num_cancer - 1;
				cancerList[i] = undefined;

				// Checked the two win conditions
				if(score == 50)	{
					console.log("Game over because the score is 50.");

					over = true; 
					win = true;
					stop();
					showGameOver();

					return;
				}
				
				if (num_cancer  == 0) {
					console.log("Game over because all cancer cells on the screen have been removed.");

					over = true; 
					win = true;
					stop();
					showGameOver();
									
					return;
				}
			}

		}
	}
}

// function to determine whether the two objects passed collided or not.
function getCollision(first, second) {
	if (!first || !second)
		return;

	// coordinates of first object
	var cp = [first.position.x, first.position.y, first.position.z];

	// radius of first object
	var firstBox = new THREE.Box3().setFromObject( first );
	var firstRadius = Math.floor(Math.abs(firstBox.max.x - firstBox.min.x)) / 2;

	// coordinates of second object
	var np = [second.position.x, second.position.y, second.position.z];
	// radius of second object
	var secondBox = new THREE.Box3().setFromObject( second );
	var secondRadius = Math.floor(Math.abs(secondBox.max.x - secondBox.min.x)) / 2;

	// The distance between first object and second object
	var distance = Math.floor(Math.sqrt(Math.pow(np[0] - cp[0], 2) + Math.pow(np[1] - cp[1], 2) + Math.pow(np[2] - cp[2], 2)));
	
	// Collision occurred
	if (distance <= firstRadius + secondRadius) {
		return true;
	}
	else {
		return false;
	}
}


/**** Blood Cell (food) ***/
// function that load gltf model of blood cell and create blood cell objet
function loadBloodCell() {
	loader.load('./blood_cell_model/scene.gltf', function(gltf){
		var cell = gltf.scene.children[0];
		cell.index = bloodCellIndex;
		cell.point = 10;
		cell.scale.set(3, 3, 3);
		cell.position.set(getRandomValue() * 1000, getRandomValue() * 1000, getRandomValue() * 1000);

		bloodCellList[bloodCellIndex] = cell;
		bloodCellIndex++;

		copyAndSpreadBloodCells();

	}, undefined, function (error) {
		  console.error(error);
	});
}

// function of copying red blood cells as many as totalNumOfBloodCells 
// and spraying them in random places
function copyAndSpreadBloodCells() {
	var bloodCell = bloodCellList[0];
	if (!bloodCell)
		return;

	// create blood cells
	for (var i = 0; i < totalNumOfBloodCells; i++) {
		createRandomBloodCell(bloodCell);
	}
}

// create copied blood cell at random location
function createRandomBloodCell(momBloodCell) {
	var copiedBloodCell = momBloodCell.clone();
	copiedBloodCell.index = bloodCellIndex;
	copiedBloodCell.point = 10;
	copiedBloodCell.scale.set(3, 3, 3);
	
	// create coordinates randomly
	var rv1 = getRandomValue();
	var rv2 = getRandomValue();
	var rv3 = getRandomValue();
	copiedBloodCell.position.set(rv1, rv2, rv3);
	copiedBloodCell.rotation.set(rv1, rv2, rv3);
	
	scene.add(copiedBloodCell);
	bloodCellList[bloodCellIndex] = copiedBloodCell;
	bloodCellIndex++;
}

// function that generates random numbers with a range of minMapSize to maxMapSize
function getRandomValue() {
	return Math.floor(Math.random() * (maxMapSize - minMapSize) + minMapSize);
}

//Game over function
function showGameOver(){
	// unlocked
	if (document.pointerLockElement === canvas ||
		document.mozPointerLockElement === canvas) {
		document.exitPointerLock();
		console.log('The pointer lock status is now unlocked');
	}

	stop(); // stop animation
	if(win){ // if win
		document.getElementById("result").innerHTML = "You Win!";
	}
	else{ //if loose
		document.getElementById("result").innerHTML = "You Loose";
	}
	document.getElementById("score_result").innerHTML = "Score:" + score; //show score
	gameOver.style.display = "flex" // show game over screen
	scoreBoard.style.display = "none" // hide score board
}

//Animation stop fuction
function stop() {
    if (handle) {
       window.cancelAnimationFrame(handle);
	   cancerIndex = 0;
	   cancerList = [];
	   bloodCellIndex = 0;
	   bloodCellList = [];

	   intervalVariables.forEach(element => clearInterval(element));
	   intervalVariables = [];
    }
}

//Start the game
startButton.addEventListener("click", ()=>{
	gameStart.style.display = "none" // Hide start screen
	init(); // game start
})

//Game replay
replayButton.addEventListener("click", ()=>{
	num_cancer = 0; // initialize number of cancer 
	score = 0; // initialixe score
	gameOver.style.display = "none" // hide game over screen
	over = false; 
	while(scene.children.length > 0){ // remove scene
		scene.remove(scene.children[0]); 
	}
	RESOURCES_LOADED = false;
	init(); // replay
})