#!/bin/bash
# Re-encode the /muedvox listening examples from a folder of wavs into public/muedvox/audio/.
#
#   scripts/muedvox/encode-lp-audio.sh "<folder holding NNN_{mix,vocal}_{before,after}.wav>"
#
# The page plays what lib/muedvox/config.ts MUEDVOX_AUDIO_EXAMPLES lists; this only makes the files.
# CBR and no tags on purpose: takes of the same length come out the same number of bytes, which is what
# tests/unit/muedvox-compare-player.test.tsx reads to tell that the four takes of a song still line up.
set -euo pipefail
src="${1:?folder of wavs}"
out="$(cd "$(dirname "$0")/../.." && pwd)/public/muedvox/audio"
mkdir -p "$out"
found=0
for wav in "$src"/*_mix_before.wav "$src"/*_mix_after.wav "$src"/*_vocal_before.wav "$src"/*_vocal_after.wav; do
  [ -f "$wav" ] || continue
  name="$(basename "$wav" .wav)"
  ffmpeg -v error -y -i "$wav" -map_metadata -1 -vn -c:a libmp3lame -b:a 192k -id3v2_version 0 -write_id3v1 0 "$out/$name.mp3"
  echo "$name  $(shasum -a 256 "$wav" | cut -c1-16)  ->  $(wc -c < "$out/$name.mp3" | tr -d ' ') B"
  found=$((found + 1))
done
[ "$found" -gt 0 ] || { echo "no NNN_{mix,vocal}_{before,after}.wav in $src" >&2; exit 1; }
echo "$found files -> $out"
