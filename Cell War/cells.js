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

var maxMapSize = 600;
var minMapSize = -600;

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

var cancerIndex = 0;	// 암세포들의 총 개수(이미 죽은 암세포도 포함)
var cancerList = [];	// 암세포 변수들을 담아놓는 리스트

// 적혈구(먹이)의 총 개수, 적혈구들을 담아놓는 리스트
var bloodCellIndex = 0;
var bloodCellList = [];
var totalNumOfBloodCells = 400;

// 게임 종료시 setInterval 함수의 중단을 위해 필요한 변수 저장용 리스트
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
		console.log("loaded all resources");
		RESOURCES_LOADED = true;
	};

	scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');  // background color

	//3D background texture
	const tloader = new THREE.TextureLoader(loadingManager);
    const texture = tloader.load(
      'galaxy1.jpg',
      () => {
        const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
        rt.fromEquirectangularTexture(renderer, texture);
        scene.background = rt.texture;
      });

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

	var light2 = new THREE.PointLight(0xA9A9A9,10);
	light2.position.set(5000,1000,0);
	scene.add(light2);

	var light3 = new THREE.PointLight(0xA9A9A9,10);
	light3.position.set(0,1000,-5000);
	scene.add(light3);

	var light4 = new THREE.PointLight(0xA9A9A9,10);
	light4.position.set(-5000,3000,5000);
	scene.add(light4);

	window.addEventListener("keydown", keyCodeOn, false);
	scoreNum.innerHTML = score; // 게임화면에 점수 표시

	loader = new THREE.GLTFLoader(loadingManager);

	// gltf 모델링 불러와서 면역세포(유저) 만들기
    loadImmuneCell();
	
	// gltf 모델링 불러와서 적혈구(먹이) 만들기
	loadBloodCell();

	// gltf 모델링 불러와서 엄마 암세포(적) 만들기
	loadRootCancer();
	
	// 매 초마다 특정 함수들 실행
	var interval = setInterval(updateCancersState, 1000);	// 1초마다 포인트, 상태 업데이트
	intervalVariables.push(interval);

	interval = setInterval(changeCancersDirection, 500);	// 0.5초마다 암세포 이동 방향 조정
	intervalVariables.push(interval);

	interval = setInterval(increaseCancersScale, 100);	// 0.1초마다 크기 증가
	intervalVariables.push(interval);

	interval = setInterval(moveCancers, 100);	// 0.1초마다 암세포 이동
	intervalVariables.push(interval);

	interval = setInterval(detectCollision, 200);	// 0.2초마다 충돌 탐지
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

	camera.updateProjectionMatrix();
	renderer.render(scene, camera);
	handle = requestAnimationFrame(animate);
}


/**** 면역세포 ****/
// gltf 파일에서 모델링 불러와서 면역세포(user)를 만드는 함수
function loadImmuneCell() {

   loader.load('./lympocyte/scene.gltf', function(gltf) {
       cell = gltf.scene.children[0];
       cell.scale.set(5, 5, 5);
       cell.position.set(0, 0, 0);    // 물체 위치
	   cell.point = 0;
       scene.add(cell);
	   controls.target.set(cell.position.x, cell.position.y, cell.position.z);
   }, undefined, function (error) {
       console.error(error);
   });

}

// 면역세포(user) 방향 조작 가능케하는 함수
function keyCodeOn(e) {
	direction = camera.getWorldDirection(vector).multiplyScalar(distance);
	
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


/**** 암세포 ****/
// gltf 파일에서 모델링 불러와서 맨 처음 모든 암세포의 엄마가 되는 root cancer 만드는 함수
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
		cancerList[cancerIndex] = cancer;					// 각 cancer들에 접근하기 위해 리스트에 따로 저장
		console.log("Mom " + cancerIndex + " is created [" + cancer.direction + "]")
		cancerIndex++;

	}, undefined, function (error) {
		  console.error(error);
	});
}

