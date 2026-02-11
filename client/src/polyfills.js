import process from 'process';
import { Buffer } from 'buffer';

window.global = window;
window.process = process;
window.Buffer = Buffer;

if (!window.process.nextTick) {
    window.process.nextTick = (callback, ...args) => {
        setTimeout(() => callback(...args), 0);
    };
}
