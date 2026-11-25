const {app,BrowserWindow,ipcMain,screen,protocol,net}=require('electron');
const path=require('path');
const {pathToFileURL}=require('url');
const {execFile}=require('child_process');let main,wallpaper;
const appUrl = 'winter://wallpaper/index.html';
const publicFiles = new Set([
    '/index.html', '/style.css', '/app.js', '/motion.js', '/abstract.js',
    '/assets/forest.webp', '/assets/cabin.webp', '/assets/aurora.webp'
]);
protocol.registerSchemesAsPrivileged([
    {scheme: 'winter', privileges: {standard: true, secure: true, supportFetchAPI: true}}
]);

function serveArtwork(request) {
    const url = new URL(request.url);
    if (url.hostname !== 'wallpaper' || !publicFiles.has(url.pathname)) {
        return new Response('Not found', {status: 404});
    }
    return net.fetch(pathToFileURL(path.join(__dirname, url.pathname.slice(1))).href);
}

function open(){main=new BrowserWindow({width:1440,height:950,minWidth:800,minHeight:650,backgroundColor:'#101411',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true}});main.loadURL(appUrl)}
app.whenReady().then(() => { protocol.handle('winter', serveArtwork); open(); });app.on('window-all-closed',()=>app.quit());
ipcMain.handle('apply-wallpaper',async(_,scene)=>{if(process.platform!=='win32')return 'Live desktop wallpaper is available on Windows.';if(wallpaper){wallpaper.destroy();wallpaper=null}let bounds=screen.getPrimaryDisplay().bounds;wallpaper=new BrowserWindow({x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,frame:false,show:false,skipTaskbar:true,focusable:false,webPreferences:{backgroundThrottling:false}});await wallpaper.loadURL(appUrl + '?' + new URLSearchParams({wallpaper:'1',scene:String(scene)}));wallpaper.showInactive();const handle=wallpaper.getNativeWindowHandle().readBigUInt64LE().toString();return new Promise(resolve=>{execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname.replace('app.asar','app.asar.unpacked'),'wallpaper.ps1'),handle],{windowsHide:true},err=>{if(err){wallpaper.destroy();wallpaper=null;resolve('Could not attach wallpaper to the desktop.')}else resolve('Wallpaper is live! Keep AnimatedASCII open to keep it running.')})})});
