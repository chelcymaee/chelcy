#!/usr/bin/env python3
"""Remove outer black background from sticker image, making it transparent."""

import sys
from PIL import Image
from collections import deque


def remove_outer_background(input_path: str, output_path: str, threshold: int = 40):
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    def is_dark(pixel):
        r, g, b, a = pixel
        return r < threshold and g < threshold and b < threshold

    visited = [[False] * height for _ in range(width)]
    queue = deque()

    # Seed from all four edges
    for x in range(width):
        for y in [0, height - 1]:
            if not visited[x][y] and is_dark(pixels[x, y]):
                queue.append((x, y))
                visited[x][y] = True
    for y in range(height):
        for x in [0, width - 1]:
            if not visited[x][y] and is_dark(pixels[x, y]):
                queue.append((x, y))
                visited[x][y] = True

    # BFS flood fill through dark pixels connected to the edges
    while queue:
        x, y = queue.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and not visited[nx][ny]:
                if is_dark(pixels[nx, ny]):
                    visited[nx][ny] = True
                    queue.append((nx, ny))

    # Make outer background pixels transparent
    for x in range(width):
        for y in range(height):
            if visited[x][y]:
                pixels[x, y] = (0, 0, 0, 0)

    img.save(output_path, "PNG")
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 remove_bg.py <input_image> [output_image]")
        sys.exit(1)
    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else inp.rsplit(".", 1)[0] + "_sticker.png"
    remove_outer_background(inp, out)
