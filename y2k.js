// The Y2K collection shares the procedural renderer's noise and drawing helpers.
const y2kScenes = `
float softBox(vec2 p, vec2 bounds, float radius) {
    vec2 q = abs(p) - bounds + radius;
    return length(max(q,0.)) + min(max(q.x,q.y),0.) - radius;
}
float boxMask(vec2 p, vec2 bounds, float radius) {
    return 1. - smoothstep(-.012,.012,softBox(p,bounds,radius));
}
float gridLine(float x, float width) {
    return filament(fract(x+.5)-.5,width);
}
vec3 turn3(vec3 p, float pitch, float yaw, float roll) {
    p.xy = rotate(roll)*p.xy;
    p.yz = rotate(pitch)*p.yz;
    p.xz = rotate(yaw)*p.xz;
    return p;
}
float square(float x) { return x*x; }
float crossFlare(vec2 p, float spread) {
    return exp(-abs(p.x)*68. - abs(p.y)/spread)
         + exp(-abs(p.y)*78. - abs(p.x)/spread)
         + .48*exp(-length(p)*60.);
}

float starShape(vec3 p) {
    float a = atan(p.y,p.x+.00001);
    float blade = pow(.5+.5*cos(a*4.),3.7);
    float radius = .36+.37*blade;
    float r = length(p.xy);
    return (length(vec2(r*.36/radius,p.z*1.65))-.36)*.53;
}
vec3 silver(vec3 n, vec3 ray, vec3 p, float t) {
    vec3 ref = reflect(ray,n);
    float height = ref.y;
    float skyline = smoothstep(-.17,.15,height+.06*sin(ref.x*5.));
    vec3 reflected = mix(vec3(.71,.28,.55),vec3(.26,.37,.69),skyline);
    reflected *= .47+.53*smoothstep(.05,.53,abs(height));
    float softbox = exp(-square((height+.47)*4.6)-square((ref.x-.29)*2.1));
    float backlight = exp(-square((height-.55)*5.)-square((ref.x+.48)*3.6));
    float horizon = filament(height+.10+.07*ref.x,.074);
    float pearlescence = .5+.5*cos(4.8*p.y+3.6*p.x+t*.93+5.1*height);
    reflected += mix(vec3(.23,.49,.93),vec3(.96,.30,.68),pearlescence)
                * (.18*.65 + .49*backlight);
    float hotRim = filament(height-.31 + sin(ref.x*4.)*.085,.029);
    reflected += softbox*vec3(1.,.83,.95)*1.78 + horizon*vec3(.76,.84,1.)*.94;
    reflected += hotRim*vec3(.93,.95,1.)*.63;
    float rim = pow(1.-clamp(dot(n,-ray),0.,1.),2.5);
    return reflected + rim*vec3(.53,.64,1.)*.44;
}
vec3 chromeBloom(vec2 p, float t) {
    vec2 q = p-vec2(.035*sin(t*.42),.03*cos(t*.73));
    float r = length(q);
    vec3 color = mix(vec3(.046,.020,.098),vec3(.26,.062,.19),exp(-r*r*1.12));
    color += vec3(.28,.09,.24)*exp(-dot(q-vec2(-.56,.13),q-vec2(-.56,.13))*2.9);
    float printed = gridLine(p.x*7.2,.055)*gridLine(p.y*7.2,.055);
    color += vec3(.23,.11,.26)*printed*.14;

    // The same orbit runs in front of the sculpture on the near half and behind it on the far half.
    vec2 track = rotate(.33+.08*sin(t*.46))*q;
    vec2 ellipse = track*vec2(1.,2.6);
    float a = atan(ellipse.y,ellipse.x);
    float ring = length(ellipse);
    float nearSide = 1.-smoothstep(-.07,.02,track.y);
    float ringFlash = pow(.5+.5*cos(a-t*1.85),37.);
    color += vec3(.96,.52,.84)*.44*ringFlash*filament(ring-.97,.037);
    float speedDot = pow(.5+.5*cos(2.*a-t*2.1),18.);
    float line = filament(ring-.97,.010) + .38*filament(ring-1.08,.009);
    float chain = filament(ring-1.08,.016)*pow(.5+.5*cos(a*45.-t*3.1),7.);
    vec3 orbit = vec3(.82,.37,.69)*line*(.22+.75*speedDot)
               + vec3(.49,.68,1.)*.38*chain;
    color += orbit;
    for (int i=0; i<8; i++) {
        float seed = float(i);
        float angle = seed*.7854+t*(.48+.025*seed);
        vec2 bead = rotate(-.33-.08*sin(t*.46))
                    * vec2(1.09*cos(angle),.46*sin(angle));
        vec2 fromBead = q-bead;
        float size = .018+.021*pow(.5+.5*sin(angle),2.);
        float d = length(fromBead);
        color += vec3(.56,.61,1.)*.14*filament(d,.063);
        if (d < size) {
            float normal = sqrt(max(0.,1.-dot(fromBead,fromBead)/(size*size)));
            color += silver(normalize(vec3(fromBead/size,normal)), vec3(0,0,-1),
                            vec3(bead,0.),t)*(.52+.20*sin(angle));
        }
        color += crossFlare(fromBead,.055)*.33*pow(.5+.5*sin(t*1.6+seed*9.),9.)
                 * vec3(.87,.65,1.);
    }

    if (r > .80) return color;
    float roll = -t*.57-.17*sin(t*.61);
    float pitch = .39*sin(t*.83)+.21;
    float yaw = .48*sin(t*.64+.25);
    vec3 ray = turn3(vec3(0,0,-1),pitch,yaw,roll);
    vec3 eye = turn3(vec3(q,1.2),pitch,yaw,roll);
    float d = 0., closest = 1.;
    for (int i=0; i<57; i++) {
        float stepSize = starShape(eye+d*ray);
        closest = min(closest,stepSize);
        if (stepSize < .0014) {
            vec3 hit = eye+d*ray;
            vec2 e = vec2(.003,0.);
            vec3 n = normalize(vec3(starShape(hit+e.xyy)-starShape(hit-e.xyy),
                                    starShape(hit+e.yxy)-starShape(hit-e.yxy),
                                    starShape(hit+e.yyx)-starShape(hit-e.yyx)));
            return silver(n,ray,hit,t) + orbit*nearSide*.81;
        }
        d += stepSize;
        if (d > 2.12) break;
    }
    return color + vec3(.93,.38,.72)*filament(closest,.022)*.29;
}

float deviceShape(vec3 p) {
    vec3 q = abs(p) - vec3(.51,.62,.17) + .115;
    return length(max(q,0.)) + min(max(q.x,max(q.y,q.z)),0.) - .115;
}
vec3 dialScreen(vec2 p, float t) {
    vec3 color = vec3(.008,.075,.123);
    float mesh = max(gridLine(p.x*13.,.039),gridLine(p.y*13.,.043));
    color += vec3(.045,.32,.40)*mesh*.36;
    float wave = sin(p.x*19.+t*4.6)*sin(p.x*7.4-t*3.2) + .3*sin(p.x*52.-t*5.8);
    float drift = .099*wave+.042*cos(t*1.7)-.012;
    float trace = filament(p.y-drift,.011);
    float echo = filament(p.y-drift-.035*sin(t*2.+7.*p.x),.013);
    color += vec3(.13,.74,1.0)*echo*.48 + vec3(.38,1.0,.79)*trace*1.26;
    float scanner = .37-fract(t*.40)*.72;
    color += vec3(.22,.71,1.)*filament(p.x-scanner,.014)*.58;
    float ft = floor((p.x+.39)*27.);
    float readout = .022+.039*pow(.5+.5*sin(t*6.+ft*2.374),2.);
    float meter = step(-.187,p.y)*step(p.y,-.187+readout)*step(.25,fract((p.x+.39)*27.));
    color += vec3(.12,.77,.87)*meter*.61;
    float header = boxMask(p-vec2(-.204,.157),vec2(.12,.015),.005)
                 + boxMask(p-vec2(.23,.157),vec2(.06,.015),.005);
    color += vec3(.25,.72,1.)*header*.67;
    return color * (.83+.17*cos(p.y*245.));
}
vec3 dialUp(vec2 p, float t) {
    vec2 q = p-vec2(.047*sin(t*.61),.063*cos(t*.90));
    float r = length(q);
    vec3 color = vec3(.009,.064,.105) + vec3(.016,.30,.34)*exp(-r*r*2.0);
    float sea = noise(rotate(-.24)*p*4.+vec2(-t*.19,t*.07));
    float caustic = filament(sin(p.y*10.+p.x*8.+sin(6.*p.x-t)+t*.64),.15);
    color += vec3(.009,.21,.23)*caustic*sea*.32;
    float dots = gridLine(p.x*12.,.08)*gridLine(p.y*12.,.08);
    color += vec3(.06,.19,.24)*dots*.61;
    float cable = .29*sin(p.x*2.6-t*.94) + .46*sin(p.x*.83+.4);
    float packet = pow(.5+.5*cos(p.x*11.-t*3.9),12.);
    color += vec3(.14,.55,.65)*filament(p.y-cable,.026)*(.14+.63*packet);
    color += vec3(.30,.78,.70)*filament(p.y-cable+.061,.013)*packet*.29;
    for (int i=0; i<14; i++) {
        float id = float(i);
        float phase = fract(id*.618+t*(.081+.013*mod(id,3.)));
        vec2 center = vec2((hash(vec2(id,7.))-.5)*3.8 + .11*sin(phase*6.+id),phase*2.55-1.25);
        vec2 v = p-center;
        float radius = .026+.15*hash(vec2(2.2,id));
        float d = length(v);
        float alpha = smoothstep(0.,.15,phase)*(1.-smoothstep(.79,1.,phase));
        float flare = filament(d-radius,.011)*(.26+.74*smoothstep(-.46,.41,v.y/radius));
        float shine = exp(-length(v-radius*vec2(-.42,.51))*51.);
        color += alpha*(vec3(.19,.74,.81)*flare*.86+vec3(.72,1.,.90)*shine*.65);
        color += alpha*vec3(.014,.15,.17)*(1.-smoothstep(.7,1.,d/radius));
    }

    if (r > .97) return color;
    float pitch = -.18+.16*sin(t*.71);
    float yaw = .54*sin(t*.75+.8);
    float roll = .12*cos(t*.83);
    vec3 eye = turn3(vec3(q,1.17),pitch,yaw,roll);
    vec3 ray = turn3(vec3(0,0,-1),pitch,yaw,roll);
    float distance = 0., closest = 1.;
    for(int i=0; i<38; i++) {
        vec3 hit = eye+distance*ray;
        float d = deviceShape(hit);
        closest = min(closest,d);
        if (d < .0017) {
            vec2 e = vec2(.004,0.);
            vec3 n = normalize(vec3(deviceShape(hit+e.xyy)-deviceShape(hit-e.xyy),
                                    deviceShape(hit+e.yxy)-deviceShape(hit-e.yxy),
                                    deviceShape(hit+e.yyx)-deviceShape(hit-e.yyx)));
            float shade = .37+.49*max(0.,dot(n,normalize(vec3(-.36,.55,.8))));
            float rim = pow(1.-clamp(dot(n,-ray),0.,1.),2.3);
            float reflection = pow(max(0.,dot(reflect(ray,n),normalize(vec3(-.4,.6,1.)))),8.);
            vec3 shell = vec3(.08,.59,.68)*shade + vec3(.31,.88,1.)*reflection*.68
                       + vec3(.38,1.,.83)*rim*.55 + color*.31;
            shell += vec3(.06,.21,.20)*(1.-smoothstep(-.3,.3,hit.y));
            if (n.z < .56) {
                float vent = step(.46,fract(hit.y*28.))*step(abs(hit.y),.34)*step(abs(hit.z),.095);
                return shell*(1.-.47*vent);
            }
            vec2 xy = hit.xy;
            vec2 screen = xy-vec2(0.,.176);
            float screenBorder = boxMask(screen,vec2(.419,.284),.105);
            float screenGlass = boxMask(screen,vec2(.374,.220),.071);
            shell = mix(shell,vec3(.025,.14,.19) + reflection*vec3(.27,.50,.53),screenBorder);
            shell = mix(shell,dialScreen(screen,t),screenGlass);
            shell += vec3(.62,.96,.95)*filament(softBox(screen,vec2(.410,.272),.103),.010)*.4;
            shell += screenGlass*vec3(.30,.65,.69)*pow(.5+.5*cos(screen.x*6.+screen.y*15.),9.)*.17;
            vec2 controls = xy-vec2(0.,-.334);
            float panel = boxMask(controls,vec2(.40,.131),.047);
            shell = mix(shell,vec3(.20,.48,.51)*shade+.12,panel*.87);
            float dial = length(controls-vec2(.248,.012));
            shell += vec3(.26,.62,.72)*filament(dial-.071,.012)*.75;
            shell = mix(shell, vec3(.035,.16,.23)+.24*reflection, 1.-smoothstep(.047,.058,dial));
            float keypad = step(.58,fract((controls.x+.33)*17.))*boxMask(controls-vec2(-.11,-.001),vec2(.20,.035),.013);
            shell += keypad*vec3(.065,.48,.57)*(.53+.47*sin(t*5.+controls.x*43.));
            float lampId = floor((controls.x+.34)*17.);
            float lamp = gridLine((controls.x+.34)*17.,.10)
                       * filament(controls.y+.053,.012)
                       * step(abs(controls.x+.12),.155);
            shell += lamp*vec3(.33,1.,.62)*(.25+.75*pow(.5+.5*sin(t*6.4-lampId*.8),3.));
            float power = length(xy-vec2(.285,-.514));
            shell += vec3(.49,1.,.57)*filament(power,.036)*(.74+.26*sin(t*3.2));
            float screws = length(abs(xy)-vec2(.418,.505));
            shell = mix(shell,vec3(.12,.27,.32),1.-smoothstep(.018,.029,screws));
            return shell;
        }
        distance += d*.86;
        if ((d > .45 && distance > 1.15) || distance > 2.25) break;
    }
    return color+vec3(.14,.68,.70)*filament(closest,.035)*.24;
}

vec2 jewelryView(vec2 p, float pitch, float yaw, float roll) {
    vec3 origin = turn3(vec3(p,0.),pitch,yaw,roll);
    vec3 direction = turn3(vec3(0.,0.,1.),pitch,yaw,roll);
    return (origin - direction*origin.z/direction.z).xy;
}

float crossLimb(vec2 p, float extent) {
    float tip = max(0.,p.y);
    float width = .098 + .038*smoothstep(.15,.33,tip) + .053*smoothstep(.34,.51,tip);
    float end = p.y - extent + .61*abs(p.x);
    return max(max(abs(p.x)-width,end),-.087-p.y);
}
float pendantShape(vec2 p) {
    return min(min(crossLimb(p,.64),crossLimb(-p,.78)),
               min(crossLimb(vec2(p.y,p.x),.56),crossLimb(vec2(p.y,-p.x),.56)));
}
float starShape5(vec2 p) {
    vec2 k1 = vec2(.809016994,-.587785252);
    vec2 k2 = vec2(-k1.x,k1.y);
    p.x = abs(p.x);
    p -= 2.*max(dot(k1,p),0.)*k1;
    p -= 2.*max(dot(k2,p),0.)*k2;
    p.x = abs(p.x);
    p.y -= 1.;
    vec2 edge = .42*vec2(-k1.y,k1.x)-vec2(0.,1.);
    float along = clamp(dot(p,edge)/dot(edge,edge),0.,1.);
    return length(p-edge*along)*sign(p.y*edge.x-p.x*edge.y);
}
float silverShape(vec2 p, bool pendant) {
    return pendant ? pendantShape(p) : starShape5(p);
}
vec3 beveledSilver(vec2 p, float t, bool pendant) {
    float d = silverShape(p,pendant);
    if (d > .018) return vec3(0.);
    vec2 eps = vec2(.0025,0.);
    vec2 flatNormal = vec2(silverShape(p+eps.xy,pendant)-silverShape(p-eps.xy,pendant),
                           silverShape(p+eps.yx,pendant)-silverShape(p-eps.yx,pendant));
    float bevel = 1.-smoothstep(-.053,-.009,d);
    vec3 normal = normalize(vec3(flatNormal*96.*(1.-bevel),.21+.86*bevel));
    vec3 reflected = reflect(vec3(0.,0.,-1.),normal);
    float sweep = reflected.y + .26*reflected.x + .52*p.y -.27*sin(t*1.45+p.x*1.62);
    float studio = .16+.91*smoothstep(-.38,.13,sweep)-.89*smoothstep(.28,.46,sweep);
    float polish = filament(sweep-.19,.046)*.45+filament(sweep+.37,.033)*.35;
    float rim = filament(d+.009,.010);
    float channel = filament(d+.046,.011);
    float innerLine = filament(d+.073,.009);
    float mask = 1.-smoothstep(-.008,.014,d);
    vec3 tint = pendant ? vec3(.78,.84,.98) : vec3(.94,.96,1.);
    vec3 metal = tint*(studio*.85+polish) * (1.-.94*channel);
    metal += vec3(.89,.95,1.)*(.81*rim+.75*innerLine);
    return metal*mask;
}

vec3 chromeCross(vec2 p, float t) {
    vec2 center = vec2(.07*sin(t*.62),-.021+.026*cos(t*.8));
    vec2 q = p-center;
    float pitch = .25*sin(t*.72), yaw = .64*sin(t*.78), roll = .18*sin(t*.58);
    vec2 charm = jewelryView(q,pitch,yaw,roll);
    vec3 color = vec3(.002,.002,.008)+vec3(.018,.012,.042)*exp(-length(q)*3.5);
    float d = pendantShape(charm);
    color += vec3(.31,.19,.91)*filament(d,.040)*.085;
    color += beveledSilver(charm,t,true);
    // An inset cross catches a dim lilac reflection within the wider silver bevel.
    float inset = pendantShape(charm*1.53);
    color += filament(inset,.015)*vec3(.42,.27,.82)*.25;
    float stud = length(charm);
    color += filament(stud-.054,.013)*vec3(.83,.88,1.)*.74;
    float flare = pow(.5+.5*sin(t*1.68),16.);
    color += crossFlare(charm-vec2(.017,.60),.12)*vec3(.67,.78,1.)*flare*.86;
    color += crossFlare(charm-vec2(.537,.014),.095)*vec3(.97,.74,1.)*(1.-flare)*.29;
    return color;
}

float heartDistance(vec2 p) {
    p.x = abs(p.x);
    if (p.x+p.y > 1.) return length(p-vec2(.25,.75))-.353553;
    vec2 a = p-vec2(0.,1.);
    vec2 b = p-.5*max(p.x+p.y,0.);
    return sqrt(min(dot(a,a),dot(b,b)))*sign(p.x-p.y);
}
vec3 candyHeart(vec2 p, float t) {
    vec2 field = rotate(.13*sin(t*.51)-.20)*p*1.56;
    field += vec2(.29*sin(field.y*2.41-t*1.42),.23*sin(field.x*1.46+t*1.24));
    field += vec2(-t*.103,.14*cos(t*.51));
    vec2 cell = floor(field+.5);
    float dist = 2., seed = 0.;
    for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++) {
        vec2 tag = cell+vec2(float(x),float(y));
        float key = hash(tag+vec2(.1,.3));
        vec2 shift = .20*vec2(sin(tag.y*8.3+1.),cos(tag.x*6.9+.5));
        vec2 q = field-tag-shift;
        q = rotate(1.15*(key-.5)+.28*sin(t*1.05+key*14.))*q;
        float beat = pow(.5+.5*cos(t*2.8-tag.x*.92-tag.y*.68),4.);
        float size = .53+.17*key+.13*beat;
        float shape = heartDistance(q/size+vec2(0.,.47))*size-.025;
        if (shape < dist) { dist = shape; seed = key; }
    }
    float wave = pow(.5+.5*cos(t*2.28-length(p)*4.7),3.);
    vec3 rose = mix(vec3(.98,.42,.62),vec3(1.,.65,.70),seed);
    float center = 1.-smoothstep(-.043,.028,dist);
    float plush = .49+.51*(1.-smoothstep(-.19,.001,dist));
    float halo = filament(dist,.051)*.30;
    float ribbon = smoothstep(.074,.119,dist)*(1.-smoothstep(.227,.263,dist));
    float filigree = filament(dist-.31,.020);
    vec3 color = vec3(.016,.005,.013);
    color += center*mix(rose,vec3(1.,.71,.75),.47)*(1.13+.75*plush+.19*wave);
    color += rose*(halo + ribbon*(.53+.61*wave) + .26*filigree);
    color += vec3(1.,.65,.72)*filament(dist-.14,.033)*wave*.30;
    return color;
}

vec3 orbitStar(vec3 base, vec2 q, float size, vec3 pose, float t) {
    vec2 star = jewelryView(q/size,pose.x,pose.y,pose.z);
    float outline = starShape5(star);
    float shade = 1.-smoothstep(-.013,.025,outline);
    vec3 metal = beveledSilver(star,t,false);
    base = mix(base,metal,shade);
    base += filament(outline-.055,.020)*vec3(.63,.69,.82)*.13;
    float pulse = pow(.5+.5*cos(t*1.97),15.);
    base += pulse*crossFlare(star-vec2(.003,.965),.21)*vec3(.89,.95,1.)*.85;
    return base;
}
vec3 silverFormation(vec2 p, float t) {
    vec2 q = rotate(.12*sin(t*.7)-.25)*p;
    float part = smoothstep(.19,.80,.5+.5*sin(t*.81));
    vec2 c1 = vec2(-.078-.16*part,.181+.11*part);
    vec2 c2 = vec2(.30+.24*part,-.14-.07*part);
    vec2 c3 = vec2(-.235-.14*part,-.32-.21*part);
    vec2 glide = vec2(.07*sin(t*.88),.033*cos(t*.59));
    vec3 color = vec3(.002,.002,.004)+vec3(.010,.013,.024)*exp(-length(q)*3.5);
    color = orbitStar(color,q-c2+glide,.42,vec3(-.31,.5*sin(t*.75),-.31+.49*sin(t*.76)),t+1.7);
    color = orbitStar(color,q-c3-glide,.34,vec3(.28,.45*sin(t*.67+.5),.22+.53*sin(t*.81)),t+3.4);
    color = orbitStar(color,q-c1,.57,vec3(.30*cos(t*.61),.56*sin(t*.67),-.23+.41*sin(t*.78)),t);
    return color;
}
vec3 starStack(vec2 p, float t) {
    float phase = mod(t+.52,3.58);
    float glitch = smoothstep(.10,.18,phase)*(1.-smoothstep(.47,.72,phase));
    if (glitch < .001) return silverFormation(p,t);

    // Frozen video frames, horizontal tracking errors, and brief chromatic separation.
    float frame = floor(t*17.);
    float row = floor((p.y+.12*sin(t*12.))*42.);
    float seed = hash(vec2(row,frame));
    float displaced = step(.47,seed)*(seed-.44);
    p.x += glitch*(displaced-.12)*.22;
    float line = floor((p.y-.11*cos(t*13.))*12.);
    p.x += glitch*(hash(vec2(line,frame))-.5)*.14;
    float split = glitch*(.033+.073*displaced);
    float held = mix(t,floor(t*11.)/11.,glitch);
    vec3 center = silverFormation(p,held);
    vec3 left = silverFormation(p-vec2(split,0),held);
    vec3 right = silverFormation(p+vec2(split,0),held);
    vec3 torn = vec3(left.r,center.g*.75+right.g*.25,right.b);
    float tracking = 1.-glitch*.33*step(.52,fract(p.y*114.+frame*.19));
    vec3 color = mix(center,torn,glitch)*tracking;
    float pix = step(.91,hash(vec2(floor(p.x*117.),row+frame)));
    color += vec3(.22,.072,.27)*pix*glitch*step(.68,seed)*exp(-length(p)*2.2);
    return color;
}
`;

