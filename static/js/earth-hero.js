(function () {
    const canvas = document.getElementById('earthHeroCanvas');
    if (!canvas || !window.THREE) return;

    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    camera.position.z = 4.2;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (error) {
        console.error('[SpaceY] Could not initialize the landing Earth renderer.', error);
        return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const earth = new THREE.Mesh(
        new THREE.SphereGeometry(0.9375, 96, 64),
        new THREE.ShaderMaterial({
            uniforms: {
                surfaceMap: { value: null },
                sunDirection: { value: new THREE.Vector3(-1, 0, 0) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                varying vec3 vWorldPosition;
                void main() {
                    vUv = uv;
                    vWorldNormal = normalize(mat3(modelMatrix) * normal);
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D surfaceMap;
                uniform vec3 sunDirection;
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                varying vec3 vWorldPosition;
                void main() {
                    vec3 normal = normalize(vWorldNormal);
                    float daylight = dot(normal, normalize(sunDirection));
                    float daySide = smoothstep(-0.22, 0.28, daylight);
                    vec3 moonSurface = texture2D(surfaceMap, vUv).rgb;
                    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
                    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 7.0);
                    vec3 surface = moonSurface * (0.025 + daySide * 0.975);
                    vec3 rimLight = vec3(0.82, 0.9, 1.0) * rim * daySide * 0.16;
                    gl_FragColor = vec4(surface + rimLight, 1.0);
                }
            `
        })
    );
    earth.scale.setScalar(0.92);
    earth.rotation.y = -Math.PI * 2 / 3;
    scene.add(earth);

    const clock = new THREE.Clock();

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        camera.aspect = bounds.width / bounds.height;
        camera.updateProjectionMatrix();
        renderer.setSize(bounds.width, bounds.height, false);
    }

    function render() {
        earth.rotation.y = -Math.PI * 2 / 3 + clock.getElapsedTime() * (Math.PI * 2 * 0.9 / 60);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        '/static/images/earth/moon_1024.jpg',
        texture => {
            texture.encoding = THREE.sRGBEncoding;
            texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            earth.material.uniforms.surfaceMap.value = texture;
            resize();
            render();
        },
        undefined,
        error => console.error('[SpaceY] Could not load the landing Earth lights texture.', error)
    );

    window.addEventListener('resize', resize, { passive: true });
})();
