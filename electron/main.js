const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

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
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        show: false,
    });

    // Load the app
    const startURL = isDev
        ? 'http://localhost:3000'
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

    // Create application menu
    const template = [
        {
            label: 'ProjectionX',
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
    const outputWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        backgroundColor: '#000000',
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const outputURL = isDev
        ? 'http://localhost:3000/output'
        : `file://${path.join(__dirname, '../out/output.html')}`;

    outputWindow.loadURL(outputURL);
    outputWindow.setFullScreen(true);
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
