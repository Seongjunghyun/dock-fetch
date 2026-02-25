import { app } from 'electron';
import * as pty from 'node-pty';

app.whenReady().then(() => {
    console.log('App ready. Spawn testing.');
    try {
        const shell = process.env[process.platform === 'win32' ? 'COMSPEC' : 'SHELL'] || '/bin/sh';
        const image = 'hello-world'; // Or any local image

        const ptyProcess = pty.spawn(shell, ['-c', `docker run -it --rm ${image} /bin/sh`], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: process.env.HOME,
            env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` } as any
        });

        ptyProcess.onData((data) => {
            console.log('PTY STDOUT/STDERR:', data);
        });

        ptyProcess.onExit((e) => {
            console.log('PTY Exited with code:', e.exitCode);
            app.quit();
        });
    } catch (e) {
        console.error('Exception caught:', e);
        app.quit();
    }
});