function drawY2kFallback(pen, design, t, width, height) {
    const palettes = [['#28143d','#fa83c0','#cfeaff'], ['#072638','#17adbf','#9cfaec'], ['#05040c','#232039','#dfe7ff']];
    const [dark,mid,light] = palettes[design];
    const sky = pen.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,dark);
    sky.addColorStop(.55,mid);
    sky.addColorStop(1,dark);
    pen.fillStyle = sky;
    pen.fillRect(0,0,width,height);
    pen.save();
    pen.translate(width/2,height/2);
    pen.scale(height*.72,height*.5);
    pen.lineWidth = .025;
    pen.strokeStyle = light;
    if (design === 0) {
        pen.rotate(-t*.52);
        pen.fillStyle = light;
        pen.beginPath();
        for(let i=0; i<128; i++) {
            const a=i*Math.PI/64;
            const r=.35+.36*(.5+.5*Math.cos(a*4))**3.4;
            pen.lineTo(Math.cos(a)*r,Math.sin(a)*r);
        }
        pen.closePath();
        pen.fill();
        pen.rotate(t*.32);
        pen.beginPath();
        pen.ellipse(0,0,1.12,.31,.35,0,Math.PI*2);
        pen.stroke();
    } else if (design === 1) {
        pen.rotate(.14*Math.cos(t*.8));
        pen.fillStyle = light;
        pen.beginPath();
        pen.roundRect(-.48,-.61,.96,1.22,.12);
        pen.fill();
        pen.fillStyle = dark;
        pen.fillRect(-.38,-.44,.76,.52);
        pen.beginPath();
        for(let x=-.37; x<.37; x+=.01) {
            pen.lineTo(x,-.18+.12*Math.sin(x*25+t*5)*Math.cos(x*8-t*3));
        }
        pen.stroke();
        for(let i=0; i<8; i++) {
            pen.fillStyle = Math.sin(t*5+i)>0 ? mid : dark;
            pen.fillRect(-.31+i*.05,.24,.025,.075);
        }
    } else {
        pen.rotate(.23*Math.sin(t*.62));
        pen.fillStyle = light;
        for (const angle of [0, Math.PI/2, Math.PI, Math.PI*1.5]) {
            pen.save();
            pen.rotate(angle);
            const tip = angle === Math.PI ? -.76 : -.53;
            pen.beginPath();
            pen.moveTo(-.11,.13);
            pen.lineTo(-.11,-.28);
            pen.lineTo(-.20,tip+.12);
            pen.lineTo(0,tip);
            pen.lineTo(.20,tip+.12);
            pen.lineTo(.11,-.28);
            pen.lineTo(.11,.13);
            pen.closePath();
            pen.fill();
            pen.restore();
        }
    }
    pen.restore();
}

