# Testing the Video Playback Fix

## The Critical Fix

**Problem**: VideoTexture was being created immediately when the video element existed, but BEFORE the video had loaded any frame data. This resulted in blank/black textures.

**Solution**: Added `videoHasData` state that is only set to `true` after the `loadeddata` or `canplay` events fire. Texture creation is now gated by this flag.

## How to Test

### 1. Basic Video Test
1. Open the app at http://localhost:3000
2. Add a video file to your media library
3. Create a surface and assign the video to it
4. **Expected**: Video should display immediately (not blank)
5. Press play
6. **Expected**: Video should play smoothly

### 2. Output Window Test
1. Click "LAUNCH OUTPUT"
2. **Expected**: Video should display in the output window (not blank)
3. **Expected**: Video should be in sync with the editor

### 3. Reload Test
1. With video playing, reload the page (Cmd+R)
2. **Expected**: Video should load and display again (blob URL hydration)
3. **Expected**: No blank screen

### 4. Multiple Videos Test
1. Add multiple video surfaces
2. **Expected**: All videos display correctly
3. Press play
4. **Expected**: All videos play in sync

### 5. Scene Switching Test
1. Create Scene 2 with a different video
2. Switch between Scene 1 and Scene 2
3. **Expected**: Videos in each scene display correctly
4. **Expected**: No blank screens when switching

## What to Look For in Console

### Success Indicators
```
✓ Global video container initialized
Creating video element for: [video name]
✓ Video appended to global container: [video name]
→ Video load started: [video name]
✓ Video metadata loaded: [video name] Duration: X
✓ Video loaded data: [video name] readyState: 3
✓ Creating VideoTexture for: [video name] readyState: 3  <-- THIS IS KEY
✓ Video can play: [video name] readyState: 4
```

### The Key Log
Look for: **"✓ Creating VideoTexture for: [video name] readyState: 3"**

This log should ONLY appear AFTER "Video loaded data" or "Video can play".

If you see texture creation before the video has data, that's the bug.

### If Video Has No Data Yet (Expected Behavior)
```
⏳ Video element exists but no data yet, waiting... [video name] readyState: 0
```

This is GOOD - it means the texture creation is being deferred until data is available.

## Common Issues

### Issue: Still seeing blank screen
**Check**:
1. Look for "Creating VideoTexture" in console - does it appear AFTER "loaded data"?
2. Check video.readyState value when texture is created (should be >= 2)
3. Verify "videoHasData" is true before texture creation

### Issue: Video not playing
**Check**:
1. Is the video element in the DOM? (Inspect #global-video-container)
2. What is video.readyState? (Should be >= 3 for playback)
3. Are there any error events in console?

### Issue: Blank on output window only
**Check**:
1. Is VideoContainer rendered in output window? (Should see "Global video container initialized")
2. Are video elements being created in output window's container?
3. Check if blob URLs are being hydrated from IndexedDB

## Performance Check

With the fix:
- Texture creation is slightly delayed (until loadeddata event)
- This is GOOD - prevents creating useless blank textures
- Delay is typically < 100ms for local files
- No performance impact during playback

## Browser DevTools Inspection

### Check Video Element
1. Open DevTools (F12)
2. Find element: `#global-video-container`
3. Expand to see video elements
4. Check video element properties:
   - `readyState` should be >= 2
   - `videoWidth` and `videoHeight` should be > 0
   - `currentTime` should advance when playing

### Check Three.js Scene
1. In console, type: `window.__THREE_DEVTOOLS__`
2. If available, inspect the scene
3. Find Surface meshes
4. Check material.uniforms.uTexture
5. Texture should have valid image data

## Rollback

If the fix causes issues:
```bash
git checkout HEAD~1 src/components/canvas/Surface.tsx
```

Then report the specific issue with:
- Console logs
- Video file details (format, size, codec)
- Browser and version
- Steps to reproduce

## Success Criteria

✅ Videos display immediately (not blank)
✅ Videos play smoothly in editor
✅ Videos display correctly in output window
✅ Videos survive page reload
✅ Multiple videos work simultaneously
✅ Scene switching preserves video playback
✅ Console shows texture creation AFTER data loaded
✅ No performance degradation

---

**Date**: 2026-02-14
**Fix Version**: 2.0 (videoHasData guard)
**Status**: Ready for Testing
