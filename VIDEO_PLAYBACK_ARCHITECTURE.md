# Video Playback Architecture

## Critical Requirements for Video Playback

This document outlines the essential architecture for video playback in ProjectX to prevent blank screens and playback failures.

## 1. Global Video Container

**Location**: `src/components/layout/VideoContainer.tsx`

### Purpose
- Provides a hidden DOM container for all video elements
- Prevents browser throttling and garbage collection of video elements
- Must be initialized BEFORE any video elements are created

### Implementation Requirements
```typescript
// MUST set global flag when ready
(window as any).globalVideoContainerReady = true;

// MUST dispatch event for waiting components
window.dispatchEvent(new CustomEvent("video-container-ready"));
```

### Integration Points
- **Main Editor**: Included in `src/app/page.tsx`
- **Output Window**: Included in `src/app/output/page.tsx`

**⚠️ CRITICAL**: Both windows MUST include `<VideoContainer />` before `<ProjectionCanvas />`

## 2. Video Element Creation

**Location**: `src/components/canvas/Surface.tsx`

### Initialization Sequence
1. **Wait for Container**: Check `globalVideoContainerReady` flag
2. **Create Element**: Set up video with proper attributes
3. **Append to Container**: Add to global container BEFORE calling `load()`
4. **Load Media**: Call `video.load()` to start fetching
5. **Wait for Ready**: Listen for `canplay` and `loadeddata` events

### Required Video Attributes
```typescript
video.crossOrigin = "anonymous";
video.loop = true;
video.muted = true;
video.defaultMuted = true;
video.autoplay = false; // Manual control for better reliability
video.playsInline = true;
video.preload = "auto";
```

### Event Listeners (Required)
- `loadedmetadata` - Metadata available
- `loadeddata` - First frame loaded
- `canplay` - Enough data to start playing
- `playing` - Playback started
- `waiting` - Buffering
- `error` - Load/playback error
- `suspend` - Loading suspended
- `stalled` - Network stalled

## 3. Playback State Management

### Ready State Checks
Always check `video.readyState` before operations:
- `0` HAVE_NOTHING - No data
- `1` HAVE_METADATA - Duration known
- `2` HAVE_CURRENT_DATA - Current frame available
- `3` HAVE_FUTURE_DATA - Can play forward
- `4` HAVE_ENOUGH_DATA - Can play through

### Play Conditions
```typescript
// Only play when ready
if (video.readyState >= 3 && video.paused) {
    video.play().catch(err => console.warn("Play failed:", err));
}
```

### Pause Handling
```typescript
// Always check before pausing
if (!video.paused) {
    video.pause();
}
```

## 4. Texture Creation (CRITICAL)

**Location**: `src/components/canvas/Surface.tsx` (texture useMemo)

### The Blank Screen Problem
**NEVER create a VideoTexture until the video element has loaded frame data.**

Creating a VideoTexture from a video element with `readyState < 2` results in a blank/black texture that may never update.

### Solution: videoHasData State
```typescript
const [videoHasData, setVideoHasData] = useState(false);

// In loadeddata event handler:
const onLoadedData = () => {
    setVideoHasData(true); // CRITICAL: Signal that video has frames
};

// In texture creation:
if ((mediaAsset.type === "video") && videoElement) {
    if (!videoHasData && videoElement.readyState < 2) {
        return null; // Wait for data
    }
    const tex = new THREE.VideoTexture(videoElement);
    tex.needsUpdate = true;
    return tex;
}
```

### Why This Matters
- VideoTexture captures the video's current frame when created
- If readyState < 2, there is NO frame data available
- The texture will be blank/black
- Even when video loads later, the texture may not update automatically
- **Solution**: Delay texture creation until `loadeddata` or `canplay` fires

## 5. Texture Updates

**Location**: `src/components/canvas/Surface.tsx` (useFrame hook)

### Critical Rules
1. **Always Update**: Mark `texture.needsUpdate = true` every frame when `readyState >= 2`
2. **Seek Updates**: Force update after seeking: `videoElement.currentTime = targetTime; texture.needsUpdate = true;`
3. **First Frame**: Update even when paused to show initial frame

### Implementation
```typescript
if (texture && texture instanceof THREE.VideoTexture && videoElement) {
    if (videoElement.readyState >= 2) {
        texture.needsUpdate = true; // CRITICAL: Every frame
    }
}
```