function drawY2kExtraFallback(pen, design, t, width, height) {
    pen.fillStyle = design === 0 ? '#170910' : '#030305';
    pen.fillRect(0,0,width,height);
    pen.save();
    pen.translate(width/2,height/2);
    pen.scale(height*.71,height*.5);
    if (design === 0) {
        const limit = Math.ceil(width/height);
        for (let row=-2;row<=2;row++) for (let col=-limit;col<=limit;col++) {
            const pulse=.5+.5*Math.sin(t*2.6-col*.65-row*.66);
            pen.save();
            pen.translate(col*.53+(row%2)*.20+.09*Math.sin(t+row),row*.53+.09*Math.sin(t+col));
            pen.rotate(.31*Math.sin(t*.81+row+col));
            pen.scale(.28+.05*pulse,.29+.07*pulse);
            pen.beginPath();
            pen.moveTo(0,.79);
            pen.bezierCurveTo(-.23,.58,-1.19,-.07,-.89,-.58);
            pen.bezierCurveTo(-.61,-1.06,-.19,-.90,0,-.55);
            pen.bezierCurveTo(.19,-.90,.61,-1.06,.89,-.58);
            pen.bezierCurveTo(1.19,-.07,.23,.58,0,.79);
            pen.fillStyle = pulse>.53 ? '#ffc4cc' : '#ed83a5';
            pen.strokeStyle = '#793e58';
            pen.lineWidth = .16;
            pen.stroke();
            pen.fill();
            pen.restore();
        }
    } else {
        for (let i=0;i<3;i++) {
            const r = [.52,.37,.30][i];
            pen.save();
            const spread=.12*Math.sin(t*.81);
            pen.translate([-.10,.43+spread,-.31-spread][i],[.19,-.12,-.40][i]);
            pen.rotate(.31*Math.sin(t*.84+i)+i*.46);
            const chrome = pen.createLinearGradient(0,-r,0,r);
            chrome.addColorStop(0,'#ecf4ff');
            chrome.addColorStop(.42,'#949ba7');
            chrome.addColorStop(.56,'#1b2028');
            chrome.addColorStop(1,'#eaf1fb');
            pen.fillStyle=chrome;
            pen.strokeStyle='#dbe7f8';
            pen.lineWidth=.028;
            pen.beginPath();
            for (let j=0;j<10;j++) {
                const a=j*Math.PI/5-Math.PI/2;
                const d=r*(j%2?.41:1.);
                pen.lineTo(Math.cos(a)*d,Math.sin(a)*d);
            }
            pen.closePath();
            pen.fill();
            pen.stroke();
            pen.restore();
        }
    }
    pen.restore();
    if (design === 1 && (t+.52)%3.58 > .15 && (t+.52)%3.58 < .67) {
        const frame = Math.floor(t*17);
        for (let i=0;i<7;i++) {
            const y = Math.floor((.24+i*.084)*height);
            const shift = Math.round(Math.sin(frame*1.76+i*41.)*width*.035);
            pen.drawImage(pen.canvas,0,y,width,2,shift,y,width,2);
        }
    }
}
