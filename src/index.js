import './styles.css';
import * as THREE from 'three';
import typefaceFont from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import importedGltf from './assets/star-model/scene.glb';
import videoThumbnail from './assets/video_thumbnail.png';

//Global scope variables
var renderer, camera, film, stars, poster, textMaterial, credits, actors, texts, imagesToTest, videosToTest, videosGroup;
const font = new THREE.Font(typefaceFont);
const textureLoader = new THREE.TextureLoader();
const scene = new THREE.Scene();
const transformation = new Map();
const gltfLoader = new GLTFLoader();
const actors_links = new Map();
const videos_links = new Map();
const clock = new THREE.Clock();
const api_key = 'PasteYourApiKeyHere';

// ====== Onirix SDK config ======
let config = {
    token: "PasteYourOnirix'sProjectTokenHere",
    mode: OnirixSDK.TrackingMode.Image
}

const loadIds = () => {
    transformation.set('96fd5d01c090490a8d512ee01c183b14', '27205'); //Inception
    transformation.set('6ebdcb17fc3e4e8fba8174559ac22de2', '155'); //The dark knight
    transformation.set('d5ca67ad793d4dbf9fa27922c07a678c', '122'); //The lord of the rings: the return of the king
}

function evaluateClick(e) {
    //Get mouse coordinates
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const canvasRect = renderer.domElement.getBoundingClientRect();
    const mouse = {
        x: ((mouseX - canvasRect.left) / canvasRect.width) * 2 - 1,
        y: -((mouseY - canvasRect.top) / canvasRect.height) * 2 + 1
    };
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(imagesToTest);
    if (intersects.length > 0) {
        //Images
        window.open(`https://www.themoviedb.org/person/${actors_links.get(intersects[0].object.uuid)}`);
    } else {
        //Videos
        intersects = raycaster.intersectObjects(videosToTest);
        if (intersects.length > 0) {
            window.open(`https://www.youtube.com/watch?v=${videos_links.get(intersects[0].object.uuid)}`);
        }
    }
}

const renderText = (text, size, x, z) => {
    //Maximum 35 characters per line
    if (text.length <= 35) {
        let textGeometry = new THREE.TextGeometry(
            text, {
                font,
                size,
                height: 0.001,
                curveSegments: 30
            }
        );
        let textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.x = x;
        textGeometry.center();
        textMesh.rotation.x = -0.5 * Math.PI;
        textMesh.position.y = 0.1;
        textMesh.position.z = z;
        texts.add(textMesh);
        textGeometry.dispose();
    } else {
        let words = text.split(' ');
        let currentLine = "";
        let count = 0
        for (let index = 0; index < words.length; index++) {
            //Not to finish the line in the middle of a word
            if (currentLine.length + words[index].length > 34) {
                //Proportional line height
                renderText(currentLine, size, x, z + (size + 0.01) * count);
                count++;
                currentLine = words[index];
            } else {
                currentLine += (' ' + words[index]);
            }
        }
        renderText(currentLine, size, x, z + (size + 0.01) * count);
    }
}

