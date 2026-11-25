// Draw the procedural effects once per character cell, then typeset them at display resolution.
const fieldPrelude = `
precision highp float;

uniform float time;
uniform float aspect;
uniform int design;
varying vec2 uv;

const float TAU = 6.283185307;
const vec3 BLACK = vec3(.002, .003, .016);

mat2 rotate(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, s, -s, c);
}
float hash(vec2 p) {
    vec3 v = fract(vec3(p.xyx) * .1031);
    v += dot(v, v.yzx + 33.33);
    return fract((v.x + v.y) * v.z);
}
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 w = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),w.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),w.x),w.y);
}
vec3 gradient(float t, vec3 a, vec3 b, vec3 c) {
    t = clamp(t, 0., 1.);
    return t < .5 ? mix(a,b,t*2.) : mix(b,c,t*2.-1.);
}
float filament(float d, float width) {
    return exp(-abs(d)/width);
}
float stars(vec2 p, float t) {
    vec2 mosaic = p*vec2(87.,68.);
    float seed = hash(floor(mosaic));
    float wink = .36+.64*pow(.5+.5*sin(t*1.9+seed*727.),3.);
    return step(.984,seed)*(1.-smoothstep(.16,.57,length(fract(mosaic)-.5)))*wink;
}

`;

const neonScenes = `
vec3 horizon(vec2 p, float t) {
    vec2 q = rotate(.24+.095*sin(t*.36))*p;
    q.x += .025*sin(t*.7);
    float r = length(q);
    float a = atan(q.y,q.x);
    float compression = .29+.08*sin(t*.44);
    vec2 plane = q*vec2(1.,1./compression);
    float distance = length(plane);
    float angle = atan(plane.y,plane.x);
    float sweep = angle + t*(.42 + .35 / max(distance,.31));
    float warp = sin(5.*sweep+22.*distance)*.027 + sin(13.*sweep-8.*distance)*.008;
    float bands = pow(.5+.5*sin((distance+warp)*117.-t*.76), 5.);
    float turbulence = noise(vec2(cos(sweep),sin(sweep))*5. + distance*vec2(3.,11.));
    float grain = noise(vec2(distance*97., cos(7.*sweep)*9. + t*.26));
    float flare = pow(.5+.5*sin(2.*sweep-4.*distance),5.);
    float disk = smoothstep(.36,.44,distance)*(1.-smoothstep(.95,1.48,distance));
    disk *= (.18+.82*pow(turbulence,2.))*(.27+.73*bands) * (.36 + .64*grain);
    disk *= .45+.79*flare;
    float cool = smoothstep(.43,1.19,distance);
    vec3 diskColor = gradient(cool,vec3(1.,.65,.09),vec3(1.,.035,.33),vec3(.12,.12,1.));
    vec3 glow = diskColor * disk * 4.8;
    glow += diskColor * .20 * filament(distance-.59,.27) * filament(q.y,.25);

    float border = .338+.006*sin(4.*a+t*.65);
    float orbit = filament(r-border,.0085);
    float caustic = filament(r-border,.046);
    float loopRadius = length(vec2(q.x,q.y*1.23));
    float glass = .40+.058*sin(a*2.+.4) + .014*sin(a*7.+t*.7);
    float lens = filament(loopRadius-glass,.023);
    lens += .55*filament(loopRadius-glass-.054,.012) + .39*filament(loopRadius-glass-.101,.009);
    lens *= (.27+.73*pow(.5+.5*sin(10.*a-t*2.2+sin(a*5.)),2.)) * smoothstep(-.12,.24,q.y);
    vec3 lensColor = gradient(.5+.5*sin(1.5*a-t*.36),vec3(.27,.05,1.),vec3(1.,.045,.54),vec3(1.,.42,.055));
    float back = smoothstep(border-.017,border+.018,r);
    float halo = filament(r-.37,.19) * pow(.5+.5*cos(2.*a+.32-t*.23),2.);
    float mist = (.16+noise(p*8.+t*.045)*.84) * filament(length(p*vec2(.51,1.))-1.2,.39);
    vec3 nebula = mist*.024*vec3(.21,.07,1.)*back + halo*.09*lensColor*back;
    float front = 1.-smoothstep(-.18,-.025,q.y);
    vec3 color = mix(glow*back,glow,max(back,front));
    color += lensColor*(orbit*1.3 + caustic*.20 + lens*.73);
    color += vec3(1.,.74,.46) * orbit * .88 * pow(.5+.5*sin(2.*a-t*1.1),5.);

    float star = stars(p + vec2(t*.005,0.),t)*smoothstep(.4,.58,r);
    color += star * vec3(.55,.38,1.);
    float spark = pow(.5+.5*sin(sweep*31.+sin(distance*72.)*3.),16.)
                * pow(.5+.5*sin(distance*214.-t*1.8),13.);
    color += spark*diskColor*smoothstep(.52,.65,distance)*(1.-smoothstep(.89,1.38,distance))*back;
    // Twin particle jets eject a burst along the axis of the accretion disk.
    float axial = abs(q.y);
    float flareTime = fract((t+.85)*.155);
    float jetFront = .30 + flareTime*.89;
    float jetWidth = .014 + .10*smoothstep(.30,1.,axial);
    float streak = filament(q.x + .038*sin(q.y*11.-t*1.25),jetWidth);
    float flareEnvelope = sin(3.14159*flareTime)*sin(3.14159*flareTime);
    float jet = streak * filament(axial-jetFront,.19) * flareEnvelope;
    jet *= smoothstep(.35,.45,axial)*(.28+.72*noise(q*vec2(127.,72.)-vec2(0.,t*7.)));
    vec3 jetColor = mix(vec3(.68,.08,1.),vec3(.23,.74,1.),smoothstep(.42,.83,axial));
    return BLACK + color + nebula + jetColor*jet*.46;
}

vec3 twist(vec3 p, float x, float z) {
    p.yz = rotate(x)*p.yz;
    p.xy = rotate(z)*p.xy;
    return p;
}
float torus(vec3 p, float radius, float thickness) {
    return length(vec2(length(p.xz)-radius,p.y))-thickness;
}
vec2 engine(vec3 p) {
    vec3 x = twist(p,1.03,.24), z = twist(p,-.76,1.43);
    float first = torus(p,.55,.052);
    float second = torus(x,.68,.046);
    float third = torus(z,.79,.037);
    vec2 result = first < second ? vec2(first,0) : vec2(second,1);
    if (third < result.x) result = vec2(third,2);
    float core = (dot(abs(p),vec3(1.))-(.313+.026*sin(time*2.0)))*.57735;
    return core < result.x ? vec2(core,3) : result;
}
vec3 prism(vec2 p, float t) {
    float r = length(p), a = atan(p.y,p.x);
    float fringe = filament(r-.927,.010)*.28 + filament(r-.955,.007)*
                   pow(.5+.5*sin(a*88.+t*.72),11.)*.77;
    float satellites = filament(r-.985-.009*sin(6.*a),.008)
                    * pow(.5+.5*cos(a*5.-t*1.75),24.);
    float wave = fract(t*.39-.18*a/TAU);
    float shock = pow(.5+.5*cos(t*1.63),8.);
    float trace = filament(r-.905-.2*wave,.009)*shock*
                  pow(.5+.5*cos(a*12.-t*3.),8.);
    float scan = filament(r-(.67+wave*.52),.011)
               * sin(wave*3.14159)*pow(.5+.5*sin(a*7.+t*.8),7.);
    float fog = exp(-r*r*3.1)*.64;
    vec3 color = BLACK + vec3(.028,.028,.18)*fog
               + fringe*vec3(.075,.21,.35) + satellites*vec3(.68,.32,1.)
               + scan*vec3(.10,.34,.69) + trace*vec3(.68,.48,1.) + stars(p,t)*vec3(.14,.23,.48)*smoothstep(.80,.95,r);
    if (r > .88) return color;

    vec3 o = vec3(p,1.04), ray = vec3(0.,0.,-1.);
    float tilt = .87 + .37*sin(t*.63);
    float spin = t*.87 + .23*sin(t*.4);
    o = twist(o,tilt,spin);
    ray = twist(ray,tilt,spin);
    float dist = 0.;
    float closest = 10.;
    float id = 0.;
    bool hit = false;
    for (int i=0; i<37; i++) {
        vec2 probe = engine(o + dist*ray);
        closest = min(closest,probe.x);
        if (probe.x < .0016) { hit = true; id = probe.y; break; }
        dist += probe.x*.87;
        if (dist > 2.1) break;
    }
    color += .17*vec3(.24,.19,.94)*filament(closest,.025);
    if (!hit) return color;
    vec3 point = o + ray*dist;
    vec2 eps = vec2(.003,0.);
    vec3 n = normalize(vec3(
        engine(point+eps.xyy).x-engine(point-eps.xyy).x,
        engine(point+eps.yxy).x-engine(point-eps.yxy).x,
        engine(point+eps.yyx).x-engine(point-eps.yyx).x
    ));
    vec3 local = point;
    if (id == 1.) local = twist(point,1.03,.24);
    if (id == 2.) local = twist(point,-.76,1.43);
    float orbit = atan(local.z,local.x);
    float ember = pow(.5+.5*sin(3.*orbit+t*3.8+id),8.);
    float etch = pow(.5+.5*sin(orbit*45.-t*1.5),7.);
    float seam = filament(abs(local.y)-.021,.009);
    float reflection = pow(max(0.,dot(reflect(ray,n),normalize(vec3(.15,.6,1.)))),10.);
    float light = .24+.48*max(0.,dot(n, normalize(vec3(-.4,.5,.7))));
    float edge = pow(1.-max(0.,dot(n,-ray)),2.2);
    vec3 metallic = vec3(.055,.68,1.);
    if (id == 1.) metallic = vec3(.82,.12,1.);
    if (id == 2.) metallic = vec3(.55,1.,.070);
    if (id == 3.) {
        metallic = gradient(.52+.38*sin(t*2.+point.x*16.),vec3(.04,.90,1.),vec3(.64,.2,1.),vec3(1.,.99,.4));
    }
    color += metallic*(light + .83*edge + 1.09*ember + .32*etch);
    color += vec3(.72,.90,1.) * (.32*edge + .62*reflection + .19*seam + .34*etch*ember + .35*shock*ember);
    return color;
}

vec3 liquid(vec2 p, float t) {
    vec2 q = rotate(-.24+.14*sin(t*.39))*p;
    float fold = .27*sin(q.x*2.2-t*.83) + .19*cos(q.x*3.7+t*.64);
    q.y -= fold;
    float flow = q.x*3.2-t*1.24;
    float warp = sin(q.x*4.1 + q.y*2.6 + t*1.14);
    float billow = .6 + .36*sin(q.x*2.65-t*1.1);
    vec3 color = BLACK + stars(p*1.4,t)*vec3(.23,.06,.29)*.59;
    for (int i=0; i<3; i++) {
        float band = float(i);
        float phase = band*2.06;
        float axis = (band-1.)*.23 + sin(q.x*2.8+t*1.01+phase)*(.08+.21*billow)
                   + sin(q.x*5.1-t*1.32+phase)*.065;
        float dist = q.y-axis;
        float thickness = .13+.111*pow(.5+.5*sin(q.x*2.1+t+phase),2.);
        float envelope = exp(-pow(dist/thickness,2.));
        float threads = 18.*dist/thickness + warp*3. + sin(q.x*2.-t*1.7+phase)*2.;
        float silk = pow(.5+.5*cos(threads),7.);
        float movingEdge = filament(abs(dist)-thickness*.70,.012+.007*billow);
        float stream = .36+.64*pow(.5+.5*sin(flow+phase+dist*11.),3.);
        float tap = noise(vec2(q.x*7.8-t*2.,dist*38.+phase));
        float tint = .5+.5*sin(flow*.63 + dist*8.3 + phase);
        vec3 ribbon = gradient(tint,vec3(.045,.51,1.),vec3(.15,1.,.72),vec3(.69,.05,1.));
        if (i == 1) ribbon = gradient(tint,vec3(.26,.09,1.),vec3(1.,.04,.59),vec3(1.,.21,.18));
        float gauze = exp(-pow(dist/(thickness*1.85),2.));
        float pulse = pow(.5+.5*sin(flow*1.46 + phase - dist*22.),10.);
        float sheen = .19*envelope + (.52+1.19*stream)*silk*envelope + movingEdge*.69;
        sheen += gauze*(.052+.095*pulse);
        color += ribbon*sheen*(.55+.45*tap);
        float burst = pow(.5+.5*cos(q.x*2.6-t*2.1+phase),22.);
        float glitter = pow(tap,7.) * burst * gauze;
        color += vec3(.62,.56,.72)*(silk*envelope*max(0.,stream-.52)*1.6 + glitter*.77);
    }
    float interference = pow(.5+.5*sin(q.y*83.+warp*5.-t*4.),17.);
    color += vec3(.14,.035,.32)*interference*exp(-abs(q.y)*4.8)*(.3+.7*billow);
    return color;
}

`;

