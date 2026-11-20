import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "assets" / "images"
OLIVE = (98, 117, 54, 255)
OLIVE_DARK = (70, 89, 39, 255)
PAPER = (246, 242, 230, 255)
GOLD = (180, 154, 90, 255)
TRANSPARENT = (0, 0, 0, 0)


def blank(size, color):
    return bytearray(color * size * size)


def pixel(canvas, size, x, y, color):
    if 0 <= x < size and 0 <= y < size:
        offset = (y * size + x) * 4
        canvas[offset : offset + 4] = bytes(color)


def fill_polygon(canvas, size, points, color):
    min_y = max(0, min(point[1] for point in points))
    max_y = min(size - 1, max(point[1] for point in points))
    for y in range(min_y, max_y + 1):
        crossings = []
        for index, (x1, y1) in enumerate(points):
            x2, y2 = points[(index + 1) % len(points)]
            if (y1 <= y < y2) or (y2 <= y < y1):
                crossings.append(round(x1 + (y - y1) * (x2 - x1) / (y2 - y1)))
        crossings.sort()
        for index in range(0, len(crossings), 2):
            if index + 1 == len(crossings):
                continue
            for x in range(max(0, crossings[index]), min(size, crossings[index + 1] + 1)):
                pixel(canvas, size, x, y, color)


def draw_line(canvas, size, start, end, color, thickness):
    x1, y1 = start
    x2, y2 = end
    dx, dy = abs(x2 - x1), abs(y2 - y1)
    sx, sy = (1 if x1 < x2 else -1), (1 if y1 < y2 else -1)
    error = dx - dy
    radius = max(1, thickness // 2)
    while True:
        for oy in range(-radius, radius + 1):
            for ox in range(-radius, radius + 1):
                if ox * ox + oy * oy <= radius * radius:
                    pixel(canvas, size, x1 + ox, y1 + oy, color)
        if x1 == x2 and y1 == y2:
            break
        doubled = 2 * error
        if doubled > -dy:
            error -= dy
            x1 += sx
        if doubled < dx:
            error += dx
            y1 += sy


def polygon_outline(canvas, size, points, color, thickness):
    for index, point in enumerate(points):
        draw_line(
            canvas,
            size,
            point,
            points[(index + 1) % len(points)],
            color,
            thickness,
        )


def circle_outline(canvas, size, center, radius, color, thickness):
    points = [
        (
            round(center[0] + radius * math.cos(angle)),
            round(center[1] + radius * math.sin(angle)),
        )
        for angle in [index * math.pi / 128 for index in range(257)]
    ]
    for start, end in zip(points, points[1:]):
        draw_line(canvas, size, start, end, color, thickness)


def draw_book(size, canvas, page_color, detail_color, outline_color):
    left = [
        (round(size * 0.19), round(size * 0.34)),
        (round(size * 0.49), round(size * 0.42)),
        (round(size * 0.49), round(size * 0.73)),
        (round(size * 0.19), round(size * 0.65)),
    ]
    right = [
        (round(size * 0.51), round(size * 0.42)),
        (round(size * 0.81), round(size * 0.34)),
        (round(size * 0.81), round(size * 0.65)),
        (round(size * 0.51), round(size * 0.73)),
    ]
    fill_polygon(canvas, size, left, page_color)
    fill_polygon(canvas, size, right, page_color)
    polygon_outline(canvas, size, left, outline_color, max(4, size // 80))
    polygon_outline(canvas, size, right, outline_color, max(4, size // 80))
    draw_line(
        canvas,
        size,
        (round(size * 0.5), round(size * 0.43)),
        (round(size * 0.5), round(size * 0.73)),
        outline_color,
        max(4, size // 75),
    )
    for offset in (0.49, 0.55, 0.61):
        draw_line(
            canvas,
            size,
            (round(size * 0.26), round(size * offset)),
            (round(size * 0.43), round(size * (offset + 0.045))),
            detail_color,
            max(3, size // 125),
        )
        draw_line(
            canvas,
            size,
            (round(size * 0.57), round(size * (offset + 0.045))),
            (round(size * 0.74), round(size * offset)),
            detail_color,
            max(3, size // 125),
        )


def png_chunk(kind, data):
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_png(path, size, canvas):
    rows = b"".join(
        b"\x00" + canvas[y * size * 4 : (y + 1) * size * 4]
        for y in range(size)
    )
    png = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">2I5B", size, size, 8, 6, 0, 0, 0))
        + png_chunk(b"IDAT", zlib.compress(rows, 9))
        + png_chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def make_mark(size, page_color, detail_color, outline_color):
    canvas = blank(size, TRANSPARENT)
    draw_book(size, canvas, page_color, detail_color, outline_color)
    return canvas


def main():
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    icon = blank(1024, OLIVE)
    circle_outline(icon, 1024, (512, 512), 424, GOLD, 8)
    draw_book(1024, icon, PAPER, OLIVE_DARK, GOLD)
    write_png(IMAGE_DIR / "icon.png", 1024, icon)

    foreground = make_mark(1024, PAPER, OLIVE_DARK, GOLD)
    write_png(IMAGE_DIR / "android-icon-foreground.png", 1024, foreground)

    monochrome = make_mark(1024, (255, 255, 255, 255), (255, 255, 255, 255), (255, 255, 255, 255))
    write_png(IMAGE_DIR / "android-icon-monochrome.png", 1024, monochrome)

    background = blank(1024, OLIVE)
    write_png(IMAGE_DIR / "android-icon-background.png", 1024, background)

    splash = make_mark(512, OLIVE_DARK, GOLD, OLIVE)
    write_png(IMAGE_DIR / "splash-icon.png", 512, splash)

    favicon = blank(256, OLIVE)
    draw_book(256, favicon, PAPER, OLIVE_DARK, GOLD)
    write_png(IMAGE_DIR / "favicon.png", 256, favicon)

    public_dir = ROOT / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        public_icon = blank(size, OLIVE)
        draw_book(size, public_icon, PAPER, OLIVE_DARK, GOLD)
        write_png(public_dir / f"icon-{size}.png", size, public_icon)


if __name__ == "__main__":
    main()
