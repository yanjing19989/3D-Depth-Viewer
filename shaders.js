// 顶点着色器
export const vertexShaderSource = `
    attribute vec3 a_Position;
    attribute vec2 a_TexCoord;
    varying vec2 v_TexCoord;
    
    void main() {
        gl_Position = vec4(a_Position, 1.0);
        v_TexCoord = a_TexCoord;
    }
`;

// 片段着色器  
export const fragmentShaderSource = `
    precision mediump float;
    
    #define gaussian_blur mat3(1, 2, 1, 2, 4, 2, 1, 2, 1) * 0.0625
    #define box_blur mat3(1, 1, 1, 1, 1, 1, 1, 1, 1) * 0.1111
    
    uniform sampler2D g_Texture0;
    uniform sampler2D g_Texture1;
    uniform sampler2D g_Texture2;
    uniform vec3 g_Screen;
    
    uniform float u_threshold;
    uniform float u_protrude;
    uniform float u_x_diff;
    uniform float u_y_diff;
    
    uniform float u_scaleX;
    uniform float u_scaleY;
    uniform float u_offsetX;
    uniform float u_offsetY;
    
    uniform float u_blurSize;
    uniform float u_blurDepth;
    uniform float u_depthImageBlurSize;
    
    uniform vec3 u_borderColor;
    uniform float u_borderSizeX, u_borderSizeY;
    
    varying vec2 v_TexCoord;
    
    vec2 mirrored(vec2 v) {
        vec2 m = mod(v, 2.);
        return mix(m, 2.0 - m, step(1.0, m));
    }
    
    vec4 convolute(vec2 uv, mat3 kernel, float size) {
        if(size < 1.0) return texture2D(g_Texture1, uv);
        vec4 color = vec4(0., 0., 0., 0.);
        for (int x = 0; x < 3; x++) {
            for (int y = 0; y < 3; y++) {
                vec2 offset = vec2(float(x - 1), float(y - 1)) / g_Screen.xy * size;
                color += texture2D(g_Texture1, uv + offset) * kernel[x][y];
            }
        }
        return color;
    }
    
    vec4 convoluteDepth(vec2 uv, mat3 kernel, float size) {
        if(size < 1.0) return texture2D(g_Texture2, uv);
        vec4 color = vec4(0., 0., 0., 0.);
        for (int x = 0; x < 3; x++) {
            for (int y = 0; y < 3; y++) {
                vec2 offset = vec2(float(x - 1), float(y - 1)) / g_Screen.xy * size;
                color += texture2D(g_Texture2, uv + offset) * kernel[x][y];
            }
        }
        return color;
    }
    
    vec4 depthQuilts(vec2 iuv) {
        vec2 fractCoord = fract(iuv);
        float valueId = u_x_diff;
        float valueIdY = u_y_diff;
        
        vec2 uv = vec2(u_scaleX, u_scaleY) * (fractCoord - 0.5) + 0.5 + vec2(u_offsetX, u_offsetY);
        
        vec4 depthMap = convoluteDepth(uv, box_blur, u_depthImageBlurSize);
        float xOffset = (depthMap.r - 0.5 + u_protrude) * ((valueId) * 2.0 / u_threshold);
        float yOffset = (depthMap.r - 0.5 + u_protrude) * ((valueIdY) * 2.0 / u_threshold);
        vec2 fake3d = vec2(uv.x + xOffset, uv.y + yOffset);

        if((depthMap.r - 0.5 + u_protrude < 0.) && 
            (fractCoord.x < u_borderSizeX || fractCoord.y < u_borderSizeY || 
            fractCoord.x > (1. - u_borderSizeX) || fractCoord.y > (1. - u_borderSizeY))) {
            return vec4(u_borderColor, 1.0);
        }

        vec4 color = depthMap.r < u_blurDepth ? 
            convolute(mirrored(fake3d), gaussian_blur, u_blurSize) : 
            texture2D(g_Texture1, fake3d);
        
        return color;
    }
    
    void main() {
        vec2 uv = v_TexCoord.xy;
        gl_FragColor = depthQuilts(uv);
    }
`;