const fieldMain = (first, second, last) => `
void main() {
    vec2 p = (vec2(uv.x,1.-uv.y)-.5)*2.*vec2(aspect,1.);
    // Keep the focal point in view on tall or nearly square displays.
    p *= min(1.3,max(1.,.95/aspect));
    vec3 light;
    if (design == 0) light = ${first}(p,time);
    else if (design == 1) light = ${second}(p,time);
    else light = ${last}(p,time);
    float vignette = 1.-.32*smoothstep(.58,1.45,length(p*.8));
    light *= vignette;
    float peak = max(light.r,max(light.g,light.b));
    gl_FragColor = vec4(light / max(.0001,peak) * (1.-exp(-peak*1.68)),1.);
}
`;

const neonType = `
precision highp float;

uniform sampler2D field;
uniform sampler2D glyphs;
uniform vec2 grid;
uniform float glyphCount;
uniform float time;
uniform bool monochrome;
varying vec2 uv;

void main() {
    vec2 id = floor(uv*grid);
    vec2 tile = fract(uv*grid);
    vec2 center = (id+.5)/grid;
    vec3 light = texture2D(field,vec2(center.x,1.-center.y)).rgb;
    float peak = max(light.r,max(light.g,light.b));
    float strength = pow(peak,.78);
    float seed = fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);
    float shimmer = .46*sin(time*5.+seed*90.)*smoothstep(.29,.75,peak);
    float character = clamp(floor(strength*glyphCount+seed*.76+shimmer),0.,glyphCount-1.);
    float ink = texture2D(glyphs,vec2((character+tile.x)/glyphCount,tile.y)).a;
    vec3 aura = light * (.19+.17*strength) + vec3(.004,.005,.014);
    vec3 textColor = clamp(light * (1.2 + 1.2*(1.-peak)),0.,1.);
    textColor = mix(textColor,vec3(.92,.97,1.),smoothstep(.85,1.,peak)*.42);
    vec3 color = mix(aura,textColor,ink);
    if (monochrome) color = vec3(dot(color,vec3(.2126,.7152,.0722)));
    gl_FragColor = vec4(color,1.);
}
`;

