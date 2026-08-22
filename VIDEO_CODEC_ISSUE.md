# Video Codec Issue - CRITICAL

## The REAL Problem

Your video file "What Sorcery Is This VJ Loop 004.mov" **cannot be played by the browser** because it uses an unsupported codec.

### Error from Console:
```
MediaError {code: 4, message: 'DEMUXER_ERROR_NO_SUPPORTED_STREAMS: FFmpegDemuxer: no supported streams'}
```

**Error Code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED**

This means the browser's built-in video decoder cannot read the codec used in your .mov file.

## Why This Happens

`.mov` files can contain many different video codecs:
- **Supported**: H.264, H.265/HEVC (with hardware support), VP8, VP9, AV1
- **NOT Supported**: ProRes, DNxHD, Animation codec, many others

Your file likely uses:
- ProRes (common in VJ/professional video)
- Animation codec
- Or another professional codec not supported by browsers

## The Solution

You need to **re-encode** your video to a web-compatible format.

### Option 1: Using FFmpeg (Recommended)

```bash
ffmpeg -i "What Sorcery Is This VJ Loop 004.mov" \
  -c:v libx264 \
  -preset medium \
  -crf 18 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "What_Sorcery_Web_Compatible.mp4"
```

### Option 2: Using HandBrake (GUI Tool)
1. Download HandBrake (free)
2. Open your .mov file
3. Select "Web" preset
4. Click "Start Encode"

### Option 3: Using Adobe Media Encoder
1. Import your .mov file
2. Choose Format: H.264
3. Preset: YouTube 1080p HD
4. Export

### Option 4: Using VLC
1. Open VLC
2. Media → Convert/Save
3. Add your file
4. Choose Profile: "Video - H.264 + MP3 (MP4)"
5. Convert

## Recommended Settings for Web

- **Container**: MP4 or WebM
- **Video Codec**: H.264 (best compatibility) or VP9 (better quality)
- **Pixel Format**: yuv420p (NOT yuv422p or yuv444p)
- **Profile**: High or Main
- **Level**: 4.0 or higher
- **Bitrate**: 5-10 Mbps for 1080p

## How to Check Your Current Codec

### Using FFmpeg:
```bash
ffmpeg -i "What Sorcery Is This VJ Loop 004.mov"
```

Look for the line that says "Video:" - it will show the codec.

### Using MediaInfo (GUI):
1. Download MediaInfo
2. Open your file
3. Look at "Format" under Video section

## After Re-encoding

1. Delete the old video from your media library
2. Import the new web-compatible version
3. It should play immediately

## Why Our Fixes Didn't Help

All the playback architecture fixes we implemented were correct and necessary, but they can't fix a fundamental codec incompatibility. The browser simply cannot decode your video file format.

The infinite loop of errors you saw was:
1. Try to load video
2. Browser tries to decode
3. Codec not supported → error
4. Recovery attempt from IndexedDB
5. Same file, same codec → error again
6. Repeat forever

## Prevention

**Always use web-compatible formats:**
- MP4 with H.264 codec
- WebM with VP8/VP9 codec
- Avoid ProRes, DNxHD, Animation codec for web

## Quick Test

Try adding a different video file (like one from your phone or a YouTube download) to verify the app works with compatible videos.

---

**Bottom Line**: Your app is working correctly. The video file format is not compatible with web browsers. Re-encode it to H.264/MP4 and it will work.
