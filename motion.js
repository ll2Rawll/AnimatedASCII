// Slot order matches the saved scene IDs used for desktop wallpaper windows.
const sceneLoopSeconds = [24,24,24,24,24,24,24,24,9.2,24,17.6,24,24,17.9];

function loopTurns(time, rate, period) {
    return time / period * Math.max(1, Math.round(rate * period));
}

function loopAngle(time, rate, period) {
    const tau = 2*Math.PI;
    return loopTurns(time, rate/tau, period)*tau;
}

const loopClock = `
uniform float loopPeriod;
const float LOOP_TAU = 6.28318530718;

float loopTurns(float t, float rate) {
    return t / loopPeriod * max(1., floor(rate * loopPeriod + .5));
}
float loopAngle(float t, float rate) {
    return LOOP_TAU * loopTurns(t, rate / LOOP_TAU);
}
`;

// A moving noise field repeats by closing only its texture coordinates.
// The layers blend inside the effect, without dissolving the artwork itself.
const loopNoiseSource = `
float loopNoise(vec2 p, vec2 velocity, float t) {
    float cycle = fract(t / loopPeriod);
    vec2 shift = velocity * loopPeriod;
    float blend = cycle*cycle*(3.-2.*cycle);
    return mix(noise(p+shift*cycle), noise(p+shift*(cycle-1.)), blend);
}
`;

const backdropVertex = `
attribute vec2 position;
varying vec2 uv;
void main() {
    uv = vec2(position.x, -position.y) * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const backdropFragment = `