// 암세포가 움직일 방향 또는 엄마 암세포로부터 떨어진 초기 위치(offset)를 생성해서 리턴해주는 함수
function getRandomOffset() {
	var offset = [];

	// 총 27가지의 경우의 수
	for (var i = 0; i < 3; i++) {
		// 범위가 0 ~ 2인 난수 생성
		var randomValue = Math.floor(Math.random() * 3);

		// 0, 40, -40 중 하나를 offset에 push
		if (randomValue === 0)
			offset.push(0);
		else if (randomValue === 1) 
			offset.push(40);
		else
			offset.push(-40);
	}

	return offset;
}

 // 엄마 암세포로부터 자식 암세포 생성하는 함수
function createBabyCancer(momIndex, offset) {

	// 엄마 암세포 있나 없나 체크
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
	cancerList[cancerIndex] = babyCancer;			// 각 cancer들에 접근하기 위해 리스트에 따로 저장
	console.log(cancerIndex++ + " is created [" + babyCancer.direction + "]")
}

// index값에 해당하는 cancer를 scene에서 제거하는 함수
function removeCancer(i) {

	// 해당 index에 아무것도 없다면 함수 종료
	var cancer = cancerList[i];
	if (!cancer)
		return;
		
    scene.remove(cancer);					// scene에서 제거, 더이상 렌더링 되지 않음
	num_cancer = num_cancer - 1;
	cancerList[i] = undefined;
	console.log(cancer.index + " is killed");
}

