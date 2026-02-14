# Video Codec Validation Fix

## Problem

Users were able to import video files with unsupported codecs (like ProRes, DNxHD, Animation codec) that browsers cannot decode. This caused:

1. **Blank surfaces** - Videos wouldn't play, showing black screens
2. **Console errors** - `MediaError code 4: DEMUXER_ERROR_NO_SUPPORTED_STREAMS`
3. **Poor user experience** - No feedback about why videos weren't working
4. **Wasted storage** - Large incompatible files stored in IndexedDB

## Root Cause

The media import process (`processFile` in `src/lib/media-utils.ts`) was accepting any video file without validating if the browser could actually decode it. The function would:

1. Create a blob URL
2. Try to load metadata with a 2-second timeout
3. On error or timeout, use **default fallback values** (1920x1080, 10s duration)
4. Store the incompatible file in the database anyway

This meant incompatible videos were silently accepted and stored, only to fail during playback.

## Solution

### 1. Codec Validation During Import

Modified `src/lib/media-utils.ts` to:

- **Reject** videos that fail to load properly (instead of using defaults)
- Check if `video.videoWidth > 0 && video.videoHeight > 0` (indicates successful decode)
- Provide detailed error messages based on `MediaError.code`:
  - Code 4 (MEDIA_ERR_SRC_NOT_SUPPORTED): "Video codec not supported. This file likely uses ProRes, DNxHD, or another professional codec. Please convert to H.264/MP4..."
  - Code 3 (MEDIA_ERR_DECODE): "Video decode error. The codec may not be supported..."
  - Code 2 (MEDIA_ERR_NETWORK): "Network error loading video."
  - Code 1 (MEDIA_ERR_ABORTED): "Video loading was aborted."

### 2. User-Facing Error Messages

Updated all components that call `processFile`:

- `src/components/panels/MediaLibrary.tsx`
- `src/components/panels/MediaPicker.tsx`
- `src/components/panels/SurfaceProperties.tsx`

Added try-catch blocks that display toast notifications with the error message:

```typescript
try {
    await processFile(file, addMediaAsset);
} catch (error: any) {
    console.error('Failed to process file:', file.name, error);
    toast.error(error.message || 'Failed to import file', 8000);
}
```

## Technical Details

### Before (Problematic Code)

```typescript
video.onerror = () => {
    clearTimeout(timeoutId);
    console.warn(`Video metadata load failed for ${file.name}, using defaults.`);
    safeResolve({ width: 1920, height: 1080, duration: 10 }); // ❌ WRONG
};
```

### After (Fixed Code)

```typescript
video.onerror = (e) => {
    clearTimeout(timeoutId);
    const mediaError = (e.target as HTMLVideoElement)?.error;
    let errorMsg = `Video codec not supported`;
    
    if (mediaError) {
        switch (mediaError.code) {
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                errorMsg = `Video codec not supported. This file likely uses ProRes, DNxHD, or another professional codec. Please convert to H.264/MP4 format using FFmpeg, HandBrake, or Adobe Media Encoder.`;
                break;
            // ... other cases
        }
    }
    
    safeReject(new Error(errorMsg)); // ✅ CORRECT
};
```

## Supported vs Unsupported Codecs

### ✅ Supported (Web-Compatible)
- **H.264** (MP4 container) - Best compatibility
- **H.265/HEVC** (with hardware support on some devices)
- **VP8/VP9** (WebM container)
- **AV1** (newer browsers)

### ❌ Unsupported (Professional Codecs)
- **ProRes** (common in VJ loops, Final Cut Pro)
- **DNxHD/DNxHR** (Avid)
- **Animation codec** (QuickTime)
- **Uncompressed** formats
- Most other professional codecs

## User Guidance

When a user tries to import an unsupported video, they now see:

**Toast Error Message:**
> "Video codec not supported. This file likely uses ProRes, DNxHD, or another professional codec. Please convert to H.264/MP4 format using FFmpeg, HandBrake, or Adobe Media Encoder."

### Conversion Instructions

Users can convert their videos using:

**FFmpeg (Command Line):**
```bash
ffmpeg -i "input.mov" \
  -c:v libx264 \
  -preset medium \
  -crf 18 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "output.mp4"
```

**HandBrake (GUI):**
1. Open HandBrake
2. Import video file
3. Select "Web" preset
4. Click "Start Encode"

**Adobe Media Encoder:**
1. Import video
2. Format: H.264
3. Preset: YouTube 1080p HD
4. Export

## Benefits

1. **Immediate Feedback** - Users know right away if a video is incompatible
2. **Prevents Wasted Storage** - Incompatible files aren't stored in IndexedDB
3. **Clear Instructions** - Error message tells users exactly how to fix the problem
4. **Better UX** - No more mysterious blank surfaces
5. **Prevents Confusion** - Users don't waste time debugging playback issues

## Testing

To test the fix:

1. **Try to import an unsupported video** (e.g., ProRes .mov file)
   - Expected: Toast error appears with codec message
   - Expected: File is NOT added to media library

2. **Import a supported video** (e.g., H.264 .mp4 file)
   - Expected: File imports successfully
   - Expected: Video plays on surface

3. **Check console logs**
   - Unsupported videos should log the MediaError details
   - No more infinite error loops

## Related Files

- `src/lib/media-utils.ts` - Core validation logic
- `src/components/panels/MediaLibrary.tsx` - Error handling in main library
- `src/components/panels/MediaPicker.tsx` - Error handling in picker dialog
- `src/components/panels/SurfaceProperties.tsx` - Error handling in properties panel
- `src/store/toast-store.ts` - Toast notification system

## Migration Notes

Existing projects with incompatible videos already stored in IndexedDB will continue to have playback issues. Users should:

1. Delete the incompatible media from their library
2. Convert the video to H.264/MP4
3. Re-import the converted file

## Future Improvements

Possible enhancements:

1. **Client-side transcoding** - Use WebAssembly FFmpeg to auto-convert on import (heavy, slow)
2. **Codec detection before upload** - Parse file headers to detect codec without loading
3. **Batch conversion tool** - Built-in converter for incompatible files
4. **Format recommendations** - Suggest optimal settings based on file analysis

---

**Status**: ✅ Implemented and tested
**Date**: 2026-02-14
**Impact**: Prevents all codec-related playback issues at import time
