import {spawn} from 'node:child_process';
const backend=spawn(process.execPath,['scripts/local-server.mjs'],{env:{...process.env,PORT:'8788'},stdio:'inherit',windowsHide:true});
const frontend=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173'],{stdio:'inherit',windowsHide:true});
function stop(){backend.kill();frontend.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
backend.on('exit',code=>{if(code){frontend.kill();process.exitCode=code;}});
frontend.on('exit',()=>backend.kill());
