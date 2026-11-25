const asciiColors = Array.from({length:4096},(_,rgb) => '#' + rgb.toString(16).padStart(3,'0'));
const photographicInk = Array.from({length:256},(_,value) => 255*Math.pow(value/255,.74)*1.7);

function inkColor(r,g,b) {
    return (Math.min(15,Math.round(r/17)) << 8)
         | (Math.min(15,Math.round(g/17)) << 4)
         | Math.min(15,Math.round(b/17));
}

function gradeAscii(pixels,bottomUp,frame,cells) {
    const {scene,columns,rows} = frame;
    const photographic = scene < 3;
    for (let y=0;y<rows;y++) {
        const sourceRow = bottomUp ? rows-1-y : y;
        for (let x=0;x<columns;x++) {
            const index = y*columns+x;
            const channel = (sourceRow*columns+x)*4;
            let r = pixels[channel], g = pixels[channel+1], b = pixels[channel+2];
            if (scene === 11) r = g = b = .2126*r+.7152*g+.0722*b;
            const peak = Math.max(r,g,b);
            const light = photographic ? (.25*r+.64*g+.11*b) : peak;
            const base = Math.max(0,(light-(photographic ? 5 : 9))/255);
            const weight = Math.pow(base,photographic ? .69 : .78);
            // Fixed spatial dither adds detail without flickering as the scene repeats.
            const stipple = ((Math.imul(x,137) ^ Math.imul(y,89)) & 15)/16;
            const glyph = Math.min(glyphRamp.length-1,Math.floor(weight*glyphRamp.length+stipple*.55));
            if (!glyph) {
                cells[index] = 0;
                continue;
            }
            if (photographic) {
                r = photographicInk[r]; g = photographicInk[g]; b = photographicInk[b];
                const scale = Math.max(255,r,g,b)/255;
                r /= scale; g /= scale; b /= scale;
            } else {
                const gain = 1.2+1.2*(1-peak/255);
                r *= gain; g *= gain; b *= gain;
            }
            cells[index] = (glyph << 12) | inkColor(r,g,b);
        }
    }
}

function makeAsciiText(surface) {
    const metrics = document.createElement('canvas').getContext('2d');
    metrics.font = '100px ' + getComputedStyle(surface).fontFamily;
    const characterWidth = metrics.measureText('M').width/100;
    let lines = [], stops = [], lastWidth, lastHeight, lastColumns, lastRows;

    return (cells,columns,rows,width,height) => {
        if (lastColumns !== columns || lastRows !== rows) {
            const fragment = document.createDocumentFragment();
            lines = Array.from({length:rows},(_,row) => {
                const node = document.createElement('span');
                node.className = 'ascii-row';
                fragment.append(node);
                return {node,text:'',ink:''};
            });
            surface.replaceChildren(fragment);
            stops = Array.from({length:columns+1},(_,col) => (100*col/columns).toFixed(3)+'%');
        }
        if (lastWidth !== width || lastHeight !== height || lastColumns !== columns || lastRows !== rows) {
            const heightPerRow = height/rows;
            const fontSize = Math.min(heightPerRow*.94,width/columns/characterWidth);
            surface.style.fontSize = fontSize + 'px';
            surface.style.lineHeight = heightPerRow + 'px';
            surface.style.setProperty('--row-height',heightPerRow + 'px');
            surface.style.letterSpacing = (width/columns-fontSize*characterWidth) + 'px';
            lastWidth = width; lastHeight = height; lastColumns = columns; lastRows = rows;
        }
        for (let row=0;row<rows;row++) {
            const line = lines[row];
            const offset = row*columns;
            let text = '', ink = '', start = 0;
            let color = cells[offset] & 4095;
            for (let col=0;col<columns;col++) {
                const code = cells[offset+col];
                const glyph = code >> 12;
                const next = glyph ? code & 4095 : color;
                if (next !== color) {
                    ink += asciiColors[color]+' '+stops[start]+' '+stops[col]+',';
                    color = next;
                    start = col;
                }
                text += glyphRamp[glyph];
            }
            if (row < rows-1) text += '\n';
            if (line.text !== text) {
                line.node.textContent = text;
                line.text = text;
            }
            if (start === 0) ink = 'linear-gradient('+asciiColors[color]+','+asciiColors[color]+')';
            else ink = 'linear-gradient(90deg,'+ink+asciiColors[color]+' '+stops[start]+' 100%)';
            if (line.ink !== ink) {
                // A row's paint is clipped to its text. Pixels between letters remain black.
                line.node.style.backgroundImage = ink;
                line.ink = ink;
            }
        }
    };
}

function makeTextWeather() {
    const snow = makeSnow(378);
    const sparks = makeSnow(48);
    return (cells, {scene,time,period,columns,rows,viewX,viewY,driftX,driftY}) => {
        function add(x,y,glyph,r,g,b,alpha) {
            const cx = x*columns-.5, cy = y*rows-.5;
            const left = Math.floor(cx), top = Math.floor(cy);
            for (let row=top;row<=top+1;row++) for (let col=left;col<=left+1;col++) {
                if (row<0 || row>=rows || col<0 || col>=columns) continue;
                const weight = alpha*(1-Math.abs(row-cy))*(1-Math.abs(col-cx));
                if (weight < .05) continue;
                const index = row*columns+col;
                const code = cells[index];
                const oldR = ((code >> 8)&15)*17;
                const oldG = ((code >> 4)&15)*17;
                const oldB = (code&15)*17;
                const ink = inkColor(oldR+(r-oldR)*weight, oldG+(g-oldG)*weight, oldB+(b-oldB)*weight);
                if (ink) cells[index] = (Math.max(code >> 12,weight>.15 ? glyph : 1)<<12) | ink;
            }
        }
        const count = scene === 2 ? 302 : snow.length;
        for (let i=0;i<count;i++) {
            const {x,y,speed,size,phase,depth} = snow[scene === 2 && i>=254 ? i+76 : i];
            const fall = [.028,.075,.149][depth]*(.64+.80*speed);
            const bend = Math.sin(loopAngle(time,.69+speed,period)+phase)*(.012+depth*.008);
            const px = fract(x+loopTurns(time,fall*.42,period)+bend+1.01)*1.06-.03;
            const py = fract(y+loopTurns(time,fall,period))*1.12-.06;
            const opacity = [.57,.70,.62][depth]*(.61+size*.39)*(scene === 2 ? .78 : 1);
            add(px,py,depth === 2 ? 6 : 1,198,222,255,opacity);
        }
        const projectX = u => (u-.5-driftX)/(viewX*.965)+.5;
        const projectY = v => (v-.5-driftY)/(viewY*.965)+.5;
        if (scene === 0) {
            for (const {x,y,speed,size,phase} of sparks) {
                const age = fract(loopTurns(time,.21+speed*.27,period)+y);
                const u = .554+(x-.5)*.079+age*(.045+speed*.10)+Math.sin(age*10+phase)*age*.026;
                const v = .755-age*(.16+size*.15);
                const opacity = Math.sin(Math.PI*age)**.56*(1-age)*(.61+speed*.49);
                add(projectX(u),projectY(v),size>.55 ? 6 : 2,255,105+size*103,31,opacity);
            }
        } else if (scene === 2) {
            const flight = (time+period-5)%period;
            for (let i=0;i<16;i++) {
                const age = flight-i*.025;
                if (age<0 || age>1.14) continue;
                const opacity = Math.sin(Math.PI*age/1.14)*(.94-i*.048);
                add(projectX(.79-.20*age),projectY(.095+.14*age),i<4 ? 6 : 1,237,245,255,opacity);
            }
        }
    };
}
