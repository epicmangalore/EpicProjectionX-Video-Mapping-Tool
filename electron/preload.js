const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Menu actions
    onMenuAction: (callback) => {
        const handlers = {
            'menu-new-project': () => callback('new-project'),
            'menu-open-project': () => callback('open-project'),
            'menu-save-project': () => callback('save-project'),
            'menu-export': () => callback('export'),
        };

        Object.entries(handlers).forEach(([channel, handler]) => {
            ipcRenderer.on(channel, handler);
        });
    },

    // Platform info
    platform: process.platform,

    // App info
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },
});
