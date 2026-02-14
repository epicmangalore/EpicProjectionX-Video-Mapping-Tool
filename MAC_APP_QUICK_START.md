# 🚀 Mac App - Quick Start Guide

## ✅ Setup Complete!

Your ProjectX by EPIC app is ready to be packaged for macOS! All the necessary files have been created:

- ✓ Electron main process (`electron/main.js`)
- ✓ Electron preload script (`electron/preload.js`)
- ✓ Build configuration (`electron-builder.json`)
- ✓ macOS entitlements (`build/entitlements.mac.plist`)
- ✓ Package.json updated with build scripts
- ✓ Dependencies installed

## 🎯 Build Your Mac App

### Quick Build (Mac Only):
```bash
npm run package
```

This creates:
- **DMG Installer**: `dist/ProjectX by EPIC-0.1.0.dmg` ← Share this!
- **App Bundle**: `dist/mac/ProjectX by EPIC.app`
- **ZIP Archive**: `dist/ProjectX by EPIC-0.1.0-mac.zip`

### All Platforms (Mac, Windows, Linux):
```bash
npm run package:all
```

## 📦 What You Get

### DMG Installer
- Double-click to mount
- Drag ProjectX by EPIC to Applications folder
- Ready to distribute!

### .app Bundle
- Standalone macOS application
- Can be copied directly to Applications
- Works like any native Mac app

## 🎨 Add Your App Icon (Optional)

1. Create a 1024x1024 PNG icon
2. Convert to .icns: https://cloudconvert.com/png-to-icns
3. Save as `build/icon.icns`
4. Rebuild: `npm run package`

See `build/ICON_README.md` for details.

## 🖥️ Features Included

✓ **Native Mac app** - Runs like any desktop application
✓ **Output window** - Cmd+Shift+O for fullscreen projector output
✓ **Menu bar** - Native macOS menus with keyboard shortcuts
✓ **File operations** - Save, Open, Export via menu
✓ **Auto-updates** - Ready for update notifications (requires setup)

## 🧪 Test Your App

### Development Mode:
```bash
npm run electron:dev
```
Opens the app in development mode with hot reload.

### Test Production Build:
```bash
npm run package
open dist/mac/ProjectX by EPIC.app
```

## 📝 Known Limitations

1. **First Run Warning**: macOS may show "App is damaged" for unsigned apps
   - **Fix**: Right-click → Open, then click "Open" in dialog
   - Or: `xattr -cr /path/to/ProjectX by EPIC.app` in Terminal

2. **Code Signing**: App is not signed (requires Apple Developer account)
   - Works fine for personal use
   - For public distribution, you'll need to sign and notarize

## 🔧 Troubleshooting

### Build fails?
```bash
rm -rf node_modules package-lock.json .next out dist
npm install
npm run package
```

### App won't open?
```bash
xattr -cr dist/mac/ProjectX by EPIC.app
```

### Need help?
See `BUILD.md` for detailed documentation.

## 🎉 You're Done!

Your Mac app is in the `dist` folder. Share the DMG file with anyone!

The app includes:
- Main editor window
- Output window for projection
- All the features from the web version
- Offline support (no internet required)

---

**Built with:** Electron + Next.js + React Three Fiber
**Version:** 0.1.0
