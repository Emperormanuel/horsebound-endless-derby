import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist/vendor', { recursive: true });
await cp('game', 'dist', { recursive: true });
await copyFile('node_modules/three/build/three.module.js', 'dist/vendor/three.module.js');
await copyFile('node_modules/three/build/three.core.js', 'dist/vendor/three.core.js');
await copyFile('node_modules/three/LICENSE', 'dist/vendor/three-LICENSE.txt');
console.log('Static game built in dist/');
