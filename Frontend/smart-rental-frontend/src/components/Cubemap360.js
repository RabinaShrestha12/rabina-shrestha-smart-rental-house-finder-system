import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function Cubemap360({ faces, height = "70vh" }) {
  const mountRef = useRef(null);
  const [hint, setHint] = useState("Loading 360…");

  useEffect(() => {
    if (!mountRef.current) return;

    const front = faces?.pano_front ?? faces?.front;
    const back = faces?.pano_back ?? faces?.back;
    const left = faces?.pano_left ?? faces?.left;
    const right = faces?.pano_right ?? faces?.right;
    const top = faces?.pano_up ?? faces?.up ?? faces?.top;
    const bottom = faces?.pano_down ?? faces?.down ?? faces?.bottom;

    if (!front || !back || !left || !right || !top || !bottom) {
      console.error("❌ Missing faces:", { front, back, left, right, top, bottom });
      setHint("❌ Missing one or more 360 images.");
      return;
    }

    const el = mountRef.current;
    el.innerHTML = "";

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      70,
      el.clientWidth / el.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

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
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;

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

    const loadTex = (url) =>
      new Promise((resolve, reject) => {
        loader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            resolve(tex);
          },
          undefined,
          (err) => reject(err)
        );
      });

    let geometry = null;
    let materials = null;
    let skybox = null;
    let raf = 0;

    (async () => {
      try {
        setHint("Loading 360 faces…");

        // Box materials order: [right, left, top, bottom, front, back]
        const [texRight, texLeft, texTop, texBottom, texFront, texBack] =
          await Promise.all([
            loadTex(right),
            loadTex(left),
            loadTex(top),
            loadTex(bottom),
            loadTex(front),
            loadTex(back),
          ]);

        materials = [
          new THREE.MeshBasicMaterial({ map: texRight, side: THREE.BackSide }),
          new THREE.MeshBasicMaterial({ map: texLeft, side: THREE.BackSide }),
          new THREE.MeshBasicMaterial({ map: texTop, side: THREE.BackSide }),
          new THREE.MeshBasicMaterial({ map: texBottom, side: THREE.BackSide }),
          new THREE.MeshBasicMaterial({ map: texFront, side: THREE.BackSide }),
          new THREE.MeshBasicMaterial({ map: texBack, side: THREE.BackSide }),
        ];

        geometry = new THREE.BoxGeometry(500, 500, 500);
        skybox = new THREE.Mesh(geometry, materials);
        scene.add(skybox);

        setHint("Auto-rotating… click/drag to control");

        const animate = () => {
          raf = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();
      } catch (e) {
        console.error("❌ Texture load failed:", e);
        setHint("❌ Failed to load one or more 360 images (URL/CORS issue).");
      }
    })();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);

      renderer.domElement.removeEventListener("pointerdown", stopAuto);
      renderer.domElement.removeEventListener("pointerup", stopGrab);
      renderer.domElement.removeEventListener("pointerleave", stopGrab);

      controls.dispose();

      if (skybox) scene.remove(skybox);
      if (geometry) geometry.dispose();

      if (materials) {
        materials.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }

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
