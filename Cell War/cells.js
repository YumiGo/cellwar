const gameStart = document.querySelector(".game_start");//시작화면
const gameOver = document.querySelector(".game_over"); //게임오버 화면
const startButton= document.querySelector(".game_start > button"); // 시작 버튼
const replayButton= document.querySelector(".game_over > button"); // 리플레이 버튼
const scoreBoard = document.getElementById( "divpop" ); // 점수판

var num_cancer = 0; // 남아있는 암세포 수
var win = false; // 승패 결정 bool 변수
var over = false; // 게임 종료 결정 bool 변수
var handle = 0; // 애니매이션 종료 기능에 사용 됨
var score = 0; // 점수

// 암세포 상태 (성장중, 싸우는중, 죽음)
const GROWING = 0;
const FIGHTING = 1;
const DEAD = 2;

var canvas;
var renderer;
var scene;
var camera;
var light;
var loader;

let left = 65, right = 68 // LEFT: "A" RIGHT: "D"
let up = 87, down = 83; // UP: "W" DOWN: "S"

var cell; // 면역세포

var cancerIndex = 0;	// 암세포들의 총 개수(이미 죽은 암세포도 포함)
var cancerList = [];	// 암세포 변수들을 담아놓는 리스트

// 적혈구(먹이)의 총 개수, 적혈구들을 담아놓는 리스트
var bloodCellIndex = 0;
var bloodCellList = [];

// 게임 종료시 setInterval 함수의 중단을 위해 필요한 변수 저장용 리스트
var intervalVariables = [];

window.onload = function showGameStart(){
	gameStart.style.display = "flex"
}

function init(){
	canvas = document.getElementById( "gl-canvas" );
	canvas.width = window.innerWidth; 
	canvas.height = window.innerHeight;

	renderer = new THREE.WebGLRenderer({canvas, alpha: true,});
	renderer.setSize(canvas.width,canvas.height);

	scene = new THREE.Scene();
    //scene.background = new THREE.Color('#AC1822');  // 배경색
	//3D 배경
	const tloader = new THREE.TextureLoader();
    const texture = tloader.load(
      'galaxy1.jpg',
      () => {
        const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
        rt.fromEquirectangularTexture(renderer, texture);
        scene.background = rt.texture;
      });

	camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
	camera.rotation.y = 45 / 180 * Math.PI;
	camera.position.x = 130;
	camera.position.y = 100;
	camera.position.z = 130;

	const controls = new THREE.OrbitControls(camera, renderer.domElement);

	light = new THREE.PointLight(0xA9A9A9,10);
	light.position.set(0,3000,5000);
	scene.add(light);

	light2 = new THREE.PointLight(0xA9A9A9,10);
	light2.position.set(5000,1000,0);
	scene.add(light2);

	light3 = new THREE.PointLight(0xA9A9A9,10);
	light3.position.set(0,1000,-5000);
	scene.add(light3);

	light4 = new THREE.PointLight(0xA9A9A9,10);
	light4.position.set(-5000,3000,5000);
	scene.add(light4);

	window.addEventListener("keydown", keyCodeOn, false);
	document.getElementById("score").innerHTML = score; // 게임화면에 점수 표시

	loader = new THREE.GLTFLoader();

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
   }, undefined, function (error) {
       console.error(error);
   });

}


// 면역세포(user) 방향 조작 가능케하는 함수
function keyCodeOn(e) {
	if (e.keyCode == left)
		cell.position.x -= 2
	else if (e.keyCode == right)
		cell.position.x += 2;
	else if (e.keyCode == up)
		cell.position.z += 2;
	else if (e.keyCode == down)
		cell.position.z -= 2;
	else
		return;
}


