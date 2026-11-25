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

float roadCurve(float z, float t) {
    return .54*sin(z*.49+t*.92)+.31*cos(z*.31-t*.67);
}
vec3 highway(vec2 p, float t) {
    float horizon = .095;
    float curve = .21*sin(t*.83)+.06*cos(t*1.44);
    vec2 sky = p-vec2(curve*.26,horizon);
    float height = smoothstep(0.,.95,sky.y);
    vec3 color = gradient(height,vec3(.97,.31,.16),vec3(.39,.069,.36),vec3(.025,.017,.13));
    color += vec3(.22,.15,.28)*filament(sky.y,.23);
    vec2 sun = sky-vec2(-.32,.28);
    float solar = length(sun);
    float segments = smoothstep(.11,.23,fract((sun.y+.26)*22.));
    color += vec3(1.,.43,.11)*filament(solar-.26,.087)*.39;
    color = mix(color,mix(vec3(1.2,.28,.22),vec3(1.2,.89,.35),smoothstep(-.28,.22,sun.y)),
                (1.-smoothstep(.253,.268,solar))*mix(segments,1.,.43));
    float stars = pow(hash(floor(p*84.)),72.);
    color += .29*vec3(.52,.69,1.)*stars*smoothstep(.30,.82,p.y);
    for(int i=0;i<2;i++) {
        float layer = float(i);
        float x = (p.x + layer*.043+curve*.12)*(15.-layer*6.);
        float cell = floor(x);
        float h = (.033+.13*pow(hash(vec2(cell,layer+2.)),2.))*(1.+layer*.48);
        float building = step(sky.y,h)*step(abs(fract(x)-.5),.38)*
                         smoothstep(.38,.68,abs(p.x-curve));
        vec3 facade = mix(vec3(.18,.057,.22),vec3(.045,.026,.15),layer);
        float windows = step(.53,fract(x*5.3))*step(.62,fract(sky.y*43.))*step(.58,hash(floor(vec2(x*5.,sky.y*43.))));
        color = mix(color,facade + windows*vec3(.75,.27,.23)*.40,building);
    }

    if (sky.y < 0.) {
        float depth = 1.08/max(.024,-sky.y);
        float scroll = depth+t*5.65;
        float bend = roadCurve(depth,t)-roadCurve(9.,t)*.64;
        float x = (p.x-curve)*depth-bend;
        float side = abs(x);
        float fog = exp(-depth*.075);
        float asphalt = 1.-smoothstep(1.72,1.82,side);
        float scan = gridLine(scroll*.91,.046);
        float stripes = step(.63,fract(scroll*.37));
        float edges = filament(side-1.67,.055) + filament(side-1.83,.049)*.42;
        vec3 floorColor = mix(vec3(.016,.053,.116),vec3(.069,.035,.11),asphalt);
        floorColor += vec3(.040,.24,.32)*max(scan,gridLine(x*.65,.045))*(1.-asphalt)*fog;
        floorColor += vec3(.66,.05,.44)*scan*asphalt*fog*.45;
        floorColor += vec3(.17,1.,1.)*edges*fog*1.12;
        floorColor += vec3(1.,.50,.14)*filament(side-.52,.055)*stripes*fog*.80;
        float curb = step(1.75,side)*step(side,2.04)*stripes;
        floorColor += curb*vec3(.87,.13,.20)*.71*fog;
        color = mix(vec3(.31,.075,.20),floorColor,smoothstep(0.,.24,-sky.y));
        float roadside = filament(side-2.7,.14)*pow(.5+.5*sin(scroll*4.7),7.);
        color += roadside*fog*vec3(.09,.66,1.)*.85;
    }

    // Project the gates from world depth. Their height and width expand together as they approach.
    for(int gate=0;gate<4;gate++) {
        float phase = fract(float(gate)*.25-t*.105);
        float depth = 1.02+phase*20.;
        float scale = 1./depth;
        float center = curve+(roadCurve(depth,t)-roadCurve(9.,t)*.64)*scale;
        vec2 local = vec2(p.x-center,p.y-horizon+1.06*scale)/scale;
        float arch = filament(softBox(local-vec2(0.,1.28),vec2(1.90,1.28),.53),.034);
        float pulse = pow(.5+.5*cos(local.x*9.+local.y*6.-t*7.),5.);
        float visible = smoothstep(-.01,.055,local.y)*exp(-depth*.115);
        color += mix(vec3(.20,.43,1.),vec3(.63,1.,.67),pulse)*arch*visible*.96;
    }

    // Rear quarter panels and light bars of the car stay in the foreground, over the moving roadway.
    vec2 car = rotate(.08*sin(t*1.1))*(p-vec2(curve*.88,-.708+.029*sin(t*2.1)));
    float width = .335-.113*smoothstep(.005,.23,car.y);
    float body = boxMask(car-vec2(0.,.027),vec2(width,.163),.056);
    float roof = boxMask(car-vec2(0.,.158),vec2(.203,.097),.065);
    float glass = boxMask(car-vec2(0.,.17),vec2(.177,.067),.043);
    float spoiler = boxMask(car-vec2(0.,.081),vec2(.337,.026),.013);
    float wheels = boxMask(vec2(abs(car.x)-.222,car.y+.105),vec2(.088,.065),.029);
    float shine = filament(car.y-.063-.35*car.x*car.x,.029);
    float boost = pow(.5+.5*cos(t*1.32-.4),6.);
    float exhaust = filament(abs(car.x)-.174,.040) *
                    smoothstep(-.24,-.13,car.y)*(1.-smoothstep(-.13,-.082,car.y));
    color += exhaust*boost*vec3(.13,.60,1.0)*.98;
    vec3 metal = mix(vec3(.052,.034,.155),vec3(.28,.49,.75),shine);
    metal += vec3(.23,.08,.25)*smoothstep(-.125,.16,car.y);
    metal += vec3(.32,.38,.55)*filament(abs(car.x)-width+.035,.017)*.56;
    metal *= 1.-.53*filament(car.y+.059,.017);
    color = mix(color,vec3(.024,.021,.11),wheels);
    color = mix(color,metal,max(body,roof));
    color = mix(color,vec3(.022,.049,.123)+vec3(.38,.28,.5)*filament(car.y-.215,.032)*.57,glass);
    color = mix(color,vec3(.117,.077,.208)+vec3(.69,.47,.62)*filament(car.y-.104,.016)*.66,spoiler);
    float tail = boxMask(vec2(abs(car.x)-.197,car.y+.015),vec2(.097,.022),.012);
    float pulse = .65+.35*pow(.5+.5*sin(t*5.1),3.);
    color += tail*vec3(1.3,.11,.32)*pulse;
    color += vec3(.52,.06,.44)*filament(length(vec2((abs(car.x)-.197)*.61,car.y+.092)),.066)*.81;
    float plate = boxMask(car+vec2(0.,.069),vec2(.062,.025),.009);
    color += plate*vec3(.11,.69,1.)*.85;
    return color;
}
`;

function drawY2kFallback(pen, design, t, width, height) {
    const palettes = [['#28143d','#fa83c0','#cfeaff'], ['#072638','#17adbf','#9cfaec'], ['#290c45','#fa8570','#70eeff']];
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
        pen.fillStyle = '#ffcb69';
        pen.beginPath();
        pen.arc(-.3,-.34,.25,0,Math.PI*2);
        pen.fill();
        pen.fillStyle = dark;
        pen.beginPath();
        pen.moveTo(-.12,-.11);
        pen.lineTo(-1.4,1);
        pen.lineTo(1.4,1);
        pen.lineTo(.12,-.11);
        pen.fill();
        for(let i=0; i<9; i++) {
            const z=((i/9+t*.78)%1)**3;
            pen.beginPath();
            pen.moveTo(-z*1.30,-.1+z*1.16);
            pen.lineTo(z*1.30,-.1+z*1.16);
            pen.stroke();
        }
        pen.fillStyle = mid;
        pen.fillRect(-.29,.61,.58,.12);
        pen.fillStyle = light;
        pen.fillRect(-.22,.63,.13,.026);
        pen.fillRect(.09,.63,.13,.026);
    }
    pen.restore();
}
