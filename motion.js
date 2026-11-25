const backdropVertex = `
attribute vec2 position;
varying vec2 uv;
void main() {
    uv = vec2(position.x, -position.y) * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const backdropFragment = `
precision highp float;
uniform sampler2D plate;
uniform sampler2D glyphs;
uniform vec2 view;
uniform vec2 grid;
uniform float glyphCount;
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
        vec2 plumes = p * vec2(92., 58.) + vec2(-t*.62, t*10.);
        float eddy = noise(plumes);
        float turbulence = noise(plumes * 1.8 + vec2(t*1.4, t*3.0));
        float height = 1.0 - smoothstep(.73,.806,p.y);
        float strength = heat * height;
        vec2 displacement = vec2(eddy-.5, turbulence-.55) * vec2(.063,.048);
        displacement.x += .016*sin(t*3.8 + p.y*83.0);
        vec3 moved = samplePlate(p + displacement * strength);
        float flicker = .87 + .24*eddy + .21*turbulence;
        base = mix(base, moved * flicker, smoothstep(0., .27, strength) * .96);
    }
    float glow = oval(p, vec2(.545,.815), vec2(.35,.205));
    float irregular = .45*sin(t*7.4) + .31*sin(t*11.3+1.7) + .24*sin(t*16.4);
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
    float wave = sin(p.y*650.+p.x*28.+time*4.9*speed);
    float ripple = sin(p.y*318.-p.x*54.+time*3.4*speed);
    vec2 offset = vec2(.0031*wave+.0020*ripple, .0018*wave + .001*ripple)*mask;
    vec3 moved = samplePlate(p+offset);
    float glint = max(0., moved.r - moved.b);
    return mix(original, moved, mask*.84) * (1.0+glint*mask*(.16*wave+.10*ripple));
}
vec3 cabin(vec2 p, vec3 base) {
    base = water(p, base, cabinWater(p), 1.);
    float rise = .089 - p.y;
    if (rise > 0.0 && p.x > .70 && p.x < .90) {
        float center = .859 - rise*.91 + sin(rise*63. + time*1.1)*rise*.16;
        float spread = .004 + rise*.30;
        float crossSection = exp(-pow((p.x-center)/spread,2.0)*1.7);
        vec2 flow = p*vec2(73.,77.)+vec2(time*1.4,time*2.85);
        float detail = noise(flow)*.67 + noise(flow*2.1)*.33;
        float plume = smoothstep(.22,.84,detail) * crossSection
                    * smoothstep(0.,.012,rise) * (1.-smoothstep(.060,.14,rise));
        base = mix(base, vec3(.59,.62,.68), plume*.43);
    }
    float warm = max(0., base.r - base.b);
    float bulbs = oval(p, vec2(.659,.374), vec2(.204,.047));
    base += smoothstep(.24,.77,warm)*bulbs * (.5+.5*sin(time*2.5+p.x*146.))
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
            float sway = sin(p.x*9.5+t*.64) + .5*sin(p.y*24.-t*.49);
            float fold = sin(p.x*44.+p.y*16.-t*.83);
            vec2 twist = vec2(.013*sway+.008*fold, .022*sin(p.x*12.+t*.53));
            vec3 warped = samplePlate(p + twist*sky);
            float breathe = .94+.15*sin(p.x*19.-t*1.02)+.075*sin(p.x*100.-t*1.25);
            base = mix(base, warped*vec3(.94+.07*fold,breathe,1.0), curtain*.94);
        }
    }
    float lake = smoothstep(.632,.653,p.y) * (1.-smoothstep(.76,.86,p.y))
               * (1.-smoothstep(.36,.58,p.x));
    base = water(p, base, lake, .56);
    float lights = smoothstep(.34,.72,base.r-base.b)
                 * oval(p, vec2(.703,.566), vec2(.145,.314));
    base += lights * (.46+.54*sin(p.x*189. + p.y*119. - t*2.4))
         * vec3(.094,.052,.009);
    return base;
}
void main() {
    vec2 drift = vec2(.007*sin(time*.30), .004*sin(time*.24+.8));
    vec2 cell = floor(uv * grid);
    vec2 center = (cell+.5)/grid;
    vec2 p = (center-.5)*view*.965 + .5 + drift;
    vec3 color = samplePlate(p);
    if (scene == 0) color = fireside(p, color);
    else if (scene == 1) color = cabin(p, color);
    else color = northernLights(p, color);
    color = clamp(color, 0., 1.);
    float light = dot(color, vec3(.25,.64,.11));
    float tone = pow(clamp((light-.012)*1.18,0.,1.), .69);
    float jitter = hash(cell) - .5;
    float index = clamp(floor(tone * glyphCount + jitter*.92),0.,glyphCount-1.);
    vec2 letter = fract(uv*grid);
    float ink = texture2D(glyphs, vec2((index+letter.x)/glyphCount,letter.y)).a;

    // Keep a hint of ambient light between characters, and let the letters carry the color.
    vec3 paper = vec3(.015,.023,.035) + color * (.135 + tone*.13);
    vec3 raised = pow(color,vec3(.74)) * 1.7;
    vec3 textColor = raised / max(1., max(raised.r, max(raised.g, raised.b)));
    gl_FragColor = vec4(mix(paper,textColor,ink),1.);
}`;

const particleVertex = `
attribute vec3 point;
attribute vec4 tint;
varying vec4 color;
void main() {
    gl_Position = vec4(point.x*2.0-1.0, 1.0-point.y*2.0,0.0,1.0);
    gl_PointSize = point.z;
    color = tint;
}`;

const particleFragment = `
precision mediump float;
varying vec4 color;
uniform sampler2D glyphs;
uniform float glyphCount;
void main() {
    vec2 p = gl_PointCoord;
    float index = color.r > .95 ? 2. : 1.;
    if (color.r < .95 && color.a < .29) index = 6.;
    if (color.b < .2 && color.a > .55) index = 6.;
    float ink = texture2D(glyphs,vec2((index+p.x)/glyphCount,p.y)).a;
    float halo = exp(-dot(p-.5,p-.5)*15.)*.10;
    gl_FragColor = vec4(color.rgb,color.a*(ink + halo));
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
    return Array.from({length: count}, (_, index) => ({
        x: Math.random(),
        y: Math.random(),
        speed: Math.random(),
        size: Math.random(),
        phase: Math.random() * Math.PI * 2,
        depth: index < 220 ? 0 : index < 340 ? 1 : 2
    }));
}

