# 📦 Bazar User - Play Store Release Details

Use this file to store all the specific details, credentials, and app listings required for publishing the application. 

> [!WARNING]
> This file contains sensitive fields (like keystore passwords). Ensure this directory `play_store_release/` is added to your `.gitignore` if you are using a public repository!

---

## 🆔 App & Package Information
* **Application ID / Package Name**: `com.bbhc.bazar.user`
* **Version Name**: `1.0.0`
* **Version Code**: `1`

---

## 🔑 Keystore & Signing Credentials
Keep track of your keystore details here.
* **Keystore Filename**: `upload-keystore.jks` *(Place a backup in `play_store_release/backup/`)*
* **Alias Name**: `upload`
* **Store Password**: `[Enter store password here]`
* **Key Password**: `[Enter key password here]`

---

## 📝 Google Play Store Listing Information

### 🏷️ App Title (Max 30 characters)
```text
Bazar User
```

### 📄 Short Description (Max 80 characters)
```text
Shop for your daily essentials and quality products online at Bazar.
```

### 📑 Full Description (Max 4000 characters)
```text
Welcome to Bazar, your ultimate online marketplace for daily essentials, fresh goods, and quality products. Browse multiple categories, order seamlessly, and enjoy fast deliveries directly to your doorstep.

Key Features:
- Easy browse & search options
- Secure payment gateway integration
- Live tracking of orders
- Profile and order history management
```

---

## 📁 Release Folder Structure Guide
Organize your deployment assets inside this directory as follows:

```text
play_store_release/
├── release_details.md          <-- (This file: Contains descriptions, IDs, & credentials)
├── assets/                     <-- (Place store-listing graphics here)
│   ├── app_icon_512.png        <-- 512x512 PNG app icon
│   ├── feature_graphic.png     <-- 1024x500 PNG promo graphic
│   ├── phone_screenshots/      <-- 2 to 8 phone screenshots
│   └── tablet_screenshots/     <-- 2 to 8 tablet screenshots
├── bundle/                     <-- (Place compiled binaries here)
│   └── app-release.aab         <-- Copy of your build/app/outputs/bundle/release/app-release.aab
└── backup/
    └── upload-keystore.jks     <-- Safe backup of your signing key
```

---

## 👥 Closed Testing (20 Testers List)
List the email addresses of your 20 testers below to track their participation:

1. `tester1@gmail.com`
2. `tester2@gmail.com`
3. `tester3@gmail.com`
...
20. `tester20@gmail.com`
