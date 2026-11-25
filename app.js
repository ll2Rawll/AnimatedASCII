const scenes = [
    {
        name: 'Fireside Forest', image: 'forest.webp', icon: '✳',
        desc: 'A campfire beneath the winter moon',
        kicker: 'A MOMENT IN THE WOODS', subtitle: 'Snow falls over a moonlit clearing.'
    },
    {
        name: 'Christmas Eve', image: 'cabin.webp', icon: '⌂',
        desc: 'A cabin beside a flowing creek',
        kicker: 'SOMEWHERE IN THE SNOW', subtitle: 'The cabin lights spill across the water.'
    },
    {
        name: 'Northern Lights', image: 'aurora.webp', icon: '✧',
        desc: 'A Christmas tree by an Arctic lake',
        kicker: 'A SKY FULL OF WONDER', subtitle: 'The aurora drifts across a still winter sky.'
    },
    {
        name: 'Event Horizon', icon: '◉',
        desc: 'An accretion disk of gold, pink, and ultraviolet',
        kicker: 'NEON ABSTRACT', subtitle: 'Rings of light bend around a dark center.'
    },
    {
        name: 'Prism Engine', icon: '◇',
        desc: 'Interlocking rings in cyan, violet, and lime',
        kicker: 'NEON ABSTRACT', subtitle: 'Energy races around a rotating crystal core.'
    },
    {
        name: 'Liquid Signal', icon: '≈',
        desc: 'Iridescent ribbons in teal and hot pink',
        kicker: 'NEON ABSTRACT', subtitle: 'Waves fold into one another and split into threads.'
    },
    {
        name: 'Chrome Bloom', icon: '✦',
        desc: 'Liquid silver and candy pink',
        kicker: 'Y2K', subtitle: 'A chrome star turns through an orbit of pearls.'
    },
    {
        name: 'Dial-Up Dream', icon: '◍',
        desc: 'A translucent aqua terminal',
        kicker: 'Y2K', subtitle: 'A live waveform flickers inside a floating gadget.'
    },
    {
        name: 'Hyperlink Highway', icon: '»',
        desc: 'An arcade racer at sunset',
        kicker: 'Y2K', subtitle: 'Chase the horizon past a rush of neon gates.'
    },
    {
        name: 'Kaleido Drive', icon: '⬡',
        desc: 'A twisting tunnel of colored facets',
        kicker: 'KINETIC', subtitle: 'Light overtakes you as the tunnel twists.'
    },
    {
        name: 'Bloom Breaker', icon: '✺',
        desc: 'A flower made from thousands of particles',
        kicker: 'KINETIC', subtitle: 'The bloom bursts into dust, braids, and rebuilds.'
    },
    {
        name: 'Ink Fold', icon: '◐',
        desc: 'A folding black-and-white ribbon',
        kicker: 'KINETIC', subtitle: 'A twisting strip of paper carries waves of ink.'
    }
];

const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const startScene = Number(params.get('scene'));
let selected = Number.isInteger(startScene) && scenes[startScene] ? startScene : 0;
let paused = false;
let lastTime = null;
let sceneTime = 0;
let dirty = true;
let canvas = $('#scene');
let render;
try {
    render = makeMotion(canvas);
} catch (error) {
    console.warn('Using the canvas renderer', error);
    const fallback = canvas.cloneNode();
    canvas.replaceWith(fallback);
    canvas = fallback;
    render = makeMotion(canvas, false);
}

if (params.has('wallpaper')) document.body.classList.add('wallpaper');

const images = scenes.map(({image, name}) => {
    if (!image) return null;
    const plate = new Image();
    plate.onload = () => { dirty = true; };
    plate.onerror = () => { $('#message').textContent = 'Could not load ' + name + '.'; };
    plate.src = 'assets/' + image;
    return plate;
});
const formatNumber = n => String(n).padStart(2,'0');
const collections = ['Christmas', 'Neon abstract', 'Y2K', 'Kinetic'];
const sceneLists = collections.map(label => {
    const group = document.createElement('div');
    group.className = 'scene-group';
    group.setAttribute('role','group');
    group.setAttribute('aria-label',label);
    const heading = document.createElement('div');
    heading.className = 'group-label';
    heading.textContent = label;
    group.append(heading);
    $('#scenes').append(group);
    return group;
});
const sceneButtons = scenes.map(({name}, index) => {
    const button = document.createElement('button');
    button.className = 'scene-btn';
    button.innerHTML = '<span class="num">' + formatNumber(index + 1) + '</span>' +
        '<span class="name"></span><span class="arrow" aria-hidden="true"></span>';
    button.querySelector('.name').textContent = name;
    button.onclick = () => selectScene(index);
    sceneLists[Math.floor(index/3)].append(button);
    return button;
});

function selectScene(index) {
    selected = index;
    sceneTime = 0;
    dirty = true;
    const scene = scenes[index];
    sceneButtons.forEach((button, i) => {
        button.classList.toggle('active', i === index);
        button.setAttribute('aria-pressed', String(i === index));
        button.querySelector('.arrow').textContent = i === index ? '↗' : '';
    });
    const abstract = !scene.image;
    document.body.classList.toggle('neon',abstract);
    document.body.classList.toggle('y2k', index >= 6 && index < 9);
    document.body.classList.toggle('kinetic', index >= 9);
    document.body.classList.toggle('monochrome', index === 11);
    $('#collection').textContent = collections[Math.floor(index/3)].toUpperCase();
    $('#preview-count').textContent = 'SCENE ' + formatNumber(index + 1) + ' / ' + formatNumber(scenes.length);
    $('#art-num').textContent = 'NO. ' + formatNumber(index + 1);
    $('#art-title').textContent = $('#footer-title').textContent = scene.name;
    $('#art-kicker').textContent = scene.kicker;
    $('#art-subtitle').textContent = scene.subtitle;
    $('#footer-desc').textContent = scene.desc;
    $('#scene-icon').textContent = scene.icon;
}
selectScene(selected);

$('#pause').onclick = () => {
    paused = !paused;
    $('#pause').textContent = paused ? '▶  Play' : 'Ⅱ  Pause';
};
$('#fullscreen').onclick = async () => {
    try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await $('.art').requestFullscreen();
    } catch (error) {
        $('#message').textContent = 'Full screen is unavailable.';
    }
};
$('#apply').onclick = async () => {
    $('#message').textContent = window.winter
        ? await window.winter.apply(selected)
        : 'Open AnimatedASCII on Windows to set a live wallpaper.';
};

function tick(timestamp) {
    const image = images[selected];
    if ((!image || (image.complete && image.naturalWidth)) && (!paused || dirty)) {
        if (!paused && lastTime !== null) sceneTime += Math.min(.05, (timestamp - lastTime) / 1000);
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(devicePixelRatio || 1, 2, 2560 / rect.width, 1440 / rect.height);
        const width = Math.max(1, Math.round(rect.width * scale));
        const height = Math.max(1, Math.round(rect.height * scale));
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        render(image, selected, sceneTime);
        dirty = false;
    }
    lastTime = timestamp;
    requestAnimationFrame(tick);
}
new ResizeObserver(() => { dirty = true; }).observe(canvas);
requestAnimationFrame(tick);
