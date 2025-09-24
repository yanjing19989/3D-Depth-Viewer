# 3D Depth Viewer Development Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Prerequisites
- Python 3.8+ (tested with Python 3.12.3) 
- Modern web browser with WebGL support (Chrome, Firefox, Edge)
- Optional: OpenSSL for certificate generation (usually included with Git for Windows)

### Quick Start Commands
1. **Start HTTPS server for full functionality (including gyroscope)**:
   ```bash
   cd /home/runner/work/3D-Depth-Viewer/3D-Depth-Viewer
   python web.py 8000
   ```
   - **Timing**: Server starts in <1 second. NEVER CANCEL.
   - Auto-generates SSL certificates if missing using OpenSSL
   - Access at: https://localhost:8000/ (accept self-signed certificate warning)

2. **Start HTTP server for basic testing**:
   ```bash
   cd /home/runner/work/3D-Depth-Viewer/3D-Depth-Viewer  
   python -m http.server 8001
   ```
   - **Timing**: Server starts in <1 second. NEVER CANCEL.
   - Access at: http://localhost:8001/
   - **Limitation**: Gyroscope features disabled (requires HTTPS)

3. **Direct file access for desktop testing**:
   - Open `index.html` directly in browser
   - **Limitation**: File protocol restrictions may apply; use HTTP server instead

### Build Process
**No build process required** - this is a static web application with:
- Pure HTML5, CSS3, and vanilla JavaScript
- WebGL shaders defined in `shaders.js`
- No transpilation, bundling, or compilation needed

### Validation Scenarios
After making changes, ALWAYS test these user scenarios:

1. **Basic Application Load**:
   ```bash
   # Start server
   python web.py 8000
   # Navigate to https://localhost:8000/ in browser
   # Verify: WebGL canvas loads (black area in center)
   # Verify: Left sidebar (📁) and right sidebar (⚙️) toggle buttons work
   ```

2. **Parameter Control Testing**:
   - Adjust "3D阈值" (3D Threshold) slider from 25 to 35
   - Verify: Value display updates to "35.000"
   - Verify: WebGL console messages appear (indicates GPU processing)
   - Test other sliders: "突出程度", "x偏转", "y偏转"

3. **File Upload Interface**:
   - Click "原始图像:" (Original Image) button
   - Click "深度图:" (Depth Map) button  
   - Verify: File selection dialogs open

4. **Gyroscope Control (HTTPS only)**:
   - Click "启用陀螺仪控制" (Enable Gyroscope Control) button
   - On desktop: Should show "权限被拒或不支持" (Permission denied or not supported)
   - Status should remain "未启用" (Not enabled)

### Code Structure

#### Core Files (Frequently Modified)
- `index.html` - Main UI structure and layout
- `main.js` - Core WebGL logic, event handlers, gyroscope controls
- `shaders.js` - WebGL vertex and fragment shader definitions  
- `styles.css` - UI styling and responsive layout
- `web.py` - Local HTTPS development server

#### Key Functions in main.js
- `initWebGL()` - WebGL context initialization
- `setupGeometry()` - Vertex buffer setup
- `setupGyroControls()` - Device orientation handling
- `createShader()` - Shader compilation
- Event handlers for all UI controls

#### WebGL Shader Pipeline
- Vertex shader: Basic quad rendering with texture coordinates
- Fragment shader: 3D depth effect processing with configurable parameters
- Uniforms: Threshold, protrude, x_diff, y_diff, scaling, blur effects

### Common Development Tasks

#### Adding New UI Controls
1. Add HTML input element to appropriate sidebar section in `index.html`
2. Add corresponding value display element with class `value-display`
3. Add event listener in `main.js` similar to existing slider handlers
4. Update WebGL uniform values in render loop

#### Modifying WebGL Effects
1. Edit fragment shader in `shaders.js`
2. Add corresponding uniform declarations
3. Update uniform binding in `setupShaders()` function
4. Add UI controls following pattern above

#### Certificate Issues
If SSL certificate problems occur:
```bash
# Remove existing certificates
rm localhost.cert.pem localhost.key.pem
# Restart server to regenerate
python web.py 8000
```

### Troubleshooting

#### Server Won't Start
- **Error "Address already in use"**: Change port `python web.py 8001`
- **Missing OpenSSL**: Install Git for Windows or use HTTP server for testing

#### WebGL Issues  
- **Black canvas**: Check browser WebGL support at webglreport.com
- **Console errors**: Enable hardware acceleration in browser settings
- **Performance warnings**: Normal for software fallback rendering

#### File Upload Issues
- **Files not loading**: Use HTTPS server, not file:// protocol
- **CORS errors**: Ensure files are served from same origin

### Testing Checklist
Before committing changes:
- [ ] Start HTTPS server: `python web.py 8000` 
- [ ] Verify WebGL canvas renders without errors
- [ ] Test all UI sliders update their value displays
- [ ] Test sidebar toggle buttons work
- [ ] Check browser console for JavaScript errors
- [ ] Test file upload dialogs open correctly
- [ ] Verify gyroscope button shows appropriate status

### Performance Notes
- **Server startup**: <1 second - NEVER CANCEL
- **WebGL initialization**: <2 seconds on modern hardware
- **Certificate generation**: <5 seconds with OpenSSL available
- **File loading**: Depends on image size, typically <3 seconds for 1-2MB images

### Architecture Overview
This is a client-side WebGL application that processes image and depth map pairs to create stereoscopic 3D effects. The Python server only provides HTTPS serving for security context required by device orientation APIs. All processing happens in the browser using WebGL shaders.