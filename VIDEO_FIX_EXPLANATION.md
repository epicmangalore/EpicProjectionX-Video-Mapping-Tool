# Video Playback Fix - Simple Explanation

## The Problem (Before Fix)

```
Timeline:
1. Video element created ✓
2. VideoTexture created ✗ (TOO EARLY - video has no frames yet!)
3. Video starts loading...
4. Video data arrives
5. Video plays
   
Result: Blank/black texture because it was created before video had any frames
```

## The Solution (After Fix)

```
Timeline:
1. Video element created ✓
2. Video starts loading...
3. Video data arrives ✓
4. videoHasData flag set to TRUE ✓
5. VideoTexture created ✓ (NOW - video has frames!)
6. Video plays ✓
   
Result: Texture has actual video frames from the start
```

## Code Change

### Before (Broken)
```typescript
const texture = useMemo(() => {
    if (videoElement) {
        // BUG: Creates texture even if video has no data
        return new THREE.VideoTexture(videoElement);
    }
}, [videoElement]);
```

### After (Fixed)
```typescript
const [videoHasData, setVideoHasData] = useState(false);

// In video event handler:
video.addEventListener("loadeddata", () => {
    setVideoHasData(true); // Signal: video has frames now!
});

const texture = useMemo(() => {
    if (videoElement) {
        // GUARD: Only create texture if video has data
        if (!videoHasData && videoElement.readyState < 2) {
            return null; // Wait...
        }
        return new THREE.VideoTexture(videoElement); // Safe now!
    }
}, [videoElement, videoHasData]); // Re-run when videoHasData changes
```

## Why This Matters

### VideoTexture Behavior
- When you create a `new THREE.VideoTexture(videoElement)`, Three.js captures the current state
- If the video has no frames yet (readyState < 2), the texture is blank
- Even when the video loads later, the texture may not automatically update
- **You must create the texture AFTER the video has frames**

### Video Ready States
```
0 = HAVE_NOTHING      ❌ No data - texture would be blank
1 = HAVE_METADATA     ❌ Only duration known - no frames yet
2 = HAVE_CURRENT_DATA ✅ First frame available - safe to create texture
3 = HAVE_FUTURE_DATA  ✅ Can play forward
4 = HAVE_ENOUGH_DATA  ✅ Can play through
```

## The `videoHasData` Flag

### Purpose
Acts as a gate to prevent premature texture creation

### When It's Set
- `loadeddata` event fires (video has loaded first frame)
- `canplay` event fires (video is ready to play)

### How It Works
1. Initially `false`
2. Video element created
3. Video starts loading
4. `loadeddata` event fires → `videoHasData = true`
5. `useMemo` dependency triggers re-evaluation
6. Texture creation proceeds safely

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Video Loading Flow                       │
└─────────────────────────────────────────────────────────────┘

[Create Video Element]
         ↓
[Append to Container]
         ↓
[Call video.load()]
         ↓
[Video Starts Loading] ← videoHasData = false (texture = null)
         ↓
[Metadata Loaded] (readyState = 1)
         ↓
[First Frame Loaded] (readyState = 2)
         ↓
[loadeddata Event Fires] ← videoHasData = true
         ↓
[useMemo Re-evaluates]
         ↓
[VideoTexture Created] ✓ ← Texture has actual frames!
         ↓
[Video Can Play] (readyState = 3)
         ↓
[Video Plays] ✓
```

## Comparison

### Old Behavior (Broken)
```
Video Element → Texture Created → Video Loads → Still Blank ❌
```

### New Behavior (Fixed)
```
Video Element → Video Loads → Texture Created → Shows Video ✅
```

## Key Takeaway

**NEVER create a VideoTexture until the video has loaded frame data.**

This is enforced by:
1. The `videoHasData` state flag
2. Checking `videoElement.readyState >= 2`
3. Only creating texture after `loadeddata` or `canplay` events

## Testing

To verify the fix is working:
1. Open browser console
2. Look for this log: `"✓ Creating VideoTexture for: [video name] readyState: 3"`
3. It should appear AFTER: `"✓ Video loaded data"`
4. If texture creation happens before data is loaded, the bug is back

## Prevention

To prevent this bug in the future:
- Always use the `videoHasData` pattern for video textures
- Never create VideoTexture in the same effect that creates the video element
- Always wait for `loadeddata` or `canplay` events
- Check `readyState >= 2` before texture creation
- Add logging to verify order of operations

---

**Remember**: The texture captures the video's state at creation time. If there's no frame data, you get a blank texture!
