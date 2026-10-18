"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface MotorcycleSceneProps {
  interactive?: boolean;
  autoRotate?: boolean;
  cameraDistance?: number;
  height?: string | number;
  className?: string;
  variant?: "studio" | "hero" | "compact";
  fallbackImage?: string;
}

export default function MotorcycleScene({
  interactive = true,
  autoRotate = true,
  cameraDistance = 5.2,
  height = "100%",
  className = "",
  variant = "hero",
  fallbackImage = "/images/home-hero.jpg",
}: MotorcycleSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setWebGLSupported(false);
      return;
    }

    const width = container.clientWidth || 400;
    const heightPx = container.clientHeight || 300;

    // SCENE & CAMERA
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090c, 0.08);

    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 100);
    camera.position.set(cameraDistance * 0.9, cameraDistance * 0.45, cameraDistance * 1.1);
    camera.lookAt(0, 0.4, 0);

    // RENDERER
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, heightPx);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      container.appendChild(renderer.domElement);
    } catch {
      setWebGLSupported(false);
      return;
    }

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0x1a2130, 1.8);
    scene.add(ambientLight);

    // Key Light (Clean studio highlight)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    // Racing Orange Rim Light (Signature SevaiGo accent)
    const orangeRimLight = new THREE.DirectionalLight(0xff7900, 4.2);
    orangeRimLight.position.set(-6, 2.5, -4);
    scene.add(orangeRimLight);

    // Amber Headlight glow & front fill
    const amberFill = new THREE.PointLight(0xffb020, 2.5, 12);
    amberFill.position.set(2.8, 1.2, 0);
    scene.add(amberFill);

    // Soft top light
    const topLight = new THREE.PointLight(0x8fa4b8, 1.6, 10);
    topLight.position.set(0, 4, 0);
    scene.add(topLight);

    // MOTORCYCLE 3D MODEL HIERARCHY
    const bike = new THREE.Group();
    scene.add(bike);

    // Materials
    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f1318,
      roughness: 0.35,
      metalness: 0.85,
    });

    const carbonFairingMat = new THREE.MeshStandardMaterial({
      color: 0x161a22,
      roughness: 0.22,
      metalness: 0.9,
    });

    const racingOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xff7900,
      emissive: 0xff7900,
      emissiveIntensity: 0.75,
      roughness: 0.3,
      metalness: 0.7,
    });

    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c0e,
      roughness: 0.85,
      metalness: 0.15,
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x1f242b,
      roughness: 0.4,
      metalness: 0.95,
    });

    const goldForkMat = new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      roughness: 0.18,
      metalness: 0.95,
    });

    const chromeExhaustMat = new THREE.MeshStandardMaterial({
      color: 0xd2d8e0,
      roughness: 0.12,
      metalness: 0.98,
    });

    const headlightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffecd0,
      emissive: 0xffecd0,
      emissiveIntensity: 2.8,
      roughness: 0.1,
    });

    const tailLightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff3b14,
      emissive: 0xff2a00,
      emissiveIntensity: 3.2,
      roughness: 0.1,
    });

    // 1. REAR WHEEL
    const rearWheelGroup = new THREE.Group();
    rearWheelGroup.position.set(-1.25, 0.45, 0);

    const rearTireGeo = new THREE.TorusGeometry(0.42, 0.13, 20, 48);
    const rearTire = new THREE.Mesh(rearTireGeo, tireRubberMat);
    rearWheelGroup.add(rearTire);

    // Orange Rim Accent Ring
    const rearRimStripeGeo = new THREE.TorusGeometry(0.38, 0.015, 12, 48);
    const rearRimStripe = new THREE.Mesh(rearRimStripeGeo, racingOrangeMat);
    rearWheelGroup.add(rearRimStripe);

    // Hub & Spokes
    const rearRimHubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 18);
    rearRimHubGeo.rotateX(Math.PI / 2);
    const rearRimHub = new THREE.Mesh(rearRimHubGeo, darkAlloyMat);
    rearWheelGroup.add(rearRimHub);

    // 5-Spoke Star Design
    for (let i = 0; i < 5; i++) {
      const spokeGeo = new THREE.BoxGeometry(0.04, 0.35, 0.025);
      const spoke = new THREE.Mesh(spokeGeo, darkAlloyMat);
      spoke.rotation.z = (i * Math.PI * 2) / 5;
      rearWheelGroup.add(spoke);
    }

    // Rear Brake Disc
    const rearDiscGeo = new THREE.RingGeometry(0.14, 0.26, 24);
    const rearDisc = new THREE.Mesh(rearDiscGeo, darkAlloyMat);
    rearDisc.position.z = 0.08;
    rearWheelGroup.add(rearDisc);

    bike.add(rearWheelGroup);

    // 2. FRONT WHEEL
    const frontWheelGroup = new THREE.Group();
    frontWheelGroup.position.set(1.35, 0.45, 0);

    const frontTireGeo = new THREE.TorusGeometry(0.42, 0.1, 20, 48);
    const frontTire = new THREE.Mesh(frontTireGeo, tireRubberMat);
    frontWheelGroup.add(frontTire);

    const frontRimStripeGeo = new THREE.TorusGeometry(0.38, 0.015, 12, 48);
    const frontRimStripe = new THREE.Mesh(frontRimStripeGeo, racingOrangeMat);
    frontWheelGroup.add(frontRimStripe);

    const frontRimHubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 18);
    frontRimHubGeo.rotateX(Math.PI / 2);
    const frontRimHub = new THREE.Mesh(frontRimHubGeo, darkAlloyMat);
    frontWheelGroup.add(frontRimHub);

    for (let i = 0; i < 5; i++) {
      const spokeGeo = new THREE.BoxGeometry(0.035, 0.35, 0.02);
      const spoke = new THREE.Mesh(spokeGeo, darkAlloyMat);
      spoke.rotation.z = (i * Math.PI * 2) / 5;
      frontWheelGroup.add(spoke);
    }

    // Dual front brake discs
    const discL = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.3, 24), darkAlloyMat);
    discL.position.z = 0.07;
    const discR = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.3, 24), darkAlloyMat);
    discR.position.z = -0.07;
    frontWheelGroup.add(discL);
    frontWheelGroup.add(discR);

    // Front Orange Brake Calipers
    const caliperL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), racingOrangeMat);
    caliperL.position.set(-0.24, 0.14, 0.08);
    frontWheelGroup.add(caliperL);

    bike.add(frontWheelGroup);

    // 3. FRONT FORK & STEERING (Rake angle)
    const forkGroup = new THREE.Group();
    forkGroup.position.set(1.35, 0.45, 0);
    forkGroup.rotation.z = -0.42; // Rake

    const forkTubeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.95, 16);
    const forkL = new THREE.Mesh(forkTubeGeo, goldForkMat);
    forkL.position.set(0, 0.45, 0.11);
    const forkR = new THREE.Mesh(forkTubeGeo, goldForkMat);
    forkR.position.set(0, 0.45, -0.11);
    forkGroup.add(forkL);
    forkGroup.add(forkR);

    // Triple clamp & Handlebars
    const tripleClamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.3), darkAlloyMat);
    tripleClamp.position.set(0, 0.9, 0);
    forkGroup.add(tripleClamp);

    const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 12);
    barGeo.rotateX(Math.PI / 2);
    const handlebar = new THREE.Mesh(barGeo, matteBlackMat);
    handlebar.position.set(-0.04, 0.93, 0);
    forkGroup.add(handlebar);

    // Bar-end mirrors
    const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), matteBlackMat);
    mirrorL.position.set(-0.04, 0.96, 0.34);
    const mirrorR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), matteBlackMat);
    mirrorR.position.set(-0.04, 0.96, -0.34);
    forkGroup.add(mirrorL);
    forkGroup.add(mirrorR);

    bike.add(forkGroup);

    // 4. MAIN CHASSIS & ENGINE
    const chassisGroup = new THREE.Group();

    // Twin-spar frame (Alloy)
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.06), matteBlackMat);
    frameL.position.set(0.15, 0.75, 0.16);
    frameL.rotation.z = -0.22;
    chassisGroup.add(frameL);

    const frameR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.06), matteBlackMat);
    frameR.position.set(0.15, 0.75, -0.16);
    frameR.rotation.z = -0.22;
    chassisGroup.add(frameR);

    // Engine Block (Sculpted cylinders with cooling ribs)
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.32), darkAlloyMat);
    engineBlock.position.set(0.05, 0.46, 0);
    chassisGroup.add(engineBlock);

    // Engine Clutch Cover with Orange Accent
    const clutchCover = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), racingOrangeMat);
    clutchCover.rotateX(Math.PI / 2);
    clutchCover.position.set(0.12, 0.42, 0.17);
    chassisGroup.add(clutchCover);

    // Swingarm (Connecting rear wheel)
    const swingarm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.22), darkAlloyMat);
    swingarm.position.set(-0.6, 0.48, 0);
    swingarm.rotation.z = 0.08;
    chassisGroup.add(swingarm);

    // Rear Mono Shock (Orange spring)
    const shockSpring = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 12), racingOrangeMat);
    shockSpring.position.set(-0.35, 0.65, 0);
    shockSpring.rotation.z = -0.7;
    chassisGroup.add(shockSpring);

    // 5. BODYWORK: FUEL TANK & COWL (Sleek aerodynamic curves)
    const tankGeo = new THREE.BoxGeometry(0.75, 0.38, 0.38);
    // Bevel tank corners visually
    const tank = new THREE.Mesh(tankGeo, carbonFairingMat);
    tank.position.set(0.35, 0.95, 0);
    tank.rotation.z = -0.12;
    chassisGroup.add(tank);

    // Orange racing stripe on tank top
    const tankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.08), racingOrangeMat);
    tankStripe.position.set(0.35, 1.15, 0);
    tankStripe.rotation.z = -0.12;
    chassisGroup.add(tankStripe);

    // Aerodynamic Front Fairing / Headlight Mask
    const fairingGeo = new THREE.ConeGeometry(0.24, 0.55, 4);
    fairingGeo.rotateZ(-Math.PI / 2);
    fairingGeo.rotateY(Math.PI / 4);
    const frontFairing = new THREE.Mesh(fairingGeo, carbonFairingMat);
    frontFairing.position.set(1.05, 0.92, 0);
    chassisGroup.add(frontFairing);

    // Twin LED Headlights (Glowing)
    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.1), headlightGlowMat);
    headL.position.set(1.28, 0.88, 0.08);
    const headR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.1), headlightGlowMat);
    headR.position.set(1.28, 0.88, -0.08);
    chassisGroup.add(headL);
    chassisGroup.add(headR);

    // Headlight Spot Projector forward
    const spotBeam = new THREE.SpotLight(0xffedd5, 4.0, 14, Math.PI / 6, 0.4);
    spotBeam.position.set(1.3, 0.88, 0);
    spotBeam.target.position.set(6, 0.1, 0);
    scene.add(spotBeam);
    scene.add(spotBeam.target);

    // Rider Seat (Ergonomic suede dark cushion)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.9 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.28), seatMat);
    seat.position.set(-0.25, 0.88, 0);
    seat.rotation.z = 0.08;
    chassisGroup.add(seat);

    // Tail Cowl (Sharp racing style)
    const tailCowl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 4), carbonFairingMat);
    tailCowl.rotateZ(Math.PI / 2);
    tailCowl.rotateY(Math.PI / 4);
    tailCowl.position.set(-0.7, 0.94, 0);
    chassisGroup.add(tailCowl);

    // Rear LED Tail Light (Glowing bright red/orange strip)
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), tailLightGlowMat);
    tailLight.position.set(-1.02, 0.96, 0);
    chassisGroup.add(tailLight);

    // 6. EXHAUST SYSTEM (Chrome headers & Carbon/orange canister)
    const headerPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12);
    headerPipeGeo.rotateZ(1.2);
    const headerPipe = new THREE.Mesh(headerPipeGeo, chromeExhaustMat);
    headerPipe.position.set(0.1, 0.28, 0.22);
    chassisGroup.add(headerPipe);

    const mufflerGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.55, 16);
    mufflerGeo.rotateZ(0.55);
    const muffler = new THREE.Mesh(mufflerGeo, matteBlackMat);
    muffler.position.set(-0.45, 0.45, 0.25);
    chassisGroup.add(muffler);

    // Exhaust Tip & Orange Badge
    const mufflerBadge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.01), racingOrangeMat);
    mufflerBadge.position.set(-0.42, 0.47, 0.32);
    chassisGroup.add(mufflerBadge);

    bike.add(chassisGroup);

    // Center bike slightly
    bike.position.set(-0.05, 0, 0);

    // 7. WET STUDIO FLOOR / REFLECTION PODIUM
    const floorGeo = new THREE.CircleGeometry(3.6, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080b0f,
      roughness: 0.15,
      metalness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.02;
    scene.add(floor);

    // Subtle orange ground glow ring
    const groundRingGeo = new THREE.RingGeometry(2.4, 2.5, 48);
    groundRingGeo.rotateX(-Math.PI / 2);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0xff7900,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.position.y = 0.025;
    scene.add(groundRing);

    // 8. FLOATING EMBER PARTICLES
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 1] = Math.random() * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = 0.003 + Math.random() * 0.004;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xff9520,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // INTERACTION & ANIMATION LOOP
    let isDragging = false;
    let prevMouseX = 0;
    let targetRotationY = 0;
    let currentRotationY = 0;
    let clock = new THREE.Clock();

    const onMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDragging = true;
      prevMouseX = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !interactive) return;
      const delta = e.clientX - prevMouseX;
      targetRotationY += delta * 0.008;
      prevMouseX = e.clientX;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!interactive || e.touches.length === 0) return;
      isDragging = true;
      prevMouseX = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !interactive || e.touches.length === 0) return;
      const delta = e.touches[0].clientX - prevMouseX;
      targetRotationY += delta * 0.01;
      prevMouseX = e.touches[0].clientX;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onMouseUp);

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth damped rotation
      if (autoRotate && !isDragging) {
        targetRotationY += 0.004;
      }
      currentRotationY += (targetRotationY - currentRotationY) * 0.08;
      bike.rotation.y = currentRotationY;

      // Subtle suspension breathing float
      bike.position.y = Math.sin(elapsed * 1.8) * 0.035;

      // Animate particles drifting upward
      const posAttr = particleGeo.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        arr[i * 3 + 1] += velocities[i * 3 + 1];
        arr[i * 3] += velocities[i * 3];
        if (arr[i * 3 + 1] > 3.0) {
          arr[i * 3 + 1] = 0.05;
          arr[i * 3] = (Math.random() - 0.5) * 4;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
      window.removeEventListener("resize", handleResize);
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [interactive, autoRotate, cameraDistance, variant]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full overflow-hidden select-none touch-pan-y ${className}`}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Fallback image when WebGL is unsupported */}
      {!webGLSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#07090c]">
          <img
            src={fallbackImage}
            alt="SevaiGo 3D Superbike"
            className="w-full h-full object-cover opacity-90 filter drop-shadow-[0_15px_35px_rgba(255,121,0,0.25)]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090c] via-transparent to-[#07090c]/80 pointer-events-none" />
        </div>
      )}

      {/* Subtle interaction tip badge when user hovers */}
      {interactive && webGLSupported && isHovered && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-semibold tracking-wider text-[#A5ADB8] pointer-events-none backdrop-blur-sm transition-opacity duration-300">
          DRAG TO ROTATE 3D BIKE
        </div>
      )}
    </div>
  );
}
