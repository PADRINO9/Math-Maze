# Google Play release readiness — כפלול

Checked: 2026-07-14

## Verified in the repository

- Application ID: `com.kaflul.mathmaze`
- Android App Bundle output: `android/app/build/outputs/bundle/release/app-release.aab`
- `targetSdkVersion` / `compileSdkVersion`: 36; `minSdkVersion`: 24
- Portrait and fullscreen configuration is preserved.
- The release manifest has no dangerous permission and the built debug package declared no app network permission.
- Android backup/device transfer and cleartext traffic are explicitly disabled.
- The AAB contains no `.so` native libraries, so it is not affected by native ELF alignment work for the 16 KB page-size requirement.
- The privacy policy is bundled as `privacy.html` and is linked from the in-game settings screen.
- Release version and signing values can come from ignored `android/keystore.properties`, Gradle properties, or environment variables.
- `pnpm run android:play-bundle` refuses to produce a Play-ready result until all upload-key values are present.

## Required before the first upload

1. Create or obtain the permanent Google Play upload key. Do not commit it.
2. Copy `android/keystore.properties.example` to `android/keystore.properties`, replace every `CHANGE_ME`, and keep `KAFLUL_VERSION_CODE` unique for each upload.
3. Run `pnpm run android:play-bundle`, then verify the output signer before uploading.
4. Enable Play App Signing in Play Console and store the upload key in an approved secret manager/CI secret store.
5. Publish the website and enter its public `privacy.html` URL in Play Console. Confirm the named developer/contact information is legally accurate.
6. Complete Data safety even when declaring no collection. Recheck it if networking, public score submission, analytics, ads, accounts, or new SDKs are added.
7. Declare the real school-age target audience, complete the Families, ads, app-access, and IARC content-rating forms accurately.
8. Add store assets: 512×512 Play icon, 1024×500 feature graphic, and current phone screenshots that match the shipped game.
9. Test the signed Play-generated APK on at least one physical Android phone. Also check Android 15/16 and a large-screen device because fixed portrait behavior can differ on large screens.
10. If the developer account is a personal account created after 2023-11-13, complete the required closed test with at least 12 continuously opted-in testers for 14 days before applying for production access.

## Official references

- [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Android App Bundles and Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)
- [16 KB page-size compatibility](https://developer.android.com/guide/practices/page-sizes)
- [Data safety form](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Families policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- [Preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [New personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