## 6. Blob URL Hydration

**Location**: `src/components/canvas/Surface.tsx`

### Problem
Blob URLs become invalid after:
- Page reload
- Window close/reopen
- Session timeout

### Solution
Proactive hydration from IndexedDB:
1. Check if blob URL is valid with `fetch(url, { method: 'HEAD' })`
2. If invalid, load from IndexedDB
3. Create new blob URL
4. Update media asset

### Implementation
```typescript
const checkAndHydrate = async () => {
    if (url?.startsWith("blob:")) {
        try {
            const resp = await fetch(url, { method: 'HEAD' });
            if (!resp.ok) {
                await hydrateFromDb();
            }
        } catch {
            await hydrateFromDb();
        }
    }
};
```

## 7. Output Window Synchronization

**Location**: `src/app/output/page.tsx`

### Requirements
1. **VideoContainer First**: Must render before ProjectionCanvas
2. **Hydration**: ProjectHydration component for state sync
3. **Independent State**: Output window has its own video elements

### Component Order
```tsx
<VideoContainer />        {/* 1. Container first */}
<ProjectHydration />      {/* 2. State sync */}
<ProjectionCanvas />      {/* 3. Canvas last */}
```

## 8. Composition/Background Video

**Location**: `src/components/canvas/GlobalStageMixer.tsx`

### Special Considerations
- Uses same global container
- Must wait for container ready
- Shares texture via `window.compositionTexture`

## 9. Common Failure Modes & Solutions

### Blank/Black Video Texture (MOST COMMON)
**Cause**: VideoTexture created before video has loaded any frame data (readyState < 2)
**Solution**: Use `videoHasData` state flag, only create texture after `loadeddata` event
**Prevention**: NEVER create VideoTexture until video element has frames

### Blank Screen on Output Window
**Cause**: VideoContainer not initialized before video elements created
**Solution**: Ensure VideoContainer renders first, wait for ready event

### Video Not Playing
**Cause**: Playing before readyState >= 3
**Solution**: Wait for `canplay` or `loadeddata` events

### Stale Blob URLs
**Cause**: Blob URLs invalid after reload
**Solution**: Proactive hydration from IndexedDB

### Texture Not Updating
**Cause**: Missing `texture.needsUpdate = true`
**Solution**: Set needsUpdate every frame when readyState >= 2

### Video Elements Garbage Collected
**Cause**: Not appended to DOM
**Solution**: Append to globalVideoContainer

## 10. Debugging Checklist

When video doesn't play or shows blank:
1. ✅ Check console for "Global video container initialized"
2. ✅ Verify `globalVideoContainerReady === true`
3. ✅ Check video element in DOM (inspect global-video-container)
4. ✅ **CRITICAL**: Verify video.readyState >= 2 BEFORE texture creation
5. ✅ **CRITICAL**: Check for "Creating VideoTexture" log (should only appear after "loaded data")
6. ✅ Check for error events in console
7. ✅ Verify blob URL is valid (not stale)
8. ✅ Check texture.needsUpdate is being set every frame
9. ✅ Verify video.paused state matches expected
10. ✅ Check `videoHasData` state is true when texture exists

## 11. Testing Protocol

Before deploying changes:
1. Test video playback in editor
2. Test video playback in output window
3. Test reload with video playing
4. Test scene switching with video
5. Test multiple videos simultaneously
6. Test after closing/reopening output window

## 12. Code Review Checklist

When reviewing video-related changes:
- [ ] VideoContainer included in all windows?
- [ ] Video elements appended to global container?
- [ ] **CRITICAL**: VideoTexture only created after readyState >= 2?
- [ ] **CRITICAL**: videoHasData state used to gate texture creation?
- [ ] Ready state checked before play()?
- [ ] texture.needsUpdate set every frame?
- [ ] Blob URL hydration implemented?
- [ ] Event listeners properly cleaned up?
- [ ] Error handling for play() failures?
- [ ] Container ready check before creating videos?
- [ ] loadeddata event handler sets videoHasData = true?

## 13. Future Improvements

- [ ] Video pool/reuse system for performance
- [ ] Better error recovery UI
- [ ] Video preloading for scene transitions
- [ ] Hardware acceleration detection
- [ ] Adaptive quality based on performance

---

**Last Updated**: 2026-02-14
**Maintainer**: Development Team
**Status**: Critical - Do Not Modify Without Review