// 암세포들의 상태, 포인트를 업데이트해줌. 포인트가 일정 수준에 다다르면 분열
function updateCancersState() {
	for (var i = 0; i < cancerIndex; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// 암세포 포인트 업데이트
		if (cancer.state === GROWING) {
			cancer.point += 1;
		}

		// 엄마 암세포의 포인트가 50이 되고 이미 죽은 상태가 아니라면, 애기 암세포 3개 생성 후 제거
		if (cancer.state !== DEAD && cancer.point === 50) {

			cancer.state = DEAD;

			// 암세포 초기 위치, 방향 값 랜덤 생성
			var offset1 = getRandomOffset();
			var offset2 = getRandomOffset();
			var offset3 = getRandomOffset();

			// 암세포끼리 겹치는것 방지
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
		over = true; // 게임이 끝났다
		win = false; //졌다
	}
	if (over) {
		showGameOver();
	}
}

// 암세포들의 크기를 증가시키는 함수
function increaseCancersScale() {
	for (var i = 0; i < cancerIndex; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		if (!cancerList[i])
			continue;

		// 암세포 상태 업데이트
		var cancer = cancerList[i];
		if (cancer.state === GROWING) {
			cancer.scale.set(cancer.scale.x + 0.05, cancer.scale.y + 0.05, cancer.scale.z + 0.05);
		}
	}
}

// 암세포들을 자동으로 움직이게 하는 함수
function moveCancers() {
	for (var i = 0; i < cancerIndex; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// 암세포 위치 이동
		if (cancer.state === GROWING || cancer.state === ADJUSTING) {
			cancer.position.x += cancer.direction[0] / 30;
			cancer.position.y += cancer.direction[1] / 30;
			cancer.position.z += cancer.direction[2] / 30;

			// 암세포가 맵 밖으로 나갔을 경우
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
					console.log("암세포 맵 이탈");
					console.log(cancer.position);
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

// 암세포들이 움직이는 방향을 주기적으로 조정해주는 함수
function changeCancersDirection() {
	for (var i = 0; i < cancerIndex; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// 암세포 이동 방향 조정
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

// 면역세포-적혈구, 면역세포-암세포간의 충돌 탐지
function detectCollision() {
	var momBloodCell = bloodCellList[0];
	if (!momBloodCell)
		return;

	// 면역세포와 적혈구의 충돌 탐지
	for (var i = 1; i < bloodCellIndex; i++) {
		var bloodCell = bloodCellList[i];
		if (!bloodCell)
			continue;

		// 충돌했을 때
		if (getCollision(cell, bloodCell)) {
			// 먹힌 적혈구 제거
			scene.remove(bloodCell);
			bloodCellList[i] = undefined;
			// 면역세포 포인트 증가 (10만큼)
			cell.point += bloodCell.point;
			cell.scale.set(cell.scale.x + 1.0, cell.scale.y + 1.0, cell.scale.z + 1.0);
			console.log("적혈구와의 충돌 발생, 점수: " + cell.point);

			// 새로운 적혈구 하나 생성
			createRandomBloodCell(momBloodCell);
		}
	}

	// 면역세포와 암세포의 충돌 탐지
	for (var i = 0; i < cancerIndex; i++) {
		var cancer = cancerList[i];
		if (!cancer)
			continue;

		// 충돌했을 때
		if (getCollision(cell, cancer)) {
			var cellDecrease = cancer.point * 0.1;
			var cancerDecrease = cell.point * 0.1;

			cell.scale.set(cell.scale.x - cellDecrease, cell.scale.y - cellDecrease, cell.scale.z - cellDecrease);
			cancer.scale.set(cell.scale.x - cancerDecrease, cell.scale.y - cancerDecrease, cell.scale.z - cancerDecrease);
			
			// 암세포의 포인트만큼 제거
			var temp = cancer.point;
			cancer.point -= cell.point;
			cell.point -= temp;

			console.log("암세포와의 충돌 발생, 점수: " + cell.point);
			if (cell.point <= 0) {
				// 게임 오버
				console.log("면역세포의 포인트가 0 이하가 되었으므로 게임 오버");
				stop();
				showGameOver();

				return;
			}

			if (cancer.point <= 0) {	// 암세포 죽음			
				score += 10;	// 10 points per one cancer cell
				scoreNum.innerHTML = score;		// update score

				scene.remove(cancer);
				num_cancer = num_cancer - 1;
				cancerList[i] = undefined;

				// 두 가지 win 조건을 체크함
				if(score == 50)	{
					console.log("점수가 50이 되었으므로 게임 오버");

					over = true; 
					win = true;
					stop();
					showGameOver();

					return;
				}
				
				if (num_cancer  == 0) {
					console.log("화면에 있는 암세포를 모두 제거하였으므로 게임 오버");

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

// 인자로 넘겨진 두 object가 충돌했는지 안했는지 판단하는 함수
function getCollision(first, second) {
	if (!first || !second)
		return;

	// first 현재 좌표
	var cp = [first.position.x, first.position.y, first.position.z];

	// first 반지름
	var firstBox = new THREE.Box3().setFromObject( first );
	var firstRadius = Math.floor(Math.abs(firstBox.max.x - firstBox.min.x)) / 2;

	// obj2 현재 좌표
	var np = [second.position.x, second.position.y, second.position.z];
	// obj2 반지름
	var secondBox = new THREE.Box3().setFromObject( second );
	var secondRadius = Math.floor(Math.abs(secondBox.max.x - secondBox.min.x)) / 2;

	// cancer와 next_cancer간의 거리
	var distance = Math.floor(Math.sqrt(Math.pow(np[0] - cp[0], 2) + Math.pow(np[1] - cp[1], 2) + Math.pow(np[2] - cp[2], 2)));
	
	// 충돌 발생
	if (distance <= firstRadius + secondRadius) {
		return true;
	}
	else {
		return false;
	}
}


/**** 적혈구(먹이) ***/
// gltf 파일에서 적혈구 모델링을 불러오는 함수
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

// 적혈구 100개를 복사해서 랜덤한 곳에 뿌려주는 함수
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

// 범위가 minMapSize ~ maxMapSize인 난수를 생성하는 함수 (적혈구 좌표 랜덤 생성용)
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