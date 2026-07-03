# 🚀 Google Play Store Deployment Checklist for Flutter

This checklist guides you step-by-step through the requirements, configurations, and steps necessary to publish the **Bazar User** Flutter app to the Google Play Store.

---

## 📋 Table of Contents
1. [Developer Account Setup](#1-developer-account-setup)
2. [App Metadata & Store Listing Assets](#2-app-metadata--store-listing-assets)
3. [Legal, Privacy, & Policy Requirements](#3-legal-privacy--policy-requirements)
4. [App Code Configurations](#4-app-code-configurations)
5. [Signing Config Setup (Kotlin DSL Specific)](#5-signing-config-setup-kotlin-dsl-specific)
6. [Building & Uploading the App Bundle](#6-building--uploading-the-app-bundle)
7. [Release Tracks & Tester Requirements (20-Tester Rule)](#7-release-tracks--tester-requirements-20-tester-rule)

---

## 1. Developer Account Setup
To publish apps on Google Play, you need a Google Play Console developer account.

- [ ] **Create Account**: Register at [Google Play Console](https://play.google.com/console/signup).
- [ ] **Registration Fee**: Pay the one-time registration fee of **$25 USD**.
- [ ] **Verify Identity**: Provide official identification (government ID) and verification details to complete your registration.
- [ ] **Set Up Payments Profile**: (Optional) If you plan to sell paid apps or offer in-app purchases, set up a merchant account.

---

## 2. App Metadata & Store Listing Assets
Prepare these visual assets and texts before creating your store listing.

### 📝 Text Assets
- [ ] **App Name**: Max 30 characters.
- [ ] **Short Description**: Max 80 characters.
- [ ] **Full Description**: Max 4000 characters.

### 🖼️ Graphic Assets
- [ ] **App Icon**: 
  - Format: 32-bit PNG (with alpha/transparency allowed, but non-transparent is recommended).
  - Size: **512px x 512px**.
  - Maximum file size: 1024KB.
- [ ] **Feature Graphic**: 
  - Format: PNG or JPEG.
  - Size: **1024px x 500px**.
  - Used for promotions across Google Play.
- [ ] **Screenshots**:
  - Format: PNG or JPEG (no alpha).
  - Quantity: Minimum of 2 screenshots (maximum 8 per device type).
  - Aspect ratio: 16:9 or 9:16.
  - Required sizes:
    - **Phone**: Sides between 320px and 3840px.
    - **7-inch tablet**: Minimum 320px to 3840px.
    - **10-inch tablet**: Minimum 320px to 3840px.

---

## 3. Legal, Privacy, & Policy Requirements
Google enforces strict privacy and safety guidelines.

- [ ] **Privacy Policy URL**: Host a privacy policy page on your website and provide the link.
- [ ] **Data Safety Questionnaire**: Complete this in the Play Console. You must disclose what user data you collect (e.g., location, email, name, app usage) and how it is processed/shared.
- [ ] **App Access Details**: If your app requires login (e.g., username/password), you **must** provide functional test credentials in the Play Console so Google reviewers can log in.
- [ ] **Target Audience & Content**: Specify age groups (e.g., 13+) and fill out the Content Rating questionnaire (IARC).
- [ ] **Financial / News / Health Declaration**: Declare if your app falls into restricted categories.

---

## 4. App Code Configurations

Before building, verify and update the following configuration files:

### 🆔 1. Unique Application ID
The current ID in your [build.gradle.kts](file:///e:/BBHC_BAZAR/bazar_user/android/app/build.gradle.kts#L20) is `com.example.bazar_user`. Google Play does not accept apps containing `com.example`.
- [ ] Change `applicationId` to a unique reverse-domain identifier (e.g., `com.bbhc.bazar.user`):
  - In [build.gradle.kts](file:///e:/BBHC_BAZAR/bazar_user/android/app/build.gradle.kts#L20):
    ```kotlin
    applicationId = "com.bbhc.bazar.user"
    ```
  - In [AndroidManifest.xml](file:///e:/BBHC_BAZAR/bazar_user/android/app/src/main/AndroidManifest.xml) (package name).

### 🏷️ 2. App Versioning
- [ ] Update version info in [pubspec.yaml](file:///e:/BBHC_BAZAR/bazar_user/pubspec.yaml):
  ```yaml
  version: 1.0.0+1
  ```
  * `1.0.0` is the **Version Name** (visible to users).
  * `1` is the **Version Code** (internal to Google Play, must be incremented with every new release/build).

### 🛡️ 3. Launcher Icon
- [ ] Ensure you have custom launcher icons instead of default Flutter icons. 
  *(Tip: Use the `flutter_launcher_icons` package to generate these automatically).*

---

## 5. Signing Config Setup (Kotlin DSL Specific)
Google Play requires all release apps to be digitally signed. Because your project uses **Kotlin DSL** (`build.gradle.kts`), follow these steps precisely:

### Step A: Generate an Upload Keystore
Run the following command in your terminal to generate a secure keystore file. 

> [!WARNING]
> Keep the keystore file secure and backup passwords. If you lose them, you will not be able to update your app!

- **On Windows (PowerShell/CMD):**
  ```cmd
  keytool -genkey -v -keystore %userprofile%\upload-keystore.jks -storetype RSA -keyalg RSA -keysize 2048 -validity 10000 -alias upload
  ```
- **On macOS/Linux:**
  ```bash
  keytool -genkey -v -keystore $HOME/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
  ```

### Step B: Reference Keystore in App
1. Move the generated `upload-keystore.jks` file into the `bazar_user/android/app/` folder.
2. Create a new file named `key.properties` in the `bazar_user/android/` folder.
3. Add the following credentials to `bazar_user/android/key.properties`:
   ```properties
   storePassword=<your-store-password>
   keyPassword=<your-key-password>
   keyAlias=upload
   storeFile=upload-keystore.jks
   ```
   *(Ensure to add `key.properties` to your `.gitignore` to avoid pushing secrets to GitHub)*.

### Step C: Configure Signing in `build.gradle.kts`
Modify your [build.gradle.kts](file:///e:/BBHC_BAZAR/bazar_user/android/app/build.gradle.kts) to parse `key.properties` and sign the release build.

Replace the `android { ... }` block in [build.gradle.kts](file:///e:/BBHC_BAZAR/bazar_user/android/app/build.gradle.kts) with:

```kotlin
import java.util.Properties
import java.io.FileInputStream

// Load keystore properties
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.bbhc.bazar.user" // Remember to update this
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.bbhc.bazar.user" // Remember to update this
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = keystoreProperties["storeFile"]?.let { file(it) }
            storePassword = keystoreProperties["storePassword"] as String
        }
    }

    buildTypes {
        release {
            // Apply release signing configurations
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

---

## 6. Building & Uploading the App Bundle
Google Play now requires **Android App Bundles (.aab)** instead of APKs.

- [ ] **Clean Project**:
  ```bash
  flutter clean
  flutter pub get
  ```
- [ ] **Build App Bundle**:
  ```bash
  flutter build appbundle --release
  ```
  Your compiled bundle will be located at:
  `bazar_user/build/app/outputs/bundle/release/app-release.aab`

---

## 7. Release Tracks & Tester Requirements

For newly registered personal Google Play developer accounts, Google has introduced a testing requirement before you can release your app to production:

- [ ] **20 Testers Rule (Closed Testing)**:
  - You must run a closed testing track with at least **20 testers**.
  - Testers must be opted-in for at least **14 days continuously**.
  - They must have the app installed on their devices.
- [ ] **Production Release**:
  - Once the closed testing criteria are met, you can apply for Production access in the Google Play Console, which will go through a review phase before being listed publicly.