precision highp float;
${loopClock}
uniform sampler2D plate;
uniform vec2 view;
uniform float time;
uniform int scene;
varying vec2 uv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
${loopNoiseSource}
float oval(vec2 uv, vec2 center, vec2 radius) {
    return 1.0 - smoothstep(0.0, 1.0, length((uv-center)/radius));
}
vec3 samplePlate(vec2 p) {
    return texture2D(plate, p).rgb;
}
vec3 fireside(vec2 p, vec3 base) {
    float t = time;
    float heat = oval(p, vec2(.552,.712), vec2(.086,.151));
    if (heat > 0.0) {
        vec2 plumes = p * vec2(92., 58.);
        float eddy = loopNoise(plumes, vec2(-.62, 10.), t);
        float turbulence = loopNoise(plumes * 1.8, vec2(.284, 21.), t);
        float height = 1.0 - smoothstep(.73,.806,p.y);
        float strength = heat * height;
        vec2 displacement = vec2(eddy-.5, turbulence-.55) * vec2(.063,.048);
        displacement.x += .016*sin(loopAngle(t,3.8) + p.y*83.0);
        vec3 moved = samplePlate(p + displacement * strength);
        float flicker = .87 + .24*eddy + .21*turbulence;
        base = mix(base, moved * flicker, smoothstep(0., .27, strength) * .96);
    }
    float glow = oval(p, vec2(.545,.815), vec2(.35,.205));
    float irregular = .45*sin(loopAngle(t,7.4)) + .31*sin(loopAngle(t,11.3)+1.7) + .24*sin(loopAngle(t,16.4));
    return base * (1.0 + glow*irregular*vec3(.23,.13,.052));
}
float cabinWater(vec2 p) {
    float upperBank = .679 + .29*max(0., p.x-.23) - .87*max(0.,p.x-.88);
    float lowerBank = .744 + .38*max(0., p.x-.11);
    lowerBank -= .42*max(0.,p.x-.78);
    return smoothstep(upperBank, upperBank+.025, p.y)
         * (1.-smoothstep(lowerBank-.033,lowerBank+.017,p.y))
         * smoothstep(.055,.17,p.x) * (1.-smoothstep(.76,.835,p.x));
}
vec3 water(vec2 p, vec3 original, float mask, float speed) {
    if (mask < .01) return original;
    float wave = sin(p.y*650.+p.x*28.+loopAngle(time,4.9*speed));
    float ripple = sin(p.y*318.-p.x*54.+loopAngle(time,3.4*speed));
    vec2 offset = vec2(.0031*wave+.0020*ripple, .0018*wave + .001*ripple)*mask;
    vec3 moved = samplePlate(p+offset);
    float glint = max(0., moved.r - moved.b);
    return mix(original, moved, mask*.84) * (1.0+glint*mask*(.16*wave+.10*ripple));
}
vec3 cabin(vec2 p, vec3 base) {
    base = water(p, base, cabinWater(p), 1.);
    float rise = .089 - p.y;
    if (rise > 0.0 && p.x > .70 && p.x < .90) {
        float center = .859 - rise*.91 + sin(rise*63. + loopAngle(time,1.1))*rise*.16;
        float spread = .004 + rise*.30;
        float crossSection = exp(-pow((p.x-center)/spread,2.0)*1.7);
        vec2 flow = p*vec2(73.,77.);
        float detail = loopNoise(flow,vec2(1.4,2.85),time)*.67
                       + loopNoise(flow*2.1,vec2(2.94,5.985),time)*.33;
        float plume = smoothstep(.22,.84,detail) * crossSection
                    * smoothstep(0.,.012,rise) * (1.-smoothstep(.060,.14,rise));
        base = mix(base, vec3(.59,.62,.68), plume*.43);
    }
    float warm = max(0., base.r - base.b);
    float bulbs = oval(p, vec2(.659,.374), vec2(.204,.047));
    base += smoothstep(.24,.77,warm)*bulbs * (.5+.5*sin(loopAngle(time,2.5)+p.x*146.))
          * vec3(.105,.060,.015);
    return base;
}
vec3 northernLights(vec2 p, vec3 base) {
    float t = time;
    float horizon = .224 + p.x*.35;
    float sky = (1.-smoothstep(horizon-.07,horizon,p.y)) * (1.-smoothstep(.72,.87,p.x));
    if (sky > .001) {
        float green = smoothstep(.017,.16,base.g-base.b*.82);
        float violet = smoothstep(.051,.18,base.b-base.g)
                     * smoothstep(.040,.125,base.r);
        float curtain = clamp(green + violet*.52, 0., 1.) * sky;
        if (curtain > .001) {
            float sway = sin(p.x*9.5+loopAngle(t,.64)) + .5*sin(p.y*24.-loopAngle(t,.49));
            float fold = sin(p.x*44.+p.y*16.-loopAngle(t,.83));
            vec2 twist = vec2(.013*sway+.008*fold, .022*sin(p.x*12.+loopAngle(t,.53)));
            vec3 warped = samplePlate(p + twist*sky);
            float breathe = .94+.15*sin(p.x*19.-loopAngle(t,1.02))+.075*sin(p.x*100.-loopAngle(t,1.25));
            base = mix(base, warped*vec3(.94+.07*fold,breathe,1.0), curtain*.94);
        }
    }
    float lake = smoothstep(.632,.653,p.y) * (1.-smoothstep(.76,.86,p.y))
               * (1.-smoothstep(.36,.58,p.x));
    base = water(p, base, lake, .56);
    float lights = smoothstep(.34,.72,base.r-base.b)
                 * oval(p, vec2(.703,.566), vec2(.145,.314));
    base += lights * (.46+.54*sin(p.x*189. + p.y*119. - loopAngle(t,2.4)))
         * vec3(.094,.052,.009);
    return base;
}
void main() {
    vec2 drift = vec2(.007*sin(loopAngle(time,.30)), .004*sin(loopAngle(time,.24)+.8));
    vec2 p = (uv-.5)*view*.965 + .5 + drift;
    vec3 color = samplePlate(p);
    if (scene == 0) color = fireside(p, color);
    else if (scene == 1) color = cabin(p, color);
    else color = northernLights(p, color);
    gl_FragColor = vec4(clamp(color,0.,1.),1.);
}`;

function makeProgram(gl, vertex, fragment) {
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        gl.attachShader(program, shader);
        gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
}

function makeSnow(count) {
    let seed = count;
    const next = () => {
        seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
        return seed / 4294967296;
    };
    return Array.from({length: count}, (_, index) => ({
        x: next(), y: next(), speed: next(), size: next(),
        phase: next()*Math.PI*2,
        depth: index < 220 ? 0 : index < 340 ? 1 : 2
    }));
}

function fract(n) {
    return n - Math.floor(n);
}

const glyphRamp = ' .,:;i+loxX%#&@';

// Only the character grid is sampled. The canvas never appears in the wallpaper.
function drawField(gl, mesh, position) {
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.disableVertexAttribArray(position);
}

function makeLightSampler(useGpu) {
    const sample = document.createElement('canvas');
    const gl = useGpu && sample.getContext('webgl', {alpha:false, antialias:false});
    const context = !gl && sample.getContext('2d', {willReadFrequently:true});
    const mesh = gl && gl.createBuffer();
    const plate = gl && gl.createTexture();
    const backdrop = gl && makeProgram(gl,backdropVertex,backdropFragment);
    const uniforms = gl && Object.fromEntries(['scene','time','view','loopPeriod','plate'].map(
        name => [name,gl.getUniformLocation(backdrop,name)]));
    const position = gl && gl.getAttribLocation(backdrop,'position');
    const procedural = gl && makeProceduralRenderer(gl,mesh);
    let pixels, activeImage;

    if (gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER,mesh);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),gl.STATIC_DRAW);
        gl.bindTexture(gl.TEXTURE_2D,plate);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    }

    function getLights(image, frame) {
        const {scene,time,period,aspect,columns,rows,viewX,viewY,driftX,driftY} = frame;
        if (!pixels || sample.width !== columns || sample.height !== rows) {
            sample.width = columns;
            sample.height = rows;
            pixels = new Uint8Array(columns*rows*4);
        }
        if (gl) {
            gl.viewport(0,0,columns,rows);
            if (!image) {
                procedural(scene-3,time,period,aspect);
            } else {
                gl.useProgram(backdrop);
                gl.bindTexture(gl.TEXTURE_2D,plate);
                if (activeImage !== image) {
                    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
                    activeImage = image;
                }
                gl.uniform1i(uniforms.plate,0);
                gl.uniform1i(uniforms.scene,scene);
                gl.uniform1f(uniforms.time,time);
                gl.uniform1f(uniforms.loopPeriod,period);
                gl.uniform2f(uniforms.view,viewX,viewY);
                drawField(gl,mesh,position);
            }
            gl.readPixels(0,0,columns,rows,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
            return pixels;
        }

        if (image) {
            const w = image.naturalWidth, h = image.naturalHeight;
            context.drawImage(image,(1-viewX*.965)/2*w+driftX*w,(1-viewY*.965)/2*h+driftY*h,
                w*viewX*.965,h*viewY*.965,0,0,columns,rows);
        } else {
            const draw = scene >= 12 ? drawY2kExtraFallback
                : scene >= 9 ? drawKineticFallback
                : scene >= 6 ? drawY2kFallback : drawNeonFallback;
            draw(context,scene%3,time,columns,rows,period);
        }
        return context.getImageData(0,0,columns,rows).data;
    }
    return {getLights, bottomUp: Boolean(gl)};
}

function makeMotion(surface, useGpu = true) {
    const {getLights,bottomUp} = makeLightSampler(useGpu);
    const write = makeAsciiText(surface);
    const weather = makeTextWeather();
    let cells, columns, rows;
    return (image,scene,elapsed,width,height) => {
        if (width < 1 || height < 1) return;
        const nextColumns = Math.min(264,Math.ceil(width/Math.max(4,height/117)));
        const nextRows = Math.min(86,Math.ceil(height/6));
        if (columns !== nextColumns || rows !== nextRows) {
            columns = nextColumns;
            rows = nextRows;
            cells = new Uint16Array(columns*rows);
        }
        const period = sceneLoopSeconds[scene];
        const time = elapsed % period;
        const aspect = width/height;
        const ratio = image ? aspect/(image.naturalWidth/image.naturalHeight) : 1;
        const frame = {
            scene,time,period,aspect,columns,rows,
            viewX: Math.min(1,ratio), viewY: Math.min(1,1/ratio),
            driftX: .007*Math.sin(loopAngle(time,.30,period)),
            driftY: .004*Math.sin(loopAngle(time,.24,period)+.8)
        };
        gradeAscii(getLights(image,frame),bottomUp,frame,cells);
        if (image) weather(cells,frame);
        write(cells,columns,rows,width,height);
    };
}
