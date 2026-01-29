import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function Cubemap360({ faces, height = "70vh" }) {
  const mountRef = useRef(null);
  const [hint, setHint] = useState("Drag to look around • Scroll to zoom");

  useEffect(() => {
    if (!mountRef.current) return;

    if (
      !faces?.pano_front ||
      !faces?.pano_back ||
      !faces?.pano_left ||
      !faces?.pano_right ||
      !faces?.pano_up ||
      !faces?.pano_down
    ) {
      console.error("❌ Missing faces:", faces);
      setHint("❌ Missing one or more 360 images.");
      return;
    }

    const el = mountRef.current;
    el.innerHTML = "";

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      el.clientWidth / el.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // IMPORTANT: allow mouse/touch drag
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.pointerEvents = "auto";

    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    // ✅ AUTO ROTATE so you can SEE all sides even without dragging
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;

    // Stop auto-rotate when user interacts
    const stopAuto = () => {
      controls.autoRotate = false;
      setHint("Drag to look around • Scroll to zoom");
      renderer.domElement.style.cursor = "grabbing";
    };
    const stopGrab = () => {
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", stopAuto);
    renderer.domElement.addEventListener("pointerup", stopGrab);
    renderer.domElement.addEventListener("pointerleave", stopGrab);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    // Box materials order: [right, left, top, bottom, front, back]
    const texRight = loader.load(faces.pano_right);
    const texLeft = loader.load(faces.pano_left);
    const texTop = loader.load(faces.pano_up);
    const texBottom = loader.load(faces.pano_down);
    const texFront = loader.load(faces.pano_front);
    const texBack = loader.load(faces.pano_back);

    [texRight, texLeft, texTop, texBottom, texFront, texBack].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
    });

    const materials = [
      new THREE.MeshBasicMaterial({ map: texRight, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: texLeft, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: texTop, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: texBottom, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: texFront, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: texBack, side: THREE.BackSide }),
    ];

    const geometry = new THREE.BoxGeometry(500, 500, 500);
    const skybox = new THREE.Mesh(geometry, materials);
    scene.add(skybox);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    setHint("Auto-rotating… click/drag to control");

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);

      renderer.domElement.removeEventListener("pointerdown", stopAuto);
      renderer.domElement.removeEventListener("pointerup", stopGrab);
      renderer.domElement.removeEventListener("pointerleave", stopGrab);

      controls.dispose();
      geometry.dispose();
      materials.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
      renderer.dispose();

      if (renderer.domElement && el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [faces]);

  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #ddd",
          background: "#000",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          padding: "6px 10px",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {hint}
      </div>
    </div>
  );
}
