#!/usr/bin/env bash
# Download a PixelLab character's east-facing frames into assets/hero/<age>/.
# Usage: tools/fetch-hero.sh <age> <character-id>
set -euo pipefail

age=$1
id=$2
root=$(cd "$(dirname "$0")/.." && pwd)
dest="$root/assets/hero/$age"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl -sfL -o "$tmp/c.zip" "https://api.pixellab.ai/mcp/characters/$id/download"
unzip -q "$tmp/c.zip" -d "$tmp/c"

mkdir -p "$dest"
rm -rf "${dest:?}/rotations"
mkdir -p "$dest/rotations"
cp "$tmp"/c/*/rotations/*.png "$dest/rotations/"
for anim in idle run jump; do
  src=$(echo "$tmp"/c/*/animations/"$anim"/east)
  [ -d "$src" ] || { echo "missing animation: $anim" >&2; continue; }
  rm -rf "${dest:?}/$anim"
  mkdir -p "$dest/$anim"
  i=0
  for f in $(ls "$src"/frame_*.png | sort); do
    cp "$f" "$dest/$anim/$i.png"
    i=$((i + 1))
  done
  echo "$age/$anim: $i frames"
done
