import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { JointAngles, RobotTheme, CameraPreset, PickableBlock, CollisionState } from '../types/robot';
import { ROBOT_DIMENSIONS, degToRad } from '../utils/kinematics';
import { Camera, Eye, Crosshair, Sparkles, Box, RefreshCw } from 'lucide-react';

interface Viewport3DProps {
  joints: JointAngles;
  theme: RobotTheme;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  showTrail: boolean;
  showReachEnvelope: boolean;
  showLaser: boolean;
  showGrid: boolean;
  blocks: PickableBlock[];
  onUpdateBlocks: (updater: (prev: PickableBlock[]) => PickableBlock[]) => void;
  ikTarget?: { x: number; y: number; z: number };
  onSceneClickTarget?: (target: { x: number; y: number; z: number }) => void;
  collision?: CollisionState;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  joints,
  theme,
  cameraPreset,
  onCameraPresetChange,
  showTrail,
  showReachEnvelope,
  showLaser,
  showGrid,
  blocks,
  onUpdateBlocks,
  ikTarget,
  onSceneClickTarget,
  collision,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Joint hierarchy refs
  const baseGroupRef = useRef<THREE.Group | null>(null);
  const j1GroupRef = useRef<THREE.Group | null>(null);
  const j2GroupRef = useRef<THREE.Group | null>(null);
  const j3GroupRef = useRef<THREE.Group | null>(null);
  const j4GroupRef = useRef<THREE.Group | null>(null);
  const j5GroupRef = useRef<THREE.Group | null>(null);
  const leftFingerRef = useRef<THREE.Mesh | null>(null);
  const rightFingerRef = useRef<THREE.Mesh | null>(null);
  const tcpMarkerRef = useRef<THREE.Group | null>(null);
  const laserBeamRef = useRef<THREE.Line | null>(null);
  const reachDomeRef = useRef<THREE.Mesh | null>(null);
  const ikTargetMarkerRef = useRef<THREE.Mesh | null>(null);

  // Material refs for dynamic theming
  const materialsRef = useRef<{
    primary?: THREE.MeshStandardMaterial;
    secondary?: THREE.MeshStandardMaterial;
    accent?: THREE.MeshStandardMaterial;
    metal?: THREE.MeshStandardMaterial;
  }>({});

  // Trajectory trail
  const trailLineRef = useRef<THREE.Line | null>(null);
  const trailPointsRef = useRef<THREE.Vector3[]>([]);

  // Interactive block meshes
  const blockMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Camera Orbit state
  const orbitState = useRef({
    theta: Math.PI / 4,
    phi: Math.PI / 3.2,
    radius: 780,
    target: new THREE.Vector3(0, 160, 0),
    isDragging: false,
    dragButton: 0,
    prevX: 0,
    prevY: 0,
  });

