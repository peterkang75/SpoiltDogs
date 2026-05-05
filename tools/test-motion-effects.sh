#!/bin/bash
# Test motion effects locally with a sample image
# Usage: ./test-motion-effects.sh <image_path>

IMG="${1:-/tmp/reel-gradient.png}"
DUR=8
FPS=25
FRAMES=$((DUR * FPS))
W=1080
H=1920

echo "Source: $IMG"
echo "Duration: ${DUR}s, FPS: $FPS, Frames: $FRAMES"

# 1. Ken Burns Zoom In (center → zoom 1.15x)
echo "=== Effect 1: Ken Burns Zoom In ==="
ZINC=$(echo "scale=8; 0.15 / $FRAMES" | bc)
ffmpeg -y -loop 1 -t $DUR -i "$IMG" \
  -filter_complex "[0:v]scale=$((W * 12 / 10)):$((H * 12 / 10)),zoompan=z='min(1+${ZINC}*on\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${FRAMES}:s=${W}x${H}:fps=${FPS}[v]" \
  -map "[v]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -t $DUR \
  /tmp/motion-zoom-in.mp4 2>/dev/null
echo "  → /tmp/motion-zoom-in.mp4"

# 2. Ken Burns Zoom Out (1.15x → center)
echo "=== Effect 2: Ken Burns Zoom Out ==="
ffmpeg -y -loop 1 -t $DUR -i "$IMG" \
  -filter_complex "[0:v]scale=$((W * 12 / 10)):$((H * 12 / 10)),zoompan=z='max(1.15-${ZINC}*on\,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${FRAMES}:s=${W}x${H}:fps=${FPS}[v]" \
  -map "[v]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -t $DUR \
  /tmp/motion-zoom-out.mp4 2>/dev/null
echo "  → /tmp/motion-zoom-out.mp4"

# 3. Pan Left to Right (crop-based)
echo "=== Effect 3: Pan Left → Right ==="
SCALE_W=$((W * 15 / 10))
SCALE_H=$((H * 15 / 10))
PAN_RANGE=$((SCALE_W - W))
ffmpeg -y -loop 1 -t $DUR -i "$IMG" \
  -filter_complex "[0:v]scale=${SCALE_W}:${SCALE_H},crop=${W}:${H}:x='${PAN_RANGE}*t/${DUR}':y='(ih-${H})/2'[v]" \
  -map "[v]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -t $DUR \
  /tmp/motion-pan-right.mp4 2>/dev/null
echo "  → /tmp/motion-pan-right.mp4"

# 4. Pan Right to Left (crop-based)
echo "=== Effect 4: Pan Right → Left ==="
ffmpeg -y -loop 1 -t $DUR -i "$IMG" \
  -filter_complex "[0:v]scale=${SCALE_W}:${SCALE_H},crop=${W}:${H}:x='${PAN_RANGE}-${PAN_RANGE}*t/${DUR}':y='(ih-${H})/2'[v]" \
  -map "[v]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -t $DUR \
  /tmp/motion-pan-left.mp4 2>/dev/null
echo "  → /tmp/motion-pan-left.mp4"

# 5. Tilt Up (bottom to top, crop-based)
echo "=== Effect 5: Tilt Up ==="
TILT_RANGE=$((SCALE_H - H))
ffmpeg -y -loop 1 -t $DUR -i "$IMG" \
  -filter_complex "[0:v]scale=${SCALE_W}:${SCALE_H},crop=${W}:${H}:x='(iw-${W})/2':y='${TILT_RANGE}-${TILT_RANGE}*t/${DUR}'[v]" \
  -map "[v]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -t $DUR \
  /tmp/motion-tilt-up.mp4 2>/dev/null
echo "  → /tmp/motion-tilt-up.mp4"

echo ""
echo "Done! Open with: open /tmp/motion-*.mp4"