const requestApi = async(id) => {
    return new Promise(
        (resolve, reject) => {
            fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${api_key}&language=en-US`, {
                    method: 'GET'
                })
                .then(response => response.body)
                .then(rb => {
                    const reader = rb.getReader();
                    return new ReadableStream({
                        start(controller) {
                            // The following function handles each data chunk
                            function push() {
                                // "done" is a Boolean and value a "Uint8Array"
                                reader.read().then(({ done, value }) => {
                                    // If there is no more data to read
                                    if (done) {
                                        controller.close();
                                        return;
                                    }
                                    // Get the data and send it to the browser via the controller
                                    controller.enqueue(value);
                                    // Check chunks by logging to the console
                                    push();
                                })
                            }
                            push();
                        }
                    });
                })
                .then(stream => {
                    // Respond with our stream
                    return new Response(stream, { headers: { "Content-Type": "text/html" } }).text();
                })
                .then(result => {
                    resolve(JSON.parse(result));
                })
                .catch(err => {
                    console.error(err);
                    reject(err);
                });
        }
    );
}

const loadContent = async() => {
    //Film poster
    const planeGeometry = new THREE.PlaneGeometry(3, 4);
    poster = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({
        color: 'black',
        transparent: true,
        opacity: 0.5
    }));
    poster.position.x = 0;
    poster.position.y = 0;
    poster.position.z = 0;
    poster.rotation.x = -0.5 * Math.PI;
    scene.add(poster);
    //Texts
    textMaterial = new THREE.MeshBasicMaterial({ color: 'white' });
    texts = new THREE.Group();
    //Title
    renderText(film.original_title, 0.04, 0, -0.48);
    //Year
    renderText(film.release_date.substr(0, 4), 0.02, 0, -0.38);
    //Subtitle
    renderText(film.tagline, 0.02, 0, -0.35);
    //Plot
    renderText(film.overview, 0.02, 0, -0.1);
    //Genre
    let genreText = "";
    film.genres.forEach((genre, index) => {
        if (film.genres[index + 1]) genreText += genre.name + ', ';
        else genreText += genre.name;
    });
    renderText(genreText, 0.02, 0, -0.25);
    scene.add(texts);
    //Cast
    actors_links.clear();
    imagesToTest = [];
    credits = await requestApi(`${film.id}/credits`);
    let i = 0;
    let added = 0; //Only 3 images
    actors = new THREE.Group();
    while (i < credits.cast.length && added < 3) {
        if (credits.cast[i].character) {
            let imageTexture = textureLoader.load(`https://image.tmdb.org/t/p/w500${credits.cast[i].profile_path}`);
            let imageGeometry = new THREE.PlaneGeometry(0.15, 0.15, 100, 100);
            let imageMaterial = new THREE.MeshStandardMaterial({
                map: imageTexture
            });
            let imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
            imageMesh.position.x = -0.2 + 0.2 * added;
            imageMesh.position.y = 0.2;
            imageMesh.position.z = 0.4;
            imageMesh.rotation.x = -0.5 * Math.PI;
            imagesToTest.push(imageMesh);
            actors_links.set(imageMesh.uuid, credits.cast[i].id);
            actors.add(imageMesh);
            imageGeometry.dispose();
            added++;
        }
        i++;
    }
    scene.add(actors);
    //Stars
    var displacementRight = 0;
    var displacementLeft = 0;
    stars = new THREE.Group();
    var rating = Math.round(film.vote_average);
    for (let i = 0; i < rating; i++) {
        gltfLoader.load(
            importedGltf,
            (model) => {
                model.scene.scale.set(0.0003, 0.0003, 0.0003);
                //Situated alternatively on each side
                if (i % 2 == 0) {
                    model.scene.position.x = poster.position.x + displacementRight;
                    displacementRight += 0.05;
                } else {
                    model.scene.position.x = poster.position.x + displacementLeft;
                    displacementLeft -= 0.05;
                }
                model.scene.position.z = -0.13;
                model.scene.position.y = 0.2;
                model.scene.rotation.x = -0.5 * Math.PI;
                stars.add(model.scene);
            }
        );
    }
    scene.add(stars);
    //Videos
    videosToTest = [];
    videos_links.clear();
    let videos = await requestApi(`${film.id}/videos`);
    let videoGeometry = new THREE.PlaneGeometry(0.1, 0.1, 300, 300);
    let textureVideo = textureLoader.load(videoThumbnail);
    let videoMaterial = new THREE.MeshStandardMaterial({
        map: textureVideo
    });
    if (videos.results) {
        videosGroup = new THREE.Group();
        let added = 0;
        videos.results.forEach((video) => {
            if (video.site === 'YouTube') {
                let videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
                videoMesh.position.x = 0.3;
                videoMesh.position.y = 0.2;
                videoMesh.position.z = -0.15 + 0.15 * added;
                videoMesh.rotation.x = -0.5 * Math.PI;
                videosToTest.push(videoMesh);
                videos_links.set(videoMesh.uuid, video.key);
                videosGroup.add(videoMesh);
                added++;
            }
        });
        scene.add(videosGroup);
    }
    videoGeometry.dispose();
}

function setupRenderer(rendererCanvas) {
    const width = rendererCanvas.width;
    const height = rendererCanvas.height;
    // Initialize renderer with rendererCanvas provided by Onirix SDK
    renderer = new THREE.WebGLRenderer({ canvas: rendererCanvas, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    // Ask Onirix SDK for camera parameters to create a 3D camera that fits with the AR projection.
    const cameraParams = OX.getCameraParameters();
    camera = new THREE.PerspectiveCamera(cameraParams.fov, cameraParams.aspect, 0.1, 1000);
    camera.matrixAutoUpdate = false;
    // Add some lights
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xbbbbff, 0x444422);
    scene.add(hemisphereLight);
}

function updatePose(pose) {
    // When a new pose is detected, update the 3D camera
    let modelViewMatrix = new THREE.Matrix4();
    modelViewMatrix = modelViewMatrix.fromArray(pose);
    camera.matrix = modelViewMatrix;
    camera.matrixWorldNeedsUpdate = true;
}

function onResize() {
    // When device orientation changes, it is required to update camera params.
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    const cameraParams = OX.getCameraParameters();
    camera.fov = cameraParams.fov;
    camera.aspect = cameraParams.aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function render() {
    // Just render the scene
    renderer.render(scene, camera);
}

function renderLoop() {
    const time = clock.getElapsedTime();
    if (stars) {
        stars.traverse((star) => {
            if (star instanceof THREE.Mesh) {
                star.rotation.y = time;
            }
        });
    }
    render();
    requestAnimationFrame(() => renderLoop());
}


// ====== Onirix SDK ======

OX.init(config).then(rendererCanvas => {
    //Load films' ids
    loadIds();
    // Setup ThreeJS renderer
    setupRenderer(rendererCanvas);
    // Initialize render loop
    renderLoop();
    OX.subscribe(OnirixSDK.Events.OnDetected, async function(id) {
        console.log("Detected Image: " + id);
        let film_id;
        film_id = transformation.get(id);
        film = await requestApi(film_id);
        await loadContent();
        document.getElementById('mask').style.display = "none";
        document.addEventListener('click', evaluateClick);
        // It is useful to synchronize scene background with the camera feed
        scene.background = new THREE.VideoTexture(OX.getCameraFeed());
    });

    OX.subscribe(OnirixSDK.Events.OnPose, function(pose) {
        updatePose(pose);
    });

    OX.subscribe(OnirixSDK.Events.OnLost, function(id) {
        console.log("Lost Image: " + id);
        // Hide 3D model
        scene.background = null;
        scene.remove(poster);
        scene.remove(stars);
        scene.remove(texts);
        scene.remove(actors);
        scene.remove(videosGroup);
        document.getElementById('mask').style.display = "block";
        document.removeEventListener('click', evaluateClick);
    });

    OX.subscribe(OnirixSDK.Events.OnResize, function() {
        onResize();
    });

}).catch((error) => {
    console.log(error);
});