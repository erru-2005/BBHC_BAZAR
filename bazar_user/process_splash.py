from PIL import Image
import numpy as np

# Load original WebP image
img_path = "assets/e-commerce-service_splash-ntive.webp"
img = Image.open(img_path).convert("RGBA")
data = np.array(img)

# Dimensions
height, width, _ = data.shape
print(f"Original dimensions: {width}x{height}")

# We want to make the purple background transparent.
# Let's define the purple background range:
# The background is a gradient of purples around R: 90-130, G: 80-120, B: 230-255.
# Let's inspect the top-left pixel to get the base background color.
base_r, base_g, base_b, _ = data[10, 10]
print(f"Base background color: ({base_r}, {base_g}, {base_b})")

# Let's create a mask for the background pixels.
# We will match pixels that are close to the background color.
# We'll use a color distance threshold to handle the gradient.
r = data[:, :, 0].astype(float)
g = data[:, :, 1].astype(float)
b = data[:, :, 2].astype(float)

# Purple background has high blue, moderate red and green.
# Let's check distance to the base color, or check if blue is dominant and red/green are in typical ranges.
dist = np.sqrt((r - base_r)**2 + (g - base_g)**2 + (b - base_b)**2)

# Threshold for background color distance (adjust if needed to remove all purple)
threshold = 65
background_mask = dist < threshold

# Apply transparency
data[background_mask, 3] = 0

# Now let's crop the image to keep only the central shopping illustration.
# Let's find the bounding box of non-transparent pixels to crop tightly!
non_empty_indices = np.where(data[:, :, 3] > 0)
min_y, max_y = np.min(non_empty_indices[0]), np.max(non_empty_indices[0])
min_x, max_x = np.min(non_empty_indices[1]), np.max(non_empty_indices[1])

print(f"Bounding box: X({min_x} to {max_x}), Y({min_y} to {max_y})")

# Let's crop it with a small margin (e.g. 10 pixels)
margin = 15
min_y = max(0, min_y - margin)
max_y = min(height, max_y + margin)
min_x = max(0, min_x - margin)
max_x = min(width, max_x + margin)

cropped_data = data[min_y:max_y, min_x:max_x]

# To prevent Android from compressing it vertically/horizontally inside the circular mask,
# we should pad the cropped image to be a perfect square!
h, w, _ = cropped_data.shape
size = max(h, w)
square_data = np.zeros((size, size, 4), dtype=np.uint8)

# Center the cropped image inside the square
y_offset = (size - h) // 2
x_offset = (size - w) // 2
square_data[y_offset:y_offset+h, x_offset:x_offset+w] = cropped_data

# Save the final image
output_img = Image.fromarray(square_data, "RGBA")
output_img.save("assets/e-commerce-service_splash-ntive.png", "PNG")
print("Successfully processed and saved assets/e-commerce-service_splash-ntive.png as a transparent square!")
