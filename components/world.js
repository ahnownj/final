import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const DEFAULT_COORDS = { lat: 37.5665, lng: 126.978 };
const PLAYER_HEIGHT = 1.7;
const WORLD_RADIUS = 600;

const getStreetViewUrl = ({ lat, lng, heading, pitch, apiKey }) =>
  `https://maps.googleapis.com/maps/api/streetview?size=2048x1024&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=120&key=${apiKey}`;

export default function WorldRoom({
  lat = DEFAULT_COORDS.lat,
  lng = DEFAULT_COORDS.lng,
  heading = 0,
  pitch = 0,
}) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const [isLocked, setIsLocked] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;

  useEffect(() => {
    if (!mountRef.current || !apiKey) return;

    let renderer = null;
    let animationId = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, PLAYER_HEIGHT, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.addEventListener('lock', () => setIsLocked(true));
    controls.addEventListener('unlock', () => setIsLocked(false));
    controlsRef.current = controls;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 1.2);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(6, 10, 4);
    scene.add(hemiLight);
    scene.add(dirLight);

    const planeGeom = new THREE.PlaneGeometry(120, 120, 1, 1);
    const planeMat = new THREE.MeshStandardMaterial({
      color: '#111',
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(planeGeom, planeMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const spawnRingGeom = new THREE.TorusGeometry(0.45, 0.08, 16, 60);
    const spawnRingMat = new THREE.MeshStandardMaterial({
      color: '#ffd400',
      emissive: '#1b1200',
      metalness: 0.4,
      roughness: 0.2,
    });
    const spawnRing = new THREE.Mesh(spawnRingGeom, spawnRingMat);
    spawnRing.rotation.x = Math.PI / 2;
    spawnRing.position.set(0, 0.05, 0);
    scene.add(spawnRing);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    textureLoader.load(
      getStreetViewUrl({ lat, lng, heading, pitch, apiKey }),
      (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1;

        const sphereGeom = new THREE.SphereGeometry(WORLD_RADIUS, 80, 40);
        const sphereMat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.BackSide,
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        sphere.rotation.y = THREE.MathUtils.degToRad(heading);
        scene.add(sphere);

        setLoadError(null);
      },
      undefined,
      () => setLoadError('Street View 이미지를 불러오지 못했습니다.')
    );

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const movement = { forward: false, backward: false, left: false, right: false };
    let prevTime = performance.now();

    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          movement.forward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          movement.left = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          movement.backward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          movement.right = true;
          break;
        default:
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          movement.forward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          movement.left = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          movement.backward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          movement.right = false;
          break;
        default:
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const lockPointer = () => {
      if (!controlsRef.current?.isLocked) {
        controlsRef.current?.lock();
      }
    };
    const onCanvasClick = () => lockPointer();
    renderer.domElement.addEventListener('click', onCanvasClick);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = performance.now();
      const delta = (time - prevTime) / 1000;

      velocity.x -= velocity.x * 10 * delta;
      velocity.z -= velocity.z * 10 * delta;

      direction.z = Number(movement.forward) - Number(movement.backward);
      direction.x = Number(movement.right) - Number(movement.left);
      direction.normalize();

      const speed = 7;
      if (movement.forward || movement.backward) velocity.z -= direction.z * speed * delta;
      if (movement.left || movement.right) velocity.x -= direction.x * speed * delta;

      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);

      prevTime = time;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      controls.dispose();
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);

      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
          if (child.material?.map) child.material.map.dispose();
        }
      });
    };
  }, [lat, lng, heading, pitch, apiKey]);

  return (
    <div className="world-root" ref={mountRef}>
      <div className={`overlay ${isLocked ? 'overlay--hidden' : ''}`}>
        <div className="overlay-card">
          <p className="overlay-title">3D SPAWN</p>
          {loadError ? (
            <p className="overlay-error">{loadError}</p>
          ) : (
            <>
              <p>아래 버튼 또는 화면을 클릭하면 마우스가 잠기고</p>
              <p>W/A/S/D 혹은 방향키로 이동할 수 있습니다.</p>
              <button className="overlay-button" onClick={() => controlsRef.current?.lock()}>
                ENTER WORLD
              </button>
              <p className="overlay-meta">
                {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .world-root {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #000;
        }
        .world-root :global(canvas) {
          display: block;
        }
        .overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.3s ease;
        }
        .overlay--hidden {
          opacity: 0;
          pointer-events: none;
        }
        .overlay-card {
          min-width: 320px;
          padding: 26px 34px;
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.75);
          color: #f3f3f3;
          text-align: center;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
          font-size: 14px;
          line-height: 1.6;
        }
        .overlay-button {
          margin: 14px 0 6px;
          border: none;
          background: #ffd400;
          color: #1a1600;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.2em;
          padding: 10px 28px;
          border-radius: 999px;
          cursor: pointer;
        }
        .overlay-title {
          font-size: 18px;
          letter-spacing: 0.5em;
          margin: 0 0 14px 0;
        }
        .overlay-meta {
          margin-top: 16px;
          font-size: 12px;
          letter-spacing: 0.1em;
          color: #ffd400;
        }
        .overlay-error {
          color: #ff7878;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}