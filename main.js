import { vertexShaderSource, fragmentShaderSource } from './shaders.js';

// WebGL上下文和着色器程序
let gl;
let program;
let uniforms = {};
let textures = {};

// 初始化WebGL
function initWebGL() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) || 
        canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    
    if (!gl) {
        alert('您的浏览器不支持WebGL');
        return false;
    }
    
    return true;
}

// 创建着色器
function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('着色器编译错误:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// 创建着色器程序
function createProgram() {
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('着色器程序链接错误:', gl.getProgramInfoLog(program));
        return false;
    }
    
    gl.useProgram(program);
    return true;
}

// 获取uniform位置
function getUniforms() {
    const uniformNames = [
        'g_Texture0', 'g_Texture1', 'g_Texture2', 'g_Screen',
        'u_threshold', 'u_protrude', 'u_x_diff', 'u_y_diff',
        'u_scaleX', 'u_scaleY', 'u_offsetX', 'u_offsetY',
    'u_blurSize', 'u_blurDepth', 'u_depthImageBlurSize', 'u_maxScale',
        'u_borderColor', 'u_borderSizeX', 'u_borderSizeY'
    ];
    
    uniformNames.forEach(name => {
        uniforms[name] = gl.getUniformLocation(program, name);
    });
}

// 创建纹理
function createTexture(image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    return texture;
}

// 设置几何体
function setupGeometry() {
    const vertices = new Float32Array([
        -1.0, -1.0, 0.0, 0.0, 1.0,
         1.0, -1.0, 0.0, 1.0, 1.0,
        -1.0,  1.0, 0.0, 0.0, 0.0,
         1.0,  1.0, 0.0, 1.0, 0.0
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'a_Position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_TexCoord');
    
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 20, 0);
    
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 20, 12);
}

// 16进制颜色转RGB
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255.0,
        g: parseInt(result[2], 16) / 255.0,
        b: parseInt(result[3], 16) / 255.0
    } : { r: 0, g: 0, b: 0 };
}

// 渲染场景
function render() {
    const canvas = gl.canvas;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // 设置纹理
    if (textures.image) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures.image);
        gl.uniform1i(uniforms.g_Texture1, 1);
    }
    
    if (textures.depth) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, textures.depth);
        gl.uniform1i(uniforms.g_Texture2, 2);
    }
    
    // 设置uniform值
    gl.uniform3f(uniforms.g_Screen, canvas.width, canvas.height, 1.0);
    
    // 从控件获取参数值
    gl.uniform1f(uniforms.u_threshold, parseFloat(document.getElementById('threshold').value));
    gl.uniform1f(uniforms.u_protrude, parseFloat(document.getElementById('protrude').value));
    gl.uniform1f(uniforms.u_x_diff, parseFloat(document.getElementById('x_diff').value));
    gl.uniform1f(uniforms.u_y_diff, parseFloat(document.getElementById('y_diff').value));
    
    gl.uniform1f(uniforms.u_scaleX, parseFloat(document.getElementById('scaleX').value));
    gl.uniform1f(uniforms.u_scaleY, parseFloat(document.getElementById('scaleY').value));
    gl.uniform1f(uniforms.u_offsetX, parseFloat(document.getElementById('offsetX').value));
    gl.uniform1f(uniforms.u_offsetY, parseFloat(document.getElementById('offsetY').value));
    
    gl.uniform1f(uniforms.u_blurSize, parseFloat(document.getElementById('blurSize').value));
    gl.uniform1f(uniforms.u_blurDepth, parseFloat(document.getElementById('blurDepth').value));
    gl.uniform1f(uniforms.u_depthImageBlurSize, parseFloat(document.getElementById('depthImageBlurSize').value));
    // 传递最大放大倍率
    const maxScaleEl = document.getElementById('maxScale');
    if (maxScaleEl) {
        gl.uniform1f(uniforms.u_maxScale, parseFloat(maxScaleEl.value));
    }
    
    const borderColorHex = document.getElementById('borderColor').value;
    const borderColorRgb = hexToRgb(borderColorHex);
    gl.uniform3f(uniforms.u_borderColor, borderColorRgb.r, borderColorRgb.g, borderColorRgb.b);
    gl.uniform1f(uniforms.u_borderSizeX, parseFloat(document.getElementById('borderSizeX').value));
    gl.uniform1f(uniforms.u_borderSizeY, parseFloat(document.getElementById('borderSizeY').value));
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// 加载图像文件
function loadImage(file, textureKey, previewId) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            textures[textureKey] = createTexture(img);

            // 记录纹理尺寸
            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            if (textureKey === 'image') {
                textures.imageWidth = w;
                textures.imageHeight = h;
            } else if (textureKey === 'depth') {
                textures.depthWidth = w;
                textures.depthHeight = h;
            }

            // 自适应调整画布分辨率
            adjustCanvasSize();

            const preview = document.getElementById(previewId);
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            render();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 调整画布尺寸
function adjustCanvasSize() {
    const canvas = document.getElementById('glCanvas');
    if (!canvas) return;
    
    let targetW = 0, targetH = 0;
    if (textures.imageWidth && textures.imageHeight) {
        targetW = textures.imageWidth;
        targetH = textures.imageHeight;
    } else if (textures.depthWidth && textures.depthHeight) {
        targetW = textures.depthWidth;
        targetH = textures.depthHeight;
    }
    
    if (targetW > 0 && targetH > 0) {
        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = Math.floor(targetW);
            canvas.height = Math.floor(targetH);
        }
    }
}

