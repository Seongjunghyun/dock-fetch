const { app } = require('electron');
const pty = require('node-pty');

app.whenReady().then(() => {
    console.log('App ready. Spawn testing.');
    try {
        const shell = process.env[process.platform === 'win32' ? 'COMSPEC' : 'SHELL'] || '/bin/sh';
        const image = 'alpine'; // Or any local image

        const env = Object.assign({}, process.env, { PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin` });
        const ptyProcess = pty.spawn(shell, ['-c', `docker run -it --rm ${image} /bin/sh`], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: process.env.HOME,
            env: env
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
