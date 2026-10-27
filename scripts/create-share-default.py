"""Regenerate the original, local OG asset. Optional authoring tool; not a build dependency."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

target = Path(__file__).resolve().parents[1] / "public" / "shared" / "share-default.png"
image = Image.new("RGB", (1200, 630), "#f4f0e5")
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((42, 42, 1158, 588), radius=24, fill="#fffdf7", outline="#d8ddce", width=2)
draw.rounded_rectangle((42, 42, 1158, 182), radius=24, fill="#294f40")
draw.rectangle((42, 140, 1158, 182), fill="#294f40")
font_path = Path("C:/Windows/Fonts/malgun.ttf")
bold_path = Path("C:/Windows/Fonts/malgunbd.ttf")
title_font = ImageFont.truetype(str(bold_path), 62)
body_font = ImageFont.truetype(str(font_path), 28)
brand_font = ImageFont.truetype(str(bold_path), 31)
draw.text((90, 90), "SEUNG AI LABS", fill="#fffdf7", font=brand_font)
draw.text((90, 254), "AI 교육 브리핑", fill="#233e35", font=title_font)
draw.text((94, 365), "뉴스 한 건 · 요약과 출처를 함께", fill="#647366", font=body_font)
draw.line((94, 463, 1106, 463), fill="#d8ddce", width=2)
draw.text((94, 502), "Seung AI Labs", fill="#294f40", font=body_font)
target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, optimize=True)
print(f"OG image: {image.width} x {image.height}")
