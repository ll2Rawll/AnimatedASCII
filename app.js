const scenes = [
    {
        name: 'Fireside Forest', image: 'forest.webp', icon: '✳',
        desc: 'A campfire beneath the winter moon'
    },
    {
        name: 'Christmas Eve', image: 'cabin.webp', icon: '⌂',
        desc: 'A cabin beside a flowing creek'
    },
    {
        name: 'Northern Lights', image: 'aurora.webp', icon: '✧',
        desc: 'A Christmas tree by an Arctic lake'
    },
    {
        name: 'Event Horizon', icon: '◉',
        desc: 'An accretion disk of gold, pink, and ultraviolet'
    },
    {
        name: 'Prism Engine', icon: '◇',
        desc: 'Interlocking rings in cyan, violet, and lime'
    },
    {
        name: 'Liquid Signal', icon: '≈',
        desc: 'Iridescent ribbons in teal and hot pink'
    },
    {
        name: 'Chrome Bloom', icon: '✦',
        desc: 'Liquid silver and candy pink'
    },
    {
        name: 'Dial-Up Dream', icon: '◍',
        desc: 'A translucent aqua terminal'
    },
    {
        name: 'Chrome Cross', icon: '✦',
        desc: 'A polished cross with lilac reflections'
    },
    {
        name: 'Kaleido Drive', icon: '⬡',
        desc: 'A twisting tunnel of colored facets'
    },
    {
        name: 'Bloom Breaker', icon: '✺',
        desc: 'A flower made from thousands of particles'
    },
    {
        name: 'Ink Fold', icon: '◐',
        desc: 'A folding black-and-white ribbon'
    },
    {
        name: 'Heart Circuit', icon: '♥',
        desc: 'Glowing pink hearts in a liquid pattern'
    },
    {
        name: 'Silver Stars', icon: '☆',
        desc: 'A cluster of beveled chrome stars'
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
const surface = $('#scene');
let render;
try {
    render = makeMotion(surface);
} catch (error) {
    console.warn('Using the CPU sampler', error);
    render = makeMotion(surface, false);
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
const collectionIndex = index => index >= 12 ? 2 : Math.floor(index/3);
const galleryOrder = scenes.map((_, index) => index)
    .sort((a, b) => collectionIndex(a) - collectionIndex(b));
const sceneNumber = index => formatNumber(galleryOrder.indexOf(index) + 1);
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
    button.innerHTML = '<span class="num">' + sceneNumber(index) + '</span>' +
        '<span class="name"></span><span class="arrow" aria-hidden="true"></span>';
    button.querySelector('.name').textContent = name;
    button.onclick = () => selectScene(index);
    sceneLists[collectionIndex(index)].append(button);
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
    document.body.classList.toggle('y2k', collectionIndex(index) === 2);
    document.body.classList.toggle('kinetic', collectionIndex(index) === 3);
    document.body.classList.toggle('monochrome', index === 11);
    $('#collection').textContent = collections[collectionIndex(index)].toUpperCase();
    $('#preview-count').textContent = 'SCENE ' + sceneNumber(index) + ' / ' + formatNumber(scenes.length);
    $('#footer-title').textContent = scene.name;
    surface.setAttribute('aria-label', scene.name + ' animated ASCII wallpaper');
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
        const {width,height} = surface.getBoundingClientRect();
        render(image,selected,sceneTime,width,height);
        dirty = false;
    }
    if (!paused && lastTime !== null) {
        const delta = Math.min(.05,(timestamp-lastTime)/1000);
        sceneTime = (sceneTime+delta)%sceneLoopSeconds[selected];
    }
    lastTime = timestamp;
    requestAnimationFrame(tick);
}
new ResizeObserver(() => { dirty = true; }).observe(surface);
requestAnimationFrame(tick);
