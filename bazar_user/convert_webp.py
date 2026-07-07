from PIL import Image
import os

webp_path = "assets/e-commerce-service_splash-ntive.webp"
png_path = "assets/e-commerce-service_splash-ntive.png"

if os.path.exists(webp_path):
    print(f"Converting {webp_path} to {png_path}...")
    img = Image.open(webp_path)
    img.save(png_path, "PNG")
    print("Success! PNG file created.")
else:
    print(f"Error: {webp_path} not found.")