// 设置控件事件监听器
function setupControls() {
    const controls = [
        'threshold', 'protrude', 'x_diff', 'y_diff',
        'scaleX', 'scaleY', 'offsetX', 'offsetY',
    'blurSize', 'blurDepth', 'depthImageBlurSize', 'maxScale',
        'borderSizeX', 'borderSizeY'
    ];
    
    controls.forEach(id => {
        const control = document.getElementById(id);
        const valueDisplay = document.getElementById(id + 'Value');
        
        control.addEventListener('input', function() {
            let decimals = (this.step.toString().split('.')[1] || []).length;
            valueDisplay.textContent = parseFloat(this.value).toFixed(decimals > 2 ? 5 : 3);
            render();
        });
    });

    // 颜色选择器监听器
    document.getElementById('borderColor').addEventListener('input', render);
    
    // 文件输入监听器
    document.getElementById('imageFile').addEventListener('change', function(e) {
        if (e.target.files[0]) {
            loadImage(e.target.files[0], 'image', 'imagePreview');
        }
    });
    
    document.getElementById('depthFile').addEventListener('change', function(e) {
        if (e.target.files[0]) {
            loadImage(e.target.files[0], 'depth', 'depthPreview');
        }
    });
}

// 初始化应用
function init() {
    if (!initWebGL()) return;
    
    if (!createProgram()) return;
    
    getUniforms();
    setupGeometry();
    setupControls();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // 创建默认纹理
    const defaultTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, defaultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    
    textures.image = defaultTexture;
    textures.depth = defaultTexture;
    textures.imageWidth = 1;
    textures.imageHeight = 1;
    
    render();
}

// 侧栏控制
function setupSidebarControls() {
    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');
    const toggleLeftBtn = document.getElementById('toggleLeftSidebar');
    const toggleRightBtn = document.getElementById('toggleRightSidebar');
    
    // 左侧栏控制
    toggleLeftBtn.addEventListener('click', () => {
        if (leftSidebar.classList.contains('open')) {
            leftSidebar.classList.remove('open');
        } else {
            leftSidebar.classList.toggle('open');
        }
    });
    
    // 右侧栏控制
    toggleRightBtn.addEventListener('click', () => {
        if (rightSidebar.classList.contains('open')) {
            rightSidebar.classList.remove('open');
        } else {
            rightSidebar.classList.toggle('open');
        }
    });
    
    // ESC键关闭侧栏
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            leftSidebar.classList.remove('open');
            rightSidebar.classList.remove('open');
        }
    });
}

// 鼠标拖拽控制
function setupDragControls() {
    const canvas = document.getElementById('glCanvas');
    const xSlider = document.getElementById('x_diff');
    const ySlider = document.getElementById('y_diff');
    const xLabel = document.getElementById('x_diffValue');
    const yLabel = document.getElementById('y_diffValue');

    if (!canvas || !xSlider || !ySlider || !xLabel || !yLabel) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startXVal = parseFloat(xSlider.value);
    let startYVal = parseFloat(ySlider.value);

    function pxToDelta(dx, dy) {
        const rangeMin = parseFloat(xSlider.min); 
        const rangeMax = parseFloat(xSlider.max);
        const range = rangeMax - rangeMin;
        const deltaX = (-dx * 2 / canvas.clientWidth) * range;
        const deltaY = (-dy * 2 / canvas.clientHeight) * range;
        return { deltaX, deltaY };
    }

    function clamp(v, min, max) { 
        return Math.min(max, Math.max(min, v)); 
    }

    function updateUI(xVal, yVal) {
        xSlider.value = xVal.toFixed(3);
        ySlider.value = yVal.toFixed(3);
        xLabel.textContent = parseFloat(xSlider.value).toFixed(3);
        yLabel.textContent = parseFloat(ySlider.value).toFixed(3);
        render();
    }

    canvas.addEventListener('mousedown', (e) => {
        dragging = true;
        canvas.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        startXVal = parseFloat(xSlider.value);
        startYVal = parseFloat(ySlider.value);
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const { deltaX, deltaY } = pxToDelta(dx, dy);
        const newX = clamp(startXVal + deltaX, parseFloat(xSlider.min), parseFloat(xSlider.max));
        const newY = clamp(startYVal + deltaY, parseFloat(ySlider.min), parseFloat(ySlider.max));
        updateUI(newX, newY);
    });

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        canvas.style.cursor = 'grab';
    }

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('mouseleave', endDrag);
}