  // Track held block
  const heldBlockIdRef = useRef<string | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0006);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    cameraRef.current = camera;
    camera.position.set(500, 480, 500);
    camera.lookAt(0, 160, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainLight.position.set(350, 700, 400);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 50;
    mainLight.shadow.camera.far = 1600;
    mainLight.shadow.camera.left = -500;
    mainLight.shadow.camera.right = 500;
    mainLight.shadow.camera.top = 500;
    mainLight.shadow.camera.bottom = -500;
    mainLight.shadow.bias = -0.0005;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-450, 300, -450);
    scene.add(rimLight);

    const softFill = new THREE.PointLight(0xf97316, 0.4, 800);
    softFill.position.set(0, 150, 200);
    scene.add(softFill);

    // 5. Work table & Environment
    const tableGroup = new THREE.Group();
    scene.add(tableGroup);

    // Work table top
    const tableGeo = new THREE.BoxGeometry(750, 18, 650);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x131d2e,
      roughness: 0.5,
      metalness: 0.6,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -9;
    tableMesh.receiveShadow = true;
    tableGroup.add(tableMesh);

    // Grid on table
    const grid = new THREE.GridHelper(700, 35, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.5;
    tableGroup.add(grid);

    // Worktable bezel / border
    const bezelGeo = new THREE.BoxGeometry(760, 22, 660);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.4,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.y = -11;
    tableGroup.add(bezelMesh);

    // Intake Pallet (Left)
    const intakeGeo = new THREE.BoxGeometry(140, 6, 140);
    const intakeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const intakeMesh = new THREE.Mesh(intakeGeo, intakeMat);
    intakeMesh.position.set(-200, 3, 100);
    intakeMesh.receiveShadow = true;
    tableGroup.add(intakeMesh);

    // Intake border line
    const intakeOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(intakeGeo),
      new THREE.LineBasicMaterial({ color: 0x38bdf8 })
    );
    intakeOutline.position.copy(intakeMesh.position);
    tableGroup.add(intakeOutline);

    // Output Sorting Pallet (Right)
    const outtakeGeo = new THREE.BoxGeometry(140, 6, 140);
    const outtakeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const outtakeMesh = new THREE.Mesh(outtakeGeo, outtakeMat);
    outtakeMesh.position.set(200, 3, 100);
    outtakeMesh.receiveShadow = true;
    tableGroup.add(outtakeMesh);

    const outtakeOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(outtakeGeo),
      new THREE.LineBasicMaterial({ color: 0x22c55e })
    );
    outtakeOutline.position.copy(outtakeMesh.position);
    tableGroup.add(outtakeOutline);

    // 6. Reach envelope dome (wireframe)
    const domeGeo = new THREE.SphereGeometry(ROBOT_DIMENSIONS.MAX_REACH, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const reachDome = new THREE.Mesh(domeGeo, domeMat);
    reachDome.position.set(0, ROBOT_DIMENSIONS.L1, 0);
    reachDome.visible = false;
    scene.add(reachDome);
    reachDomeRef.current = reachDome;

    // 7. Robot Hierarchy Creation
    const baseGroup = new THREE.Group();
    scene.add(baseGroup);
    baseGroupRef.current = baseGroup;

    // Robot Shared Materials
    const primaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.primary),
      roughness: 0.25,
      metalness: 0.4,
    });
    const secondaryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.secondary),
      roughness: 0.5,
      metalness: 0.7,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.accent),
      roughness: 0.2,
      metalness: 0.3,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.85,
    });
    materialsRef.current = {
      primary: primaryMat,
      secondary: secondaryMat,
      accent: accentMat,
      metal: metalMat,
    };

    // Base Pedestal
    const basePlateGeo = new THREE.CylinderGeometry(85, 95, 24, 32);
    const basePlate = new THREE.Mesh(basePlateGeo, secondaryMat);
    basePlate.position.y = 12;
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    baseGroup.add(basePlate);

    // Hazard ring stripe
    const hazardRingGeo = new THREE.CylinderGeometry(86, 86, 6, 32);
    const hazardRingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const hazardRing = new THREE.Mesh(hazardRingGeo, hazardRingMat);
    hazardRing.position.y = 12;
    baseGroup.add(hazardRing);

    // J1 Turntable (Rotates around Y)
    const j1Group = new THREE.Group();
    j1Group.position.y = 24;
    baseGroup.add(j1Group);
    j1GroupRef.current = j1Group;

    const j1TurntableGeo = new THREE.CylinderGeometry(75, 78, 22, 32);
    const j1Turntable = new THREE.Mesh(j1TurntableGeo, primaryMat);
    j1Turntable.position.y = 11;
    j1Turntable.castShadow = true;
    j1Group.add(j1Turntable);

    // Shoulder base upright column
    const shoulderPillarGeo = new THREE.CylinderGeometry(42, 50, ROBOT_DIMENSIONS.L1 - 24, 24);
    const shoulderPillar = new THREE.Mesh(shoulderPillarGeo, secondaryMat);
    shoulderPillar.position.y = (ROBOT_DIMENSIONS.L1 - 24) / 2 + 22;
    shoulderPillar.castShadow = true;
    j1Group.add(shoulderPillar);

    // J2 Shoulder Joint Pivot (Positioned at L1, rotates around X)
    const j2Group = new THREE.Group();
    j2Group.position.y = ROBOT_DIMENSIONS.L1;
    j1Group.add(j2Group);
    j2GroupRef.current = j2Group;

    // Shoulder sphere/cylinder hub
    const j2HubGeo = new THREE.CylinderGeometry(36, 36, 52, 24);
    j2HubGeo.rotateZ(Math.PI / 2);
    const j2Hub = new THREE.Mesh(j2HubGeo, accentMat);
    j2Hub.castShadow = true;
    j2Group.add(j2Hub);

    // Counterweight cylinder behind shoulder
    const counterGeo = new THREE.BoxGeometry(45, 40, 50);
    const counterMesh = new THREE.Mesh(counterGeo, secondaryMat);
    counterMesh.position.set(0, -10, -45);
    counterMesh.castShadow = true;
    j2Group.add(counterMesh);

    // Upper Arm Link (L2 length)
    const upperArmGeo = new THREE.BoxGeometry(32, ROBOT_DIMENSIONS.L2, 36);
    const upperArm = new THREE.Mesh(upperArmGeo, primaryMat);
    upperArm.position.y = ROBOT_DIMENSIONS.L2 / 2;
    upperArm.castShadow = true;
    j2Group.add(upperArm);

    // Decorative hydraulic rod alongside upper arm
    const hydroGeo = new THREE.CylinderGeometry(8, 8, ROBOT_DIMENSIONS.L2 * 0.85, 16);
    const hydroMesh = new THREE.Mesh(hydroGeo, metalMat);
    hydroMesh.position.set(22, ROBOT_DIMENSIONS.L2 * 0.45, 0);
    hydroMesh.castShadow = true;
    j2Group.add(hydroMesh);

    // J3 Elbow Joint Pivot (Positioned at L2, rotates around X)
    const j3Group = new THREE.Group();
    j3Group.position.y = ROBOT_DIMENSIONS.L2;
    j2Group.add(j3Group);
    j3GroupRef.current = j3Group;

    const j3HubGeo = new THREE.CylinderGeometry(28, 28, 44, 24);
    j3HubGeo.rotateZ(Math.PI / 2);
    const j3Hub = new THREE.Mesh(j3HubGeo, accentMat);
    j3Hub.castShadow = true;
    j3Group.add(j3Hub);

    // Forearm Link (L3 length)
    const forearmGeo = new THREE.BoxGeometry(26, ROBOT_DIMENSIONS.L3, 28);
    const forearm = new THREE.Mesh(forearmGeo, primaryMat);
    forearm.position.y = ROBOT_DIMENSIONS.L3 / 2;
    forearm.castShadow = true;
    j3Group.add(forearm);

    // J4 Wrist Pitch Pivot (Positioned at L3, rotates around X)
    const j4Group = new THREE.Group();
    j4Group.position.y = ROBOT_DIMENSIONS.L3;
    j3Group.add(j4Group);
    j4GroupRef.current = j4Group;

    const j4HubGeo = new THREE.CylinderGeometry(20, 20, 34, 20);
    j4HubGeo.rotateZ(Math.PI / 2);
    const j4Hub = new THREE.Mesh(j4HubGeo, secondaryMat);
    j4Hub.castShadow = true;
    j4Group.add(j4Hub);

    // J5 Wrist Roll Flange (Positioned along forearm extension, rotates around Y)
    const j5Group = new THREE.Group();
    j5Group.position.y = 25;
    j4Group.add(j5Group);
    j5GroupRef.current = j5Group;

    // Wrist Flange
    const flangeGeo = new THREE.CylinderGeometry(22, 22, 16, 24);
    const flangeMesh = new THREE.Mesh(flangeGeo, metalMat);
    flangeMesh.position.y = 8;
    flangeMesh.castShadow = true;
    j5Group.add(flangeMesh);

    // Gripper Base Mount
    const gripperBaseGeo = new THREE.BoxGeometry(54, 18, 24);
    const gripperBase = new THREE.Mesh(gripperBaseGeo, secondaryMat);
    gripperBase.position.y = 25;
    gripperBase.castShadow = true;
    j5Group.add(gripperBase);

    // Pneumatic cylinder accent
    const cylGeo = new THREE.CylinderGeometry(6, 6, 20, 16);
    cylGeo.rotateZ(Math.PI / 2);
    const cylMesh = new THREE.Mesh(cylGeo, accentMat);
    cylMesh.position.y = 25;
    j5Group.add(cylMesh);

    // Left Finger Jaw
    const fingerGeo = new THREE.BoxGeometry(8, ROBOT_DIMENSIONS.L4 - 30, 14);
    const leftFinger = new THREE.Mesh(fingerGeo, metalMat);
    leftFinger.position.set(-18, 25 + (ROBOT_DIMENSIONS.L4 - 30) / 2, 0);
    leftFinger.castShadow = true;
    j5Group.add(leftFinger);
    leftFingerRef.current = leftFinger;

    // Right Finger Jaw
    const rightFinger = new THREE.Mesh(fingerGeo, metalMat);
    rightFinger.position.set(18, 25 + (ROBOT_DIMENSIONS.L4 - 30) / 2, 0);
    rightFinger.castShadow = true;
    j5Group.add(rightFinger);
    rightFingerRef.current = rightFinger;

    // Rubber pads on tips
    const padGeo = new THREE.BoxGeometry(3, 14, 12);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const leftPad = new THREE.Mesh(padGeo, padMat);
    leftPad.position.set(3, 12, 0);
    leftFinger.add(leftPad);

    const rightPad = new THREE.Mesh(padGeo, padMat);
    rightPad.position.set(-3, 12, 0);
    rightFinger.add(rightPad);

    // Tool Center Point (TCP) Marker Triad
    const tcpGroup = new THREE.Group();
    tcpGroup.position.y = ROBOT_DIMENSIONS.L4;
    j5Group.add(tcpGroup);
    tcpMarkerRef.current = tcpGroup;

    const axesHelper = new THREE.AxesHelper(35);
    tcpGroup.add(axesHelper);

    // TCP Tip sphere
    const tcpSphere = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    tcpGroup.add(tcpSphere);

    // Laser Beam Pointer (Projects straight forward from TCP)
    const laserMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 300, 0),
    ]);
    const laserBeam = new THREE.Line(laserGeo, laserMat);
    laserBeam.visible = false;
    tcpGroup.add(laserBeam);
    laserBeamRef.current = laserBeam;

    // IK Target visualizer sphere
    const ikTargetGeo = new THREE.SphereGeometry(12, 16, 16);
    const ikTargetMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.3,
      emissive: 0x15803d,
      emissiveIntensity: 0.6,
      wireframe: true,
    });
    const ikTargetMarker = new THREE.Mesh(ikTargetGeo, ikTargetMat);
    ikTargetMarker.visible = false;
    scene.add(ikTargetMarker);
    ikTargetMarkerRef.current = ikTargetMarker;

    // 8. Trajectory Trail Line
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      linewidth: 2,
    });
    const trailGeo = new THREE.BufferGeometry();
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // 9. Mouse controls for Orbit / Pan / Zoom
    const handleMouseDown = (e: MouseEvent) => {
      orbitState.current.isDragging = true;
      orbitState.current.dragButton = e.button;
      orbitState.current.prevX = e.clientX;
      orbitState.current.prevY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!orbitState.current.isDragging) return;
      const dx = e.clientX - orbitState.current.prevX;
      const dy = e.clientY - orbitState.current.prevY;
      orbitState.current.prevX = e.clientX;
      orbitState.current.prevY = e.clientY;

      if (orbitState.current.dragButton === 0) {
        // Orbit rotation
        orbitState.current.theta -= dx * 0.007;
        orbitState.current.phi = Math.max(0.08, Math.min(Math.PI / 2.05, orbitState.current.phi - dy * 0.007));
      } else if (orbitState.current.dragButton === 2) {
        // Pan
        const panSpeed = 0.55;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        orbitState.current.target.addScaledVector(right, -dx * panSpeed);
        orbitState.current.target.y += dy * panSpeed;
      }
    };

    const handleMouseUp = () => {
      orbitState.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitState.current.radius = Math.max(240, Math.min(1800, orbitState.current.radius + e.deltaY * 0.75));
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('contextmenu', handleContextMenu);

    // 10. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 11. Animation Render Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Update camera position from spherical coords
      const { theta, phi, radius, target } = orbitState.current;
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);

      // Record trajectory point from TCP
      if (tcpMarkerRef.current && showTrail) {
        const worldPos = new THREE.Vector3();
        tcpMarkerRef.current.getWorldPosition(worldPos);
        const pts = trailPointsRef.current;
        if (pts.length === 0 || pts[pts.length - 1].distanceTo(worldPos) > 4) {
          pts.push(worldPos.clone());
          if (pts.length > 250) pts.shift();
          if (trailLineRef.current) {
            trailLineRef.current.geometry.setFromPoints(pts);
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Joint Rotations smoothly
  useEffect(() => {
    if (!j1GroupRef.current || !j2GroupRef.current || !j3GroupRef.current || !j4GroupRef.current || !j5GroupRef.current) return;

    // J1: Base Azimuth (around Y axis)
    j1GroupRef.current.rotation.y = degToRad(joints.j1);

    // J2: Shoulder Pitch (around X axis)
    j2GroupRef.current.rotation.x = degToRad(joints.j2);

    // J3: Elbow Pitch (around X axis)
    j3GroupRef.current.rotation.x = degToRad(joints.j3);

    // J4: Wrist Pitch (around X axis)
    j4GroupRef.current.rotation.x = degToRad(joints.j4);

    // J5: Wrist Roll (around Y axis)
    j5GroupRef.current.rotation.y = degToRad(joints.j5);

    // Gripper aperture: fingers slide horizontally
    const span = 6 + (joints.gripper / 100) * 18;
    if (leftFingerRef.current) leftFingerRef.current.position.x = -span;
    if (rightFingerRef.current) rightFingerRef.current.position.x = span;

    // Check interaction with physical blocks
    if (tcpMarkerRef.current) {
      const tcpWorld = new THREE.Vector3();
      tcpMarkerRef.current.getWorldPosition(tcpWorld);

      onUpdateBlocks((prevBlocks) => {
        let changed = false;
        const next = prevBlocks.map((b) => {
          const dist = Math.hypot(b.x - tcpWorld.x, b.y - tcpWorld.y, b.z - tcpWorld.z);

          // If gripper is closed (< 30%) and close to a block -> pick it up
          if (joints.gripper < 30 && dist < 42 && !heldBlockIdRef.current) {
            heldBlockIdRef.current = b.id;
            changed = true;
            return { ...b, isHeld: true, x: tcpWorld.x, y: Math.max(b.size / 2, tcpWorld.y - 12), z: tcpWorld.z };
          }

          // If holding this block, move with TCP
          if (b.isHeld && b.id === heldBlockIdRef.current) {
            if (joints.gripper >= 35) {
              // Release block to table
              heldBlockIdRef.current = null;
              changed = true;
              return { ...b, isHeld: false, y: b.size / 2 };
            }
            // Move with TCP
            changed = true;
            return { ...b, x: tcpWorld.x, y: Math.max(b.size / 2, tcpWorld.y - 12), z: tcpWorld.z };
          }

          return b;
        });

        return changed ? next : prevBlocks;
      });
    }
  }, [joints, onUpdateBlocks]);

  // Sync Interactive Blocks to 3D Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMap = blockMeshesRef.current;

    blocks.forEach((block) => {
      let mesh = currentMap.get(block.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(block.size, block.size, block.size);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(block.color),
          roughness: 0.3,
          metalness: 0.5,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        currentMap.set(block.id, mesh);
      }
      mesh.position.set(block.x, block.y, block.z);
    });

    // Remove deleted blocks
    for (const [id, mesh] of currentMap.entries()) {
      if (!blocks.find((b) => b.id === id)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        currentMap.delete(id);
      }
    }
  }, [blocks]);

  // Update Theme Materials
  useEffect(() => {
    if (materialsRef.current.primary) materialsRef.current.primary.color.set(theme.primary);
    if (materialsRef.current.secondary) materialsRef.current.secondary.color.set(theme.secondary);
    if (materialsRef.current.accent) materialsRef.current.accent.color.set(theme.accent);
  }, [theme]);

  // Visual Collision Highlight Effect on Blocks and Manipulator
  useEffect(() => {
    const currentMap = blockMeshesRef.current;

    blocks.forEach((block) => {
      const mesh = currentMap.get(block.id);
      if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        if (collision?.hasCollision && collision.collidingBlockId === block.id) {
          // Intense flashing warning red on colliding block
          mesh.material.emissive.set(0xef4444);
          mesh.material.emissiveIntensity = 0.9;
        } else if (collision?.isProximityWarning && collision.minClearance < 20) {
          // Amber proximity warning
          mesh.material.emissive.set(0xf59e0b);
          mesh.material.emissiveIntensity = 0.35;
        } else {
          // Normal block appearance
          mesh.material.emissive.set(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      }
    });

    // Alert highlight on robot primary material when colliding
    if (materialsRef.current.primary) {
      if (collision?.hasCollision) {
        materialsRef.current.primary.emissive.set(0xb91c1c);
        materialsRef.current.primary.emissiveIntensity = 0.45;
      } else {
        materialsRef.current.primary.emissive.set(0x000000);
        materialsRef.current.primary.emissiveIntensity = 0;
      }
    }
  }, [collision, blocks]);

  // Toggle Overlays (Dome, Laser, Trail)
  useEffect(() => {
    if (reachDomeRef.current) reachDomeRef.current.visible = showReachEnvelope;
  }, [showReachEnvelope]);

  useEffect(() => {
    if (laserBeamRef.current) laserBeamRef.current.visible = showLaser;
  }, [showLaser]);

  useEffect(() => {
    if (!showTrail && trailLineRef.current) {
      trailPointsRef.current = [];
      trailLineRef.current.geometry.setFromPoints([]);
    }
  }, [showTrail]);

  // IK Target visualization
  useEffect(() => {
    if (!ikTargetMarkerRef.current) return;
    if (ikTarget) {
      ikTargetMarkerRef.current.visible = true;
      ikTargetMarkerRef.current.position.set(ikTarget.x, ikTarget.y, ikTarget.z);
    } else {
      ikTargetMarkerRef.current.visible = false;
    }
  }, [ikTarget]);

  // Camera Preset Handler
  const applyCameraPreset = useCallback(
    (preset: CameraPreset) => {
      onCameraPresetChange(preset);
      const orbit = orbitState.current;

      switch (preset) {
        case 'orbit':
          orbit.theta = Math.PI / 4;
          orbit.phi = Math.PI / 3.2;
          orbit.radius = 780;
          orbit.target.set(0, 160, 0);
          break;
        case 'top':
          orbit.theta = 0;
          orbit.phi = 0.05; // Almost straight down
          orbit.radius = 750;
          orbit.target.set(0, 0, 0);
          break;
        case 'front':
          orbit.theta = 0;
          orbit.phi = Math.PI / 2.05;
          orbit.radius = 700;
          orbit.target.set(0, 150, 0);
          break;
        case 'side':
          orbit.theta = Math.PI / 2;
          orbit.phi = Math.PI / 2.05;
          orbit.radius = 700;
          orbit.target.set(0, 150, 0);
          break;
        case 'wrist':
          if (tcpMarkerRef.current) {
            const worldPos = new THREE.Vector3();
            tcpMarkerRef.current.getWorldPosition(worldPos);
            orbit.target.copy(worldPos);
            orbit.radius = 280;
            orbit.phi = Math.PI / 2.5;
          }
          break;
      }
    },
    [onCameraPresetChange]
  );

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Camera Preset Quick Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 bg-slate-900/85 backdrop-blur-md rounded-lg border border-slate-800 shadow-xl">
        <button
          onClick={() => applyCameraPreset('orbit')}
          title="Isometric Orbit"
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            cameraPreset === 'orbit' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Orbit
        </button>
        <button
          onClick={() => applyCameraPreset('top')}
          title="Top Down Elevation"
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            cameraPreset === 'top' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Top
        </button>
        <button
          onClick={() => applyCameraPreset('front')}
          title="Front Profile"
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            cameraPreset === 'front' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Front
        </button>
        <button
          onClick={() => applyCameraPreset('side')}
          title="Side Profile"
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            cameraPreset === 'side' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Side
        </button>
        <button
          onClick={() => applyCameraPreset('wrist')}
          title="Tool Center Focus"
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            cameraPreset === 'wrist' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          TCP Cam
        </button>
      </div>

      {/* Floating Viewport Helpers */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-md border border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
          <span>Rotate: Left Click + Drag</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Pan: Right Click + Drag</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Zoom: Scroll</span>
        </div>
      </div>
    </div>
  );
};
