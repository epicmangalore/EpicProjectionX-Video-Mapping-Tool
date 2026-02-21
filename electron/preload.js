const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Menu actions
    onMenuAction: (callback) => {
        const h1 = () => callback('new-project');
        const h2 = () => callback('open-project');
        const h3 = () => callback('save-project');
        const h4 = () => callback('export');

        ipcRenderer.on('menu-new-project', h1);
        ipcRenderer.on('menu-open-project', h2);
        ipcRenderer.on('menu-save-project', h3);
        ipcRenderer.on('menu-export', h4);

        return () => {
            ipcRenderer.removeListener('menu-new-project', h1);
            ipcRenderer.removeListener('menu-open-project', h2);
            ipcRenderer.removeListener('menu-save-project', h3);
            ipcRenderer.removeListener('menu-export', h4);
        };
    },

    // Platform info
    platform: process.platform,

    // App info
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },

    // Output window control
    openOutputWindow: () => ipcRenderer.send('open-output-window'),
    closeOutputWindow: () => ipcRenderer.send('close-output-window'),

    // Updates & Restart
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    quitAndInstall: () => ipcRenderer.send('quit-and-install'),
    restartApp: () => ipcRenderer.send('restart-app'),
    onUpdateStatus: (callback) => {
        const handler = (event, status, info) => callback(status, info);
        ipcRenderer.on('update-status', handler);
        return () => ipcRenderer.removeListener('update-status', handler);
    }
});