function makeProceduralRenderer(gl, mesh) {
    const lightingPrograms = [
        neonScenes + fieldMain('horizon','prism','liquid'),
        y2kScenes + fieldMain('chromeBloom','dialUp','chromeCross'),
        kineticScenes + fieldMain('kaleidoDrive','bloomBackdrop','inkFold'),
        y2kScenes + fieldMain('candyHeart','starStack','starStack')
    ].map(source => {
        const program = makeProgram(gl, backdropVertex, fieldPrelude + source);
        const uniforms = Object.fromEntries(['time','aspect','design'].map(
            name => [name, gl.getUniformLocation(program, name)]));
        return {program, uniforms, position: gl.getAttribLocation(program, 'position')};
    });
    const type = makeProgram(gl, backdropVertex, neonType);
    const typePosition = gl.getAttribLocation(type, 'position');
    const typeUniforms = Object.fromEntries(['field','glyphs','grid','glyphCount','time','monochrome'].map(
        name => [name, gl.getUniformLocation(type, name)]));
    const paintBloom = makeBloomPainter(gl);
    const framebuffer = gl.createFramebuffer();
    const lighting = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, lighting);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    let lastColumns = 0, lastRows = 0;

    function draw(position) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(position);
    }

    return (design, time, width, height, columns, rows) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        if (columns !== lastColumns || rows !== lastRows) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, lighting);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, columns, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lighting, 0);
            gl.activeTexture(gl.TEXTURE0);
            lastColumns = columns;
            lastRows = rows;
        }

        gl.viewport(0,0,columns,rows);
        const light = lightingPrograms[Math.floor(design/3)];
        gl.useProgram(light.program);
        gl.uniform1f(light.uniforms.time,time);
        gl.uniform1f(light.uniforms.aspect,width/height);
        gl.uniform1i(light.uniforms.design,design%3);
        draw(light.position);
        if (design === 7) paintBloom(time,width/height);

        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        gl.viewport(0,0,width,height);
        gl.useProgram(type);
        gl.uniform1i(typeUniforms.field,2);
        gl.uniform1i(typeUniforms.glyphs,1);
        gl.uniform2f(typeUniforms.grid,columns,rows);
        gl.uniform1f(typeUniforms.glyphCount,glyphRamp.length);
        gl.uniform1f(typeUniforms.time,time);
        gl.uniform1i(typeUniforms.monochrome,design === 8 ? 1 : 0);
        draw(typePosition);
    };
}

// Canvas fallback for systems that disable WebGL.
function drawNeonFallback(pen, design, t, width, height) {
    pen.fillStyle = '#07051a';
    pen.fillRect(0,0,width,height);
    pen.save();
    pen.translate(width/2,height/2);
    pen.scale(height/2,height/2);
    const palettes = [
        [14, 333, 253],
        [193, 276, 100],
        [173, 324, 264]
    ];
    pen.globalCompositeOperation = 'lighter';
    for (let i=0; i<33; i++) {
        const group = i%3;
        const hue = palettes[design][group] + Math.sin(t+i)*13;
        pen.strokeStyle = `hsla(${hue},100%,61%,${.19+.45*(.5+.5*Math.sin(t*2.2+i*.7))})`;
        pen.lineWidth = .009 + .008*(i%3);
        pen.beginPath();
        if (design < 2) {
            const radius = design === 0 ? .39+i*.023 : .45+i*.009;
            const a = design === 0 ? -.22 : t*.46+group*1.05;
            const squash = design === 0 ? (i%4 === 0 ? .88 : .24) : .32+.25*Math.sin(t+group*2);
            const start = t*(.8+(i%4)*.17)+i*1.12;
            pen.ellipse(0,0,radius,radius*squash,a,start,start+1.25+(i%4)*.57);
        } else {
            const limit = width/height;
            for (let x=-limit; x<=limit; x+=.035) {
                const y = .28*Math.sin(x*2.8-t+i*.015) + .13*Math.cos(x*5.2+t*1.4+group)
                    + (group-1)*.23 + (i/3-5)*.025*Math.sin(x*1.9+t*.78);
                pen.lineTo(x,y);
            }
        }
        pen.stroke();
    }
    pen.restore();
}