// 陀螺仪控制
function setupGyroControls() {
    const btn = document.getElementById('enableGyroBtn');
    const statusEl = document.getElementById('gyroStatus');
    const sensSlider = document.getElementById('gyroSensitivity');
    const sensLabel = document.getElementById('gyroSensitivityValue');
    const xSlider = document.getElementById('x_diff');
    const ySlider = document.getElementById('y_diff');
    const xLabel = document.getElementById('x_diffValue');
    const yLabel = document.getElementById('y_diffValue');

    if (!btn || !statusEl || !sensSlider || !sensLabel) return;

    let enabled = false;
    let rafId = null;
    let targetX = 0, targetY = 0;
    let currentX = parseFloat(xSlider.value), currentY = parseFloat(ySlider.value);
    const alpha = 0.15;
    let baseBeta = null, baseGamma = null;
    let startXAtEnable = parseFloat(xSlider.value), startYAtEnable = parseFloat(ySlider.value);

    function clamp(v, min, max) { 
        return Math.min(max, Math.max(min, v)); 
    }

    function setDiff(x, y) {
        xSlider.value = x.toFixed(3);
        ySlider.value = y.toFixed(3);
        xLabel.textContent = parseFloat(xSlider.value).toFixed(3);
        yLabel.textContent = parseFloat(ySlider.value).toFixed(3);
        render();
    }

    function updateSensitivityUI() {
        const decimals = (sensSlider.step.toString().split('.')[1] || []).length;
        sensLabel.textContent = parseFloat(sensSlider.value).toFixed(decimals > 2 ? 5 : 3);
    }
    sensSlider.addEventListener('input', updateSensitivityUI);
    updateSensitivityUI();

    function orientationToDiff(beta, gamma) {
        const sens = parseFloat(sensSlider.value);
        const normGamma = clamp(gamma / 90, -1, 1);
        const normBeta = clamp(beta / 90, -1, 1);

        let x = -normGamma * 0.5 * sens;
        let y = -normBeta * 0.5 * sens;

        const orient = (screen && screen.orientation && screen.orientation.type) || '';
        if (orient.includes('landscape')) {
            const t = x; x = -y; y = t;
        }

        return { x, y };
    }

    function onDeviceOrientation(e) {
        const beta = (typeof e.beta === 'number') ? e.beta : 0;
        const gamma = (typeof e.gamma === 'number') ? e.gamma : 0;
        
        if (baseBeta === null || baseGamma === null) {
            baseBeta = beta;
            baseGamma = gamma;
            targetX = startXAtEnable;
            targetY = startYAtEnable;
            return;
        }

        const dBeta = beta - baseBeta;
        const dGamma = gamma - baseGamma;
        const { x, y } = orientationToDiff(dBeta, dGamma);
        const minX = parseFloat(xSlider.min), maxX = parseFloat(xSlider.max);
        const minY = parseFloat(ySlider.min), maxY = parseFloat(ySlider.max);
        targetX = clamp(startXAtEnable + x, minX, maxX);
        targetY = clamp(startYAtEnable + y, minY, maxY);
    }

    function animate() {
        if (!enabled) return;
        currentX += (targetX - currentX) * alpha;
        currentY += (targetY - currentY) * alpha;
        setDiff(currentX, currentY);
        rafId = requestAnimationFrame(animate);
    }

    async function requestPermissionIfNeeded() {
        try {
            const AnyOrientation = window.DeviceOrientationEvent || window.DeviceMotionEvent;
            if (!AnyOrientation) {
                throw new Error('不支持设备方向');
            }
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                const res = await DeviceOrientationEvent.requestPermission();
                if (res !== 'granted') throw new Error('权限被拒绝');
            }
            return true;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }

    function enable() {
        if (enabled) return;
        enabled = true;
        statusEl.textContent = '已启用';
        statusEl.style.color = '#4CAF50';
        window.addEventListener('deviceorientation', onDeviceOrientation, true);
        currentX = parseFloat(xSlider.value);
        currentY = parseFloat(ySlider.value);
        startXAtEnable = currentX;
        startYAtEnable = currentY;
        baseBeta = null;
        baseGamma = null;
        targetX = currentX;
        targetY = currentY;
        animate();
    }

    function disable() {
        if (!enabled) return;
        enabled = false;
        statusEl.textContent = '未启用';
        statusEl.style.color = '#aaa';
        window.removeEventListener('deviceorientation', onDeviceOrientation, true);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        baseBeta = null;
        baseGamma = null;
    }

    btn.addEventListener('click', async () => {
        if (!enabled) {
            const ok = await requestPermissionIfNeeded();
            if (!ok) {
                statusEl.textContent = '权限被拒或不支持';
                statusEl.style.color = '#f39c12';
                return;
            }
            enable();
            btn.textContent = '关闭陀螺仪控制';
        } else {
            disable();
            btn.textContent = '启用陀螺仪控制';
        }
    });
}

// 页面加载完成后初始化
window.addEventListener('load', () => {
    init();
    setupSidebarControls();
    setupDragControls();
    setupGyroControls();
});
