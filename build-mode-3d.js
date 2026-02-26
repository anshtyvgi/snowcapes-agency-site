import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function initBuildMode() {
    const section = document.getElementById('what-we-do');
    const container = document.getElementById('bm-canvas');
    const finalEl = document.getElementById('bm-final');
    const headline = document.getElementById('bm-headline');
    const labelEls = document.querySelectorAll('.bm-label');

    if (!section || !container) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'bm-three';
    container.appendChild(canvas);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.011);

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 120);

    // Start below, looking up at center of tube
    const CAM_START = new THREE.Vector3(2.2, -7, 9);
    const CAM_END = new THREE.Vector3(1.5, 10, 6);
    const LOOK_START = new THREE.Vector3(0, -5, 0);
    const LOOK_END = new THREE.Vector3(0, 11, 0);

    camera.position.copy(CAM_START);
    camera.lookAt(LOOK_START);

    // ── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.06));
    const rim = new THREE.DirectionalLight(0xffaa44, 0.3);
    rim.position.set(-3, 5, 4);
    scene.add(rim);

    // ── Vertical Curve ────────────────────────────────────────────────────────
    // Rises upward: bottom = idea, top = data
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -8, 0),
        new THREE.Vector3(0.6, -3.5, -0.8),
        new THREE.Vector3(-0.4, -0.5, 0.4),
        new THREE.Vector3(0.3, 3.5, -0.5),
        new THREE.Vector3(0, 8, 0),
    ], false, 'catmullrom', 0.5);

    // ── TubeGeometry ──────────────────────────────────────────────────────────
    const tubeGeo = new THREE.TubeGeometry(curve, 300, 0.025, 12, false);

    // Custom ShaderMaterial — orange filament with edge glow + animated energy pulse
    const tubeMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uProgress: { value: 0 },  // 0 → 1 as tube "reveals" upward
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            uniform float uProgress;
            varying vec2 vUv;
            varying vec3 vPosition;

            void main() {
                // Discard fragments above current progress (tube draws upward)
                if (vUv.y > uProgress) discard;

                // Edge glow — brighter at tube center, dimmer at rim
                float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;
                float core = pow(radial, 1.4);

                // Upward-moving energy pulse along tube length
                float pulse = 0.78 + sin(vUv.y * 18.0 - uTime * 2.4) * 0.22;

                // Fade near leading edge for clean draw effect
                float edgeFade = smoothstep(0.0, 0.04, uProgress - vUv.y);

                // Orange: rgb(1.0, 0.41, 0.0)
                vec3 color = vec3(1.0, 0.41, 0.0) * core * pulse * edgeFade;

                // Alpha — fully opaque center, slight transparency at rim
                float alpha = core * 0.98 * edgeFade;

                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tube);

    // ── Particle atmosphere — tiny floating sparks ────────────────────────────
    const PARTICLE_COUNT = 220;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        pPositions[i * 3 + 0] = (Math.random() - 0.5) * 6;
        pPositions[i * 3 + 1] = Math.random() * 18 - 8;
        pPositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
        color: 0xff8822,
        size: 0.022,
        transparent: true,
        opacity: 0.35,
        sizeAttenuation: true,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Milestone Nodes (emissive orange spheres) ─────────────────────────────
    const MILESTONE_T = [0.18, 0.38, 0.62, 0.83];
    const milestoneLabels = ['01 — Define core loop', '02 — Build product', '03 — Launch', '04 — Real data'];

    const nodes = MILESTONE_T.map((t, i) => {
        const pos = curve.getPoint(t);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: new THREE.Color(0xff6600),
            emissiveIntensity: 0,
            roughness: 0.3,
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 20), mat);
        mesh.position.copy(pos);
        mesh.scale.setScalar(0);
        scene.add(mesh);
        return { mesh, mat, t, pos, revealed: false };
    });

    // ── Bloom ─────────────────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
        new THREE.Vector2(W(), H()),
        1.55,  // strength
        0.4,   // radius
        0.18   // threshold — very low so the orange tube blooms hard
    );
    composer.addPass(bloom);

    // ── Mouse parallax ────────────────────────────────────────────────────────
    let mouseX = 0, mouseY = 0;
    const onMouse = e => {
        mouseX = (e.clientX / W() - 0.5);
        mouseY = -(e.clientY / H() - 0.5);
    };
    window.addEventListener('mousemove', onMouse);

    // ── Scroll progress ───────────────────────────────────────────────────────
    function getScrollProgress() {
        const rect = section.getBoundingClientRect();
        const total = section.offsetHeight - H();
        return Math.max(0, Math.min(1, -rect.top / total));
    }

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
        renderer.setSize(W(), H());
        composer.setSize(W(), H());
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        bloom.resolution.set(W(), H());
    };
    window.addEventListener('resize', onResize);

    // ── Project 3D node → HTML label CSS position ────────────────────────────
    const _v = new THREE.Vector3();
    function updateLabels(progress) {
        nodes.forEach((node, i) => {
            const el = labelEls[i];
            if (!el) return;
            // Show label a bit before the node so text is ready when it arrives
            const inRange = progress >= node.t - 0.10 && progress <= node.t + 0.28;
            if (!inRange) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; }

            // Project to screen
            _v.copy(node.pos).project(camera);
            const x = (_v.x * 0.5 + 0.5) * W();
            const y = (-_v.y * 0.5 + 0.5) * H();

            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            el.style.left = (x + 30) + 'px';
            el.style.top = (y - 20) + 'px';
        });
    }

    // ── Ease ──────────────────────────────────────────────────────────────────
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // ── Animation state ───────────────────────────────────────────────────────
    let markerDone = [false, false, false, false];
    let finalDone = false;
    let rafId;

    const _camPos = new THREE.Vector3();
    const _lookAt = new THREE.Vector3();

    function animate(ts) {
        rafId = requestAnimationFrame(animate);

        const scrollP = getScrollProgress();
        const easedP = ease(scrollP);

        // ── Update shader uniforms
        tubeMat.uniforms.uTime.value = ts * 0.001;
        tubeMat.uniforms.uProgress.value = scrollP;  // tube draws as you scroll

        // ── Camera moves upward along scroll
        _camPos.lerpVectors(CAM_START, CAM_END, easedP);
        _camPos.x += mouseX * 0.4;
        _camPos.y += mouseY * 0.2;
        camera.position.copy(_camPos);

        _lookAt.lerpVectors(LOOK_START, LOOK_END, easedP);
        camera.lookAt(_lookAt);

        // ── Node reveal — spring in when scroll passes threshold
        MILESTONE_T.forEach((t, i) => {
            if (!markerDone[i] && scrollP >= t) {
                markerDone[i] = true;
                const mesh = nodes[i].mesh;
                let s = 0;
                const spring = () => {
                    s = Math.min(s + 0.055, 1);
                    mesh.scale.setScalar(ease(s) * (1 + Math.sin(s * Math.PI) * 0.25));
                    if (s < 1) requestAnimationFrame(spring);
                    else mesh.scale.setScalar(1);
                };
                requestAnimationFrame(spring);
                // Show label immediately (no delay)
                if (labelEls[i]) labelEls[i].classList.add('active');
            }
            // Emissive pulse on active nodes
            if (markerDone[i]) {
                nodes[i].mat.emissiveIntensity = 0.25 + Math.sin(ts * 0.002 + i * 1.4) * 0.12;
            }
        });

        // ── Particles drift upward slowly
        const pos = pGeo.attributes.position;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            pos.array[i * 3 + 1] += 0.003;
            if (pos.array[i * 3 + 1] > 10) pos.array[i * 3 + 1] = -8;
        }
        pos.needsUpdate = true;

        // ── Final reveal at 92% scroll
        if (scrollP >= 0.92 && !finalDone) {
            finalDone = true;
            if (finalEl) finalEl.classList.add('visible');
        }

        updateLabels();
        composer.render();
    }

    // ── Labels: track each dot's 3D→2D projected position every frame ─────────
    const _v3 = new THREE.Vector3();
    function updateLabels() {
        nodes.forEach((node, i) => {
            const el = labelEls[i];
            if (!el) return;

            // Project node's world position into NDC
            _v3.copy(node.pos).project(camera);

            // Check if behind camera or outside viewport
            const inFrustum = _v3.z < 1 &&
                _v3.x > -1.3 && _v3.x < 1.3 &&
                _v3.y > -1.3 && _v3.y < 1.3;

            if (!inFrustum || !markerDone[i]) {
                el.style.opacity = '0';
                return;
            }

            // Convert NDC → screen px
            const sx = (_v3.x *  0.5 + 0.5) * W();
            const sy = (-_v3.y * 0.5 + 0.5) * H();

            // Fade based on how centred the node is vertically
            const edgeFade = 1 - Math.pow(Math.abs(_v3.y), 2.5);
            const opacity  = Math.max(0, Math.min(1, edgeFade * 2));

            el.style.opacity  = opacity;
            el.style.left     = (sx + 22) + 'px';
            el.style.top      = (sy - 18) + 'px';
            el.style.transform = 'none'; // position drives placement
        });
    }

    // ── Trigger on scroll enter ───────────────────────────────────────────────
    let triggered = false;

    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting && !triggered) {
                triggered = true;
                headline && setTimeout(() => headline.classList.add('visible'), 100);
                container.style.opacity = '1';
                requestAnimationFrame(animate);
                obs.disconnect();
            }
        });
    }, { threshold: 0.08 });

    obs.observe(section);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    window.addEventListener('unload', () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('mousemove', onMouse);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
    });
}
