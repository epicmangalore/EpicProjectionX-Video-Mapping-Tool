const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let outputWindow;

// Hardware acceleration is key for projection mapping
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        minWidth: 1280,
        minHeight: 720,
        backgroundColor: '#09090b',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        show: false,
    });

    // Load the app
    const port = process.env.PORT || 3000;
    const startURL = isDev
        ? `http://localhost:${port}`
        : `file://${path.join(__dirname, '../out/index.html')}`;

    mainWindow.loadURL(startURL);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (outputWindow) outputWindow.close();
    });

    // Create application menu
    const template = [
        {
            label: 'ProjectX by EPIC',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-project');
                    }
                },
                {
                    label: 'Open Project',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('menu-open-project');
                    }
                },
                {
                    label: 'Save Project',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-project');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export');
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                {
                    label: 'Output Window',
                    accelerator: 'CmdOrCtrl+Shift+O',
                    click: () => {
                        createOutputWindow();
                    }
                },
                { type: 'separator' },
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: async () => {
                        const { shell } = require('electron');
                        await shell.openExternal('https://github.com/yourusername/projectionx');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createOutputWindow() {
    if (outputWindow) {
        outputWindow.focus();
        return;
    }

    outputWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        backgroundColor: '#000000',
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const outputURL = isDev
        ? 'http://localhost:3000/output'
        : `file://${path.join(__dirname, '../out/output.html')}`;

    outputWindow.loadURL(outputURL);
    outputWindow.setFullScreen(true);

    outputWindow.on('closed', () => {
        outputWindow = null;
    });
}

// IPC Handlers
ipcMain.on('open-output-window', () => {
    createOutputWindow();
});

ipcMain.on('close-output-window', () => {
    if (outputWindow) outputWindow.close();
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Check for updates
    if (!isDev) {
        autoUpdater.logger = console;

        autoUpdater.on('checking-for-update', () => {
            console.log('AUTO_UPDATER: Checking for update...');
            mainWindow?.webContents.send('update-status', 'checking');
        });
        autoUpdater.on('update-available', (info) => {
            console.log('AUTO_UPDATER: Update available:', info);
            mainWindow?.webContents.send('update-status', 'available', info);
        });
        autoUpdater.on('update-not-available', (info) => {
            console.log('AUTO_UPDATER: Update not available:', info);
            mainWindow?.webContents.send('update-status', 'not-available');
        });
        autoUpdater.on('error', (err) => {
            console.error('AUTO_UPDATER: Error in auto-updater:', err);
            mainWindow?.webContents.send('update-status', 'error', err.message);
        });
        autoUpdater.on('download-progress', (progressObj) => {
            console.log(`AUTO_UPDATER: Download progress: ${progressObj.percent}%`);
            mainWindow?.webContents.send('update-status', 'downloading', progressObj.percent);
        });
        autoUpdater.on('update-downloaded', (info) => {
            console.log('AUTO_UPDATER: Update downloaded. Will install on quit.');
            mainWindow?.webContents.send('update-status', 'downloaded');
        });

        autoUpdater.checkForUpdatesAndNotify();
    }
});

// IPC Handlers for Update Control
ipcMain.on('check-for-updates', () => {
    if (!isDev) {
        autoUpdater.checkForUpdates();
    } else {
        mainWindow?.webContents.send('update-status', 'not-available');
    }
});

ipcMain.on('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('restart-app', () => {
    app.relaunch();
    app.exit();
});

app.on('window-all-closed', () => {
    app.quit();
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
