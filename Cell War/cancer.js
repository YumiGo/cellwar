
// 암세포 상태 (성장중, 싸우는중, 죽음)
const GROWING = 0;
const FIGHTING = 1;
const DEAD = 2;

var canvas;
var renderer;
var scene;
var camera;
var loader;

var index = 0;	// 암세포들의 총 개수(이미 죽은 암세포도 포함)
var cancer_list = [];	// 암세포 변수들을 담아놓는 리스트

window.onload = function init()
{
	canvas = document.getElementById( "gl-canvas" );
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	renderer = new THREE.WebGLRenderer({canvas});
	renderer.setSize(canvas.width,canvas.height);

	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x000000);

	camera = new THREE.PerspectiveCamera(75,canvas.width / canvas.height,0.1, 1000);
	camera.rotation.y = 45/180*Math.PI;
	camera.position.x = 150;
	camera.position.y = 150;
	camera.position.z = 150;

	const controls = new THREE.OrbitControls(camera, renderer.domElement);

	hlight = new THREE.AmbientLight (0x404040,50);
	scene.add(hlight);
	light = new THREE.PointLight(0xc4c4c4,10);
	light.position.set(0,3000,5000);
	scene.add(light);

	light2 = new THREE.PointLight(0xc4c4c4,10);
	light2.position.set(5000,1000,0);
	scene.add(light2);

	light3 = new THREE.PointLight(0xc4c4c4,10);
	light3.position.set(0,1000,-5000);
	scene.add(light3);

	light4 = new THREE.PointLight(0xc4c4c4,10);
	light4.position.set(-5000,3000,5000);
	scene.add(light4);

	loader = new THREE.GLTFLoader();

	// gltf 모델링 불러와서 엄마 암세포 만들기
	loadRootCancer();
	
	// 매 초마다 특정 함수들 실행
	setInterval(updateCancersState, 1000);	// 1초마다 포인트, 상태 업데이트
	setInterval(increaseCancersScale, 100);	// 0.1초마다 크기 증가
	setInterval(moveCancers, 100);	// 0.1초마다 암세포 이동
	setInterval(changeCancerDirection, 500);	// 0.5초마다 암세포 이동 방향 조정

	animate();
}

// rendering
function animate() {
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
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

 // gltf 파일에서 모델링 불러와서 맨 처음 모든 암세포의 엄마가 되는 root cancer 만드는 함수
function loadRootCancer() {

	loader.load('./cancer_model/scene.gltf', function(gltf){
		var cancer = gltf.scene.children[0];
		cancer.index = index;
		cancer.point = 0;
		cancer.scale.set(5, 5, 5);
		cancer.state = GROWING;

		var offset = getRandomOffset();
		cancer.direction = offset;

		scene.add(cancer);
		cancer_list[index] = cancer;					// 각 cancer들에 접근하기 위해 리스트에 따로 저장
		console.log("Mom " + index++ + " is created [" + cancer.direction + "]")

	  }, undefined, function (error) {
		  console.error(error);
	  });
}

 // 엄마 암세포로부터 자식 암세포 생성하는 함수
function createBabyCancer(mom_index, offset) {

	// 엄마 암세포 있나 없나 체크
	var mother_cancer = cancer_list[mom_index]
	if (!mother_cancer) 
		return;

	var baby_cancer = mother_cancer.clone();

	baby_cancer.index = index;
	baby_cancer.point = 0;
	baby_cancer.scale.set(5, 5, 5);
	baby_cancer.state = GROWING;

	baby_cancer.position.x = mother_cancer.position.x + offset[0];
	baby_cancer.position.y = mother_cancer.position.y + offset[1];
	baby_cancer.position.z = mother_cancer.position.z + offset[2];

	baby_cancer.direction = offset;

	scene.add(baby_cancer);
	cancer_list[index] = baby_cancer;			// 각 cancer들에 접근하기 위해 리스트에 따로 저장
	console.log(index++ + " is created [" + baby_cancer.direction + "]")
}

// index값에 해당하는 cancer를 scene에서 제거하는 함수
function removeCancer(index) {

	// 해당 index에 아무것도 없다면 함수 종료
	if (!cancer_list[index])
		return;

	var cancer = cancer_list[index];
	cancer_list[index] = undefined;
    scene.remove(cancer);						// scene에서 제거, 더이상 렌더링 되지 않음
	console.log(cancer.index + " is killed")
}

// 암세포들의 상태, 포인트를 업데이트해줌. 포인트가 일정 수준에 다다르면 분열
function updateCancersState() {
	for (var i = 0; i < index; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		if (!cancer_list[i])
			continue;

		// 암세포 포인트 업데이트
		var cancer = cancer_list[i];
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

			// var box = new THREE.Box3().setFromObject( cancer );
			// console.log( box.min, box.max );
		}
	}
}

// 암세포들의 크기를 증가시키는 함수
function increaseCancersScale() {
	for (var i = 0; i < index; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		if (!cancer_list[i])
			continue;

		// 암세포 상태 업데이트
		var cancer = cancer_list[i];
		if (cancer.state === GROWING) {
			cancer.scale.set(cancer.scale.x + 0.1, cancer.scale.y + 0.1, cancer.scale.z + 0.1);
		}
	}
}

// 암세포들을 자동으로 움직이게 하는 함수
function moveCancers() {
	for (var i = 0; i < index; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		if (!cancer_list[i])
			continue;

		// 암세포 위치 이동
		var cancer = cancer_list[i];
		if (cancer.state === GROWING) {
			cancer.position.x += cancer.direction[0] / 40;
			cancer.position.y += cancer.direction[1] / 40;
			cancer.position.z += cancer.direction[2] / 40;
		}
	}
}

// 암세포들이 움직이는 방향을 주기적으로 조정해주는 함수
function changeCancerDirection() {
	for (var i = 0; i < index; i++) {

		// 해당 index에 아무것도 없다면 이번 루프 패스
		if (!cancer_list[i])
			continue;

		// 암세포 이동 방향 조정
		var cancer = cancer_list[i];
		if (cancer.state === GROWING) {
			cancer.direction[0] += cancer.direction[1] / 10;
			cancer.direction[1] += cancer.direction[2] / 10;
			cancer.direction[2] += cancer.direction[0] / 10;
		}
	}
}
