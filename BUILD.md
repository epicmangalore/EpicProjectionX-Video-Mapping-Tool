# Building ProjectionX for macOS

## Prerequisites

- Node.js 18+ and npm
- macOS (for building Mac apps)
- Xcode Command Line Tools (for code signing)

## Development

### Run in development mode (browser):
```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Run in development mode (Electron):
```bash
npm install
npm run electron:dev
```

This will start the Next.js dev server and open the Electron window.

## Building the Mac App

### 1. Install dependencies:
```bash
npm install
```

### 2. Build the app:
```bash
npm run package
```

This will:
- Build the Next.js app with static export
- Package it into an Electron app
- Create a DMG installer in the `dist` folder

### 3. Find your app:
The built app will be in:
- **DMG Installer**: `dist/ProjectionX-0.1.0.dmg`
- **App Bundle**: `dist/mac/ProjectionX.app`
- **ZIP Archive**: `dist/ProjectionX-0.1.0-mac.zip`

## Building for All Platforms

To build for macOS, Windows, and Linux:
```bash
npm run package:all
```

**Note**: Cross-platform builds work best on macOS. Windows and Linux builds may require additional configuration.

## App Structure

- `electron/main.js` - Electron main process (app window management)
- `electron/preload.js` - Preload script for security
- `build/` - Build resources (icons, entitlements)
- `dist/` - Output directory for built apps

## Customization

### App Icon
Replace the icon files in `build/`:
- macOS: `build/icon.icns` (512x512 recommended)
- Windows: `build/icon.ico`
- Linux: `build/icons/` (various sizes)

You can generate these from a PNG using tools like:
- https://cloudconvert.com/png-to-icns
- https://cloudconvert.com/png-to-ico

### App Metadata
Edit `electron-builder.json`:
- `appId` - Bundle identifier
- `productName` - App display name
- `copyright` - Copyright text

### Code Signing (Optional)
For distribution, you'll need:
1. Apple Developer account ($99/year)
2. Developer ID Application certificate
3. Update `electron-builder.json` with your signing identity

## Output Window

The app includes a dedicated output window for projector output:
- **Keyboard Shortcut**: Cmd+Shift+O
- **Menu**: Window → Output Window

The output window opens in fullscreen on a secondary display (if available).

## Troubleshooting

### "App is damaged and can't be opened" on macOS
This happens with unsigned apps. To bypass Gatekeeper:
```bash
xattr -cr /path/to/ProjectionX.app
```

### Build fails on export
Make sure you have the latest dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Electron window is blank
Check the developer console (View → Toggle Developer Tools) for errors.
Make sure the Next.js app built successfully in the `out` directory.

## Distribution

### For personal use:
Just send the `.dmg` or `.app` file.

### For public distribution:
1. Sign the app with your Developer ID
2. Notarize with Apple
3. Create a signed DMG

See Apple's documentation on code signing and notarization.