function fract(n) {
    return n - Math.floor(n);
}

const glyphRamp = ' .,:;i+loxX%#&@';

function glyphAtlas() {
    const atlas = document.createElement('canvas');
    atlas.width = glyphRamp.length * 24;
    atlas.height = 32;
    const pen = atlas.getContext('2d');
    pen.font = '30px monospace';
    pen.textAlign = 'center';
    pen.textBaseline = 'middle';
    pen.fillStyle = 'white';
    for (let i = 0; i < glyphRamp.length; i++) pen.fillText(glyphRamp[i], i*24+12, 16);
    return atlas;
}

function makeMotion(canvas, preferGpu = true) {
    const gl = preferGpu && canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    const backdrop = gl && makeProgram(gl, backdropVertex, backdropFragment);
    const pointsProgram = gl && makeProgram(gl, particleVertex, particleFragment);
    const mesh = gl && gl.createBuffer();
    const points = gl && gl.createBuffer();
    const texture = gl && gl.createTexture();
    const glyphTexture = gl && gl.createTexture();
    const particleGlyphs = gl && gl.getUniformLocation(pointsProgram, 'glyphs');
    const particleGlyphCount = gl && gl.getUniformLocation(pointsProgram, 'glyphCount');
    const viewUniforms = gl && Object.fromEntries(['plate', 'glyphs', 'glyphCount', 'scene', 'time', 'view', 'grid'].map(
        (name) => [name, gl.getUniformLocation(backdrop, name)]));
    const meshPosition = gl && gl.getAttribLocation(backdrop, 'position');
    const pointPosition = gl && gl.getAttribLocation(pointsProgram, 'point');
    const pointTint = gl && gl.getAttribLocation(pointsProgram, 'tint');
    const snow = makeSnow(378);
    const sparks = makeSnow(48);
    const particles = new Float32Array((snow.length + sparks.length + 16) * 7);
    const ctx = !gl && canvas.getContext('2d');
    const sample = !gl && document.createElement('canvas');
    const sampler = !gl && sample.getContext('2d', {willReadFrequently: true});
    const procedural = gl && makeProceduralRenderer(gl, mesh);
    let activePlate;

    if (gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphAtlas());
        for (const [setting, value] of [
            [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
            [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]
        ]) gl.texParameteri(gl.TEXTURE_2D, setting, value);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    function animate(image, scene, time) {
        const width = canvas.width, height = canvas.height;
        const cellWidth = Math.max(5, Math.round(height/126));
        const columns = Math.ceil(width/cellWidth), rows = Math.ceil(height/(cellWidth*1.45));
        const abstract = !image;
        if (gl && abstract) {
            procedural(scene - 3, time, width, height, columns, rows);
            return;
        }
        const ratio = abstract ? 1 : (width / height) / (image.naturalWidth / image.naturalHeight);
        const viewX = Math.min(1, ratio), viewY = Math.min(1, 1 / ratio);
        const driftX = .007 * Math.sin(time * .30), driftY = .004 * Math.sin(time * .24 + .8);
        if (gl) {
            gl.viewport(0, 0, width, height);
            gl.useProgram(backdrop);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            if (activePlate !== image) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                activePlate = image;
            }
            gl.uniform1i(viewUniforms.plate, 0);
            gl.uniform1i(viewUniforms.glyphs, 1);
            gl.uniform1f(viewUniforms.glyphCount, glyphRamp.length);
            gl.uniform2f(viewUniforms.grid, columns, rows);
            gl.uniform1i(viewUniforms.scene, scene);
            gl.uniform1f(viewUniforms.time, time);
            gl.uniform2f(viewUniforms.view, viewX, viewY);
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
            gl.enableVertexAttribArray(meshPosition);
            gl.vertexAttribPointer(meshPosition, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        } else {
            if (sample.width !== columns || sample.height !== rows) {
                sample.width = columns;
                sample.height = rows;
            }
            if (scene >= 6) {
                drawY2kFallback(sampler, scene - 6, time, columns, rows);
            } else if (abstract) {
                drawNeonFallback(sampler, scene - 3, time, columns, rows);
            } else {
                const w = image.naturalWidth, h = image.naturalHeight;
                sampler.drawImage(image, (1-viewX*.965)/2*w+driftX*w, (1-viewY*.965)/2*h+driftY*h,
                    w*viewX*.965, h*viewY*.965, 0, 0, columns, rows);
            }
            ctx.fillStyle = abstract ? '#050414' : '#0a1018';
            ctx.fillRect(0, 0, width, height);
            ctx.font = (height/rows)*.94 + 'px monospace';
            ctx.textBaseline = 'middle';
            const data = sampler.getImageData(0, 0, columns, rows).data;
            for (let i = 0; i < data.length; i += 4) {
                const value = (data[i]*.25 + data[i+1]*.64 + data[i+2]*.11)/255;
                const shade = Math.min(glyphRamp.length-1, Math.floor(Math.pow(value*1.15,.69)*glyphRamp.length));
                if (shade < 1) continue;
                const rgb = [data[i],data[i+1],data[i+2]].map(channel => Math.round(Math.min(255,Math.pow(channel/255,.62)*411)));
                ctx.fillStyle = 'rgb(' + rgb.join(',') + ')';
                ctx.fillText(glyphRamp[shade], (i/4%columns)*width/columns, (Math.floor(i/4/columns)+.5)*height/rows);
            }
        }

        if (abstract) return;

        const scale = height / 1080;
        const count = scene === 2 ? 302 : snow.length;
        let offset = 0;
        for (let i = 0; i < count; i++) {
            const {x, y, speed, size, phase, depth} = scene === 2 && i >= 254 ? snow[i+76] : snow[i];
            const fall = [.028, .075, .149][depth] * (.64+.80*speed);
            const travel = time * fall;
            const bend = Math.sin(time*(.69+speed)+phase)*(.012+depth*.008);
            const px = fract(x + travel*.42 + bend + 1.01) * 1.06 - .03;
            const py = fract(y + travel) * 1.12 - .06;
            const diameter = Math.max(3, [6.5, 10, 18][depth]*(.62+size)*scale);
            const opacity = [.46,.55,.34][depth]*(.61+size*.39) * (scene === 2 ? .78 : 1);
            particles.set([px, py, diameter, .83, .90, 1, opacity], offset);
            offset += 7;
        }
        if (scene === 0) {
            for (const {x, y, speed, size, phase} of sparks) {
                const age = fract(time*(.21+speed*.27)+y);
                const u = .554 + (x-.5)*.079 + age*(.045+speed*.10) +
                    Math.sin(age*10+phase)*age*.026;
                const v = .755 - age*(.16+size*.15);
                const px = (u-.5-driftX)/(viewX*.965)+.5;
                const py = (v-.5-driftY)/(viewY*.965)+.5;
                const opacity = Math.sin(Math.PI*age)**.56 * (1-age) * (.5+speed*.5);
                particles.set([px, py, Math.max(3, scale*(5.1+size*5.8)), 1, .39+size*.36, .12, opacity], offset);
                offset += 7;
            }
        }

        // A short trail of tiny characters crosses the dark sky every so often.
        if (scene === 2) {
            const flight = (time + 13) % 18;
            for (let i = 0; i < 16; i++) {
                const age = flight - i*.025;
                if (age < 0 || age > 1.14) continue;
                const u = .79 - .20*age;
                const v = .095 + .14*age;
                const px = (u-.5-driftX)/(viewX*.965)+.5;
                const py = (v-.5-driftY)/(viewY*.965)+.5;
                const envelope = Math.sin(Math.PI*age/1.14);
                particles.set([px, py, Math.max(5, 13-i*.36)*scale,
                    .93, .96, 1, envelope*(.94-i*.048)], offset);
                offset += 7;
            }
        }

        if (gl) {
            gl.useProgram(pointsProgram);
            gl.uniform1i(particleGlyphs, 1);
            gl.uniform1f(particleGlyphCount, glyphRamp.length);
            gl.enable(gl.BLEND);
            gl.bindBuffer(gl.ARRAY_BUFFER, points);
            gl.bufferData(gl.ARRAY_BUFFER, particles.subarray(0, offset), gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(pointPosition);
            gl.vertexAttribPointer(pointPosition, 3, gl.FLOAT, false, 28, 0);
            gl.enableVertexAttribArray(pointTint);
            gl.vertexAttribPointer(pointTint, 4, gl.FLOAT, false, 28, 12);
            gl.drawArrays(gl.POINTS, 0, offset / 7);
            gl.disableVertexAttribArray(pointPosition);
            gl.disableVertexAttribArray(pointTint);
            gl.disable(gl.BLEND);
        } else {
            for (let i = 0; i < offset; i += 7) {
                const [x,y,size,r,g,b,a] = particles.subarray(i, i+7);
                ctx.fillStyle = `rgba(${r*255},${g*255},${b*255},${a})`;
                ctx.font = Math.max(6,size) + 'px monospace';
                ctx.fillText(r > .95 ? ',' : '.', x*width, y*height);
            }
        }
    }
    return animate;
}