/**** 암세포 ****/
// gltf 파일에서 모델링 불러와서 맨 처음 모든 암세포의 엄마가 되는 root cancer 만드는 함수
function loadRootCancer() {

	loader.load('./cancer_model/scene.gltf', function(gltf){
		var cancer = gltf.scene.children[0];
		cancer.index = cancerIndex;
		cancer.point = 1;
		cancer.scale.set(5, 5, 5);
		cancer.state = GROWING;

		var offset = getRandomOffset();
		cancer.position.set(-40, 0, 0);
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
	babyCancer.point = 0;
	babyCancer.scale.set(5, 5, 5);
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

		// 엄마 암세포의 포인트가 10이 되고 이미 죽은 상태가 아니라면, 애기 암세포 3개 생성 후 제거
		if (cancer.state !== DEAD && cancer.point === 10) {

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
			cancer.scale.set(cancer.scale.x + 0.1, cancer.scale.y + 0.1, cancer.scale.z + 0.1);
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
		if (cancer.state === GROWING) {
			cancer.position.x += cancer.direction[0] / 40;
			cancer.position.y += cancer.direction[1] / 40;
			cancer.position.z += cancer.direction[2] / 40;
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
			cancer.direction[0] += cancer.direction[1] / 10;
			cancer.direction[1] += cancer.direction[2] / 10;
			cancer.direction[2] += cancer.direction[0] / 10;
		}
	}
}


// 면역세포-적혈구, 면역세포-암세포간의 충돌 탐지
function detectCollision() {
	// 면역세포와 적혈구의 충돌 탐지
	for (var i = 0; i < bloodCellIndex; i++) {
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
				console.log("포인트가 0 이하가 되었으므로 게임 오버");
				stop();
				showGameOver();
				return;
			}
			if (cancer.point <= 0) {
				// 암세포 죽음
				scene.remove(cancer);
				cancerList[i] = undefined;
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
		cell.position.set(20, 0, 0);

		scene.add(cell);
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

	// 적혈구 100개 생성
	for (var i = 0; i < 100; i++) {
		var copiedBloodCell = bloodCell.clone();	// 복사
		copiedBloodCell.index = bloodCellIndex;
		copiedBloodCell.point = 10;
		copiedBloodCell.scale.set(3, 3, 3);
	
		// 좌표 랜덤 생성
		var rv1 = getRandomValue();
		var rv2 = getRandomValue();
		var rv3 = getRandomValue();
		copiedBloodCell.position.set(rv1, rv2, rv3);
		copiedBloodCell.rotation.set(rv1, rv2, rv3);
	
		scene.add(copiedBloodCell);
		bloodCellList[bloodCellIndex] = copiedBloodCell;
		bloodCellIndex++;
	}

}

// 범위가 -300 ~ 300인 난수를 생성하는 함수 (적혈구 좌표 랜덤 생성용)
function getRandomValue() {
	return Math.floor(Math.random() * 600 - 300);
}

//게임 종료 화면
function showGameOver(){
	stop() // 애니매이션 멈추기
	if(win){ // 이겼으면
		document.getElementById("result").innerHTML = "You Win!";
	}
	else{ //졌으면
		document.getElementById("result").innerHTML = "YouLoose";
	}
	document.getElementById("score_result").innerHTML = "Score:" + score; //점수 표시
	gameOver.style.display = "flex" // 게임 오버 화면 띄우기
	scoreBoard.style.display = "none" // 점수판 삭제
}

//애니매이션 멈춤
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

//Start 버튼 눌렀을 때 게임 시작하기
startButton.addEventListener("click", ()=>{
	gameStart.style.display = "none" // 시작 화면 지우기
	scoreBoard.style.display = "flex" // 점수판 띄우기
	init(); // 게임 시작
})

//Replay 버튼 눌렀을 때 
replayButton.addEventListener("click", ()=>{
	num_cancer = 0; // 암세포 개수 초기화
	score = 0; // 점수 초기화
	gameOver.style.display = "none" // 게임오버 화면 지우기
	scoreBoard.style.display = "flex" // 점수판 띄우기
	over = false; // 다시 게임 시작
	while(scene.children.length > 0){ // 화면 비우기
		scene.remove(scene.children[0]); 
	}
	init(); // 다시 게임 시작
})