// Kaleido Drive and Ink Fold sketch surfaces in the character grid.
// Bloom Breaker adds a mesh of moving points and trails to the same grid.
const kineticScenes = `
vec3 spectrum(float phase) {
    return .52+.48*cos(TAU*(phase+vec3(.0,.31,.66)));
}
vec3 kaleidoDrive(vec2 p, float t) {
    vec2 drift = vec2(.27*sin(t*.71),.15*cos(t*.88));
    vec2 q = p-drift;
    float coarse = max(.07,length(q));
    q -= .13*vec2(sin(coarse*6.-t*1.4),cos(coarse*7.-t*1.8))*coarse;
    float r = max(.034,length(q));
    float depth = .90/(r+.14);
    float surge = .32*sin(t*2.21)+.14*sin(t*4.44);
    float z = depth-t*1.76-surge;
    float angle = atan(q.y,q.x)+.93*sin(t*.63)+.35*sin(z*.83+t*.8)+z*.31;

    // Split the tunnel wall into mirrored triangular panels.
    float facet = (angle+.13*sin(angle*3.+t*1.33))*6./TAU;
    float cell = floor(facet);
    float side = abs(fract(facet)-.5)*2.;
    float ring = fract(z);
    float cut = abs(ring-.5)*2.;
    float bevel = side + .72*cut;
    float panel = smoothstep(.36,.48,bevel)* (1.-smoothstep(.99,1.18,bevel));
    float inlay = filament(bevel-.48,.051)+.61*filament(bevel-1.14,.027);
    float seam = filament(side-.013,.063)*(.28+.72*sin(ring*3.14159));
    float warp = .57+.43*sin(angle*1.3+z*1.55-t*.9);
    float phase = .48+.14*sin(t*.6)+.13*cos(cell*TAU/6.)+.25*sin(z*.71+ring*1.84);
    vec3 hue = spectrum(phase);
    vec3 sideHue = spectrum(phase+.24);

    float pulse = pow(.5+.5*cos(z*1.8+t*2.6),7.);
    float panelShade = .24+.63*pow(.5+.5*cos((.7*ring+side)*5.8),2.);
    vec3 color = hue*panel*panelShade*warp;
    color += inlay*sideHue*(.30+.85*pulse) + seam*vec3(.44,.91,1.)*.46;
    float fine = max(filament(fract(ring*8.)-.5,.042),filament(fract(side*9.)-.5,.047));
    color += hue*fine*panel*pulse*.40;

    // Light packets overtake the viewer and move along the bevels.
    float shard = pow(.5+.5*cos(facet*TAU*.83 + z*6.1),18.) *
                  pow(.5+.5*cos(z*10.7+t*3.4),12.);
    color += shard*mix(hue,vec3(1.,.94,.66),.44)*1.8;
    float shock = filament(fract(z*.34+t*.47)-.58,.035);
    color += shock*inlay*vec3(.94,.94,1.)*1.1;
    float haze = smoothstep(.035,.24,r);
    color *= haze;
    color += hue*.18*filament(r-.14,.23);
    float portal = filament(r-.072,.013);
    color += portal*spectrum(t*.13)*(.72+.25*sin(angle*6.));
    return BLACK + color;
}

vec3 bloomBackdrop(vec2 p, float t) {
    float r = length(p);
    float a = atan(p.y,p.x);
    vec3 background = vec3(.026,.013,.080)*exp(-r*r*2.1);
    float cloud = noise(rotate(.24*t)*p*3.3);
    background += cloud*vec3(.052,.018,.086)*exp(-r*2.6);
    float wave = fract(t/8.8+.69);
    float ripple = filament(r-(.14+wave*1.69),.019)*pow(sin(wave*3.14159),2.);
    ripple += .51*filament(r-(.08+wave*1.43),.014)*pow(sin(wave*3.14159),2.);
    float sliver = pow(.5+.5*sin(11.*a-t*1.7),10.);
    background += ripple*(.17+.39*sliver)*spectrum(a/TAU+t*.07);
    background += vec3(.28,.30,.90)*stars(p*.91,t)*.52*smoothstep(.30,.81,r);
    return BLACK+background;
}

vec3 projectInk(vec3 p, float t) {
    p.xy = rotate(-.33+t*.30)*p.xy;
    p.yz = rotate(.57+.49*sin(t*.54))*p.yz;
    p.xz = rotate(.48*sin(t*.77+.4))*p.xz;
    return p;
}
vec2 paperCoords(vec3 p, float t) {
    float a = atan(p.y,p.x+.00001);
    float r = length(p.xy);
    vec2 strip = vec2(r-(.586+.043*cos(a*3.-t*.83)),p.z);
    return rotate(1.5*a+t*.61+.48*sin(a*3.+t*.82))*strip;
}
float paperSdf(vec3 p, float t) {
    vec2 xy = abs(paperCoords(p,t))-vec2(.258,.026)+.021;
    return (length(max(xy,0.))+min(max(xy.x,xy.y),0.)-.021)*.71;
}
vec3 inkFold(vec2 p, float t) {
    float r = length(p);
    float a = atan(p.y,p.x+.00001);
    float sweep = fract(t*.18)*1.7;
    float echo = filament(r-sweep,.043)*smoothstep(.16,.45,sweep)*(1.-smoothstep(1.12,1.58,sweep));
    float ridges = sin(28.*r-4.*cos(4.*a+t)+t*2.2);
    float stage = .005 + .024*exp(-r*r*2.7)+.125*echo*(.45+.55*pow(.5+.5*ridges,3.));
    float halo = filament(r-.915,.007)*pow(.5+.5*sin(a*78.-t*1.7),9.);
    stage += halo*.22;
    if (r > .94) return vec3(stage);

    vec3 ray = projectInk(vec3(0.,0.,-1.),t);
    vec3 origin = projectInk(vec3(p,1.15),t);
    float depth = 0.;
    float closest = 1.;
    for (int i=0;i<64;i++) {
        vec3 hit = origin+ray*depth;
        float d = paperSdf(hit,t);
        closest = min(closest,d);
        if (d < .0018) {
            vec2 h = vec2(.0033,0.);
            vec3 normal = normalize(vec3(
                paperSdf(hit+h.xyy,t)-paperSdf(hit-h.xyy,t),
                paperSdf(hit+h.yxy,t)-paperSdf(hit-h.yxy,t),
                paperSdf(hit+h.yyx,t)-paperSdf(hit-h.yyx,t)));
            float lighting = .35+.55*max(0.,dot(normal,normalize(vec3(-.39,.70,.53))));
            float edge = pow(1.-clamp(dot(-ray,normal),0.,1.),3.4);
            vec2 strip = paperCoords(hit,t);
            float angle = atan(hit.y,hit.x+.00001);
            // The mirrored line pattern joins cleanly across the half-twists.
            float veining = cos(80.*strip.x+1.8*sin(6.*angle+t*2.6)) *
                            cos(angle*9.-t*3.6);
            float ink = smoothstep(-.26,.16,veining);
            float ripple = .5+.5*sin(abs(strip.x)*30.+angle*6.-t*4.2);
            float guide = filament(abs(strip.x)-.228,.011);
            float finish = .045+.09*ripple + lighting*(.16+.91*ink);
            finish += .32*guide+.23*edge;
            return vec3(finish);
        }
        depth += d;
        if (depth > 2.35) break;
    }
    return vec3(stage+.115*filament(closest,.026));
}
`;

const bloomVertex = `
precision highp float;
attribute vec4 seed;
attribute float lag;
uniform float time;
uniform float aspect;
varying vec4 color;
const float PI = 3.14159265;
mat2 orbit(float a) {
    float c=cos(a),s=sin(a);
    return mat2(c,s,-s,c);
}
vec4 bloomPoint(float t) {
    float cycle=fract(t/8.8);
    float a=seed.x*6.2831853;
    float u=seed.y;
    float kind=seed.z;
    float lagged=cycle-(.29+seed.w*.07);
    float blast=smoothstep(0.,.18,lagged)*(1.-smoothstep(.21,.50,lagged));
    float unfurl=smoothstep(.04,.27,cycle)*(1.-smoothstep(.61,.94,cycle));
    float braid=smoothstep(.50,.69,cycle)*(1.-smoothstep(.76,.98,cycle));

    float latitude=2.*u-1.;
    float circle=sqrt(max(0.,1.-latitude*latitude));
    vec3 p=.57*vec3(circle*cos(a),circle*sin(a),latitude);
    p *= .50+.50*pow(kind,.21);
    float twist=.43*sin(t*.9)+u*.53;
    float petals=.29+.71*pow(.5+.5*cos(a*5.+twist),2.1);
    float petalRadius=(.08+.82*pow(u,.71))*petals;
    vec3 flower=vec3(petalRadius*cos(a+twist),petalRadius*sin(a+twist),
                     .24*sin(u*3.9+cos(a*5.))-.16+.086*kind);
    p=mix(p,flower,unfurl);

    float spin=a+.87*blast+u*.37+kind*.6;
    float spray=(.37+.80*pow(kind,.63))*(.82+.20*cos(a*8.+u*6.));
    vec3 shattered=vec3(spray*cos(spin),spray*sin(spin),.92*(u-.5)+.15*sin(a*11.));
    p=mix(p,shattered,blast);

    float strand=u*12.56637;
    float separation = (kind < .50 ? 0. : PI);
    float spindle = .30+.12*cos(strand*.5);
    vec3 helix=vec3((u-.5)*1.6,spindle*cos(strand+separation+t*1.3),spindle*sin(strand+separation+t*1.3));
    helix+=.09*vec3(cos(a),sin(a),cos(2.*a));
    helix.xy=orbit(.65+.30*sin(t*.68))*helix.xy;
    p=mix(p,helix,braid*.86);

    p.xz=orbit(.64*sin(t*.62))*p.xz;
    p.yz=orbit(.37+.41*cos(t*.74))*p.yz;
    p.xy=orbit(t*.28+.44*sin(t*.86))*p.xy;
    float z=1.66-.65*p.z;
    vec2 projected=1.73*p.xy/z;
    return vec4(projected.x/max(aspect,.85),projected.y,blast,p.z);
}
void main() {
    float t=time-lag;
    vec4 point=bloomPoint(t);
    gl_Position=vec4(point.xy,0.,1.);
    float sparkle = pow(.5+.5*sin(time*8.9+seed.z*441.),12.);
    float hot=.53+.47*sin(seed.x*6.2831853+seed.y*5.+time*1.2);
    vec3 warm=mix(vec3(1.,.045,.27),vec3(1.,.64,.08),hot);
    vec3 cold=mix(vec3(.32,.06,1.),vec3(.04,.92,.89),hot);
    vec3 paint=mix(warm,cold,smoothstep(.22,.75,seed.y-.18*point.z));
    paint=mix(paint,warm,smoothstep(.32,.89,point.z)*(.30+.45*seed.w));
    paint=mix(paint,vec3(1.,.88,.75),sparkle*.47);
    float depth=smoothstep(-.60,.78,point.w);
    float alpha=(.09+.23*depth+.12*sparkle)*(seed.z > .81 ? 1. : .64);
    alpha*=.91+1.92*smoothstep(.12,.95,point.z);
    color=vec4(paint,alpha);
    gl_PointSize=1.20+1.10*depth+1.03*sparkle+.53*point.z;
}
`;

const bloomFragment = `
precision mediump float;
uniform bool isTrail;
varying vec4 color;
void main() {
    float feather = 1.;
    if (!isTrail) {
        feather=1.-smoothstep(.16,.57,length(gl_PointCoord-.5));
    }
    gl_FragColor=vec4(color.rgb,color.a*feather*(isTrail ? .29 : 1.));
}
`;

function makeBloomPainter(gl) {
    const program = makeProgram(gl,bloomVertex,bloomFragment);
    const time = gl.getUniformLocation(program,'time');
    const aspect = gl.getUniformLocation(program,'aspect');
    const isTrail = gl.getUniformLocation(program,'isTrail');
    const seed = gl.getAttribLocation(program,'seed');
    const lag = gl.getAttribLocation(program,'lag');
    const points = 5400, trails = 1040;
    const vertices = new Float32Array((points+trails*2)*5);
    const sample = (i, n) => {
        const h = Math.sin((i+1)*12.317+n*74.51)*43758.5453;
        return h-Math.floor(h);
    };
    for (let i=0;i<points;i++) {
        vertices.set([sample(i,1),sample(i,2),sample(i,3),sample(i,4),0],i*5);
    }
    for (let i=0;i<trails;i++) {
        const point = vertices.subarray(i*5,(i+1)*5);
        const start = (points+i*2)*5;
        vertices.set(point,start);
        vertices.set(point,start+5);
        vertices[start+9] = .09+.10*point[3];
    }
    const mesh = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh);
    gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);

    return (t,ratio) => {
        gl.useProgram(program);
        gl.uniform1f(time,t);
        gl.uniform1f(aspect,ratio);
        gl.bindBuffer(gl.ARRAY_BUFFER,mesh);
        gl.enableVertexAttribArray(seed);
        gl.enableVertexAttribArray(lag);
        gl.vertexAttribPointer(seed,4,gl.FLOAT,false,20,0);
        gl.vertexAttribPointer(lag,1,gl.FLOAT,false,20,16);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
        gl.uniform1i(isTrail,1);
        gl.drawArrays(gl.LINES,points,trails*2);
        gl.uniform1i(isTrail,0);
        gl.drawArrays(gl.POINTS,0,points);
        gl.disable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.disableVertexAttribArray(seed);
        gl.disableVertexAttribArray(lag);
    };
}

function drawKineticFallback(pen, design, time, width, height) {
    pen.fillStyle = design === 2 ? '#000' : '#080617';
    pen.fillRect(0,0,width,height);
    pen.save();
    pen.translate(width/2,height/2);
    pen.scale(height*.68,height*.50);
    if (design === 0) {
        for (let i=0;i<12;i++) {
            const depth = (i/12+time*.43)%1;
            const radius = .06+1.6*depth*depth;
            pen.rotate(.06+.10*Math.sin(time));
            pen.lineWidth = .025+.021*depth;
            pen.strokeStyle = `hsl(${(time*48+i*25)%360} 90% ${29+depth*41}%)`;
            pen.beginPath();
            for (let j=0;j<12;j++) {
                const angle = j*Math.PI/6;
                const point = (j%2 ? .76 : 1)*radius;
                pen.lineTo(point*Math.cos(angle),point*Math.sin(angle));
            }
            pen.closePath();
            pen.stroke();
        }
    } else if (design === 1) {
        pen.globalCompositeOperation = 'lighter';
        for (let i=0;i<1100;i++) {
            const a = i*2.399963 + time*.58;
            const n = (i*12.874)%1;
            const pulse = Math.sin(time*1.5)*.5+.5;
            const radius = (.16+n*.72)*(.51+.49*Math.cos(a*5.+time)**2)+pulse*n*.24;
            pen.fillStyle = `hsla(${(i*.55+time*55)%360},100%,65%,.48)`;
            pen.fillRect(Math.cos(a)*radius,Math.sin(a)*radius,.016,.020);
        }
    } else {
        pen.rotate(time*.24);
        for (let i=0;i<26;i++) {
            pen.lineWidth = .015+.014*Math.sin(i+time)**2;
            const gray = 145+Math.round(104*Math.sin(i*.27+time)**2);
            pen.strokeStyle = `rgb(${gray},${gray},${gray})`;
            pen.beginPath();
            for (let j=0;j<=166;j++) {
                const a = j*2*Math.PI/166;
                const radius = .594+(i-12.5)*.019*Math.cos(a*1.5+time*.71);
                pen.lineTo(radius*Math.cos(a),radius*Math.sin(a)*(.79+.17*Math.sin(time*.69)));
            }
            pen.stroke();
        }
    }
    pen.restore();
}
