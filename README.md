# JCERT Study Buddy AI

A mobile-first Class 9 JCERT study app starter with four study areas: Solve, Notes, Quiz and AI Explainer. The active chapter is shared between tabs and stored in browser local storage. The Gemini key stays on the server.

## 1. Requirements
- Node.js 20 or newer
- A Gemini API key
- For an APK build: a GitHub account (cloud build workflow included) or Android Studio

## 2. Run the web app locally
```bash
npm install
cp .env.example .env
```
Put your Gemini key in the server `.env` file as `GEMINI_API_KEY=...`.

Start the API in one terminal:
```bash
npm run server
```
Start the UI in another terminal:
```bash
npm run dev
```
Open the Vite address shown in the terminal.

## 3. Deploy the API
Deploy the `server` folder / Node app to a trusted HTTPS Node hosting provider. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, and `PORT` as server environment variables. Do not expose the key in frontend code or commit `.env` to GitHub.

Before building the Android app, set `VITE_API_BASE_URL` to your deployed API URL (for example `https://your-api.example.com`). This URL is compiled into the app. Do not use localhost for a real phone APK.

## 4. Build Android APK
On a computer with Android Studio:
```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
Build > Build Bundle(s) / APK(s) > Build APK(s).

### Cloud build using GitHub Actions
1. Create a private GitHub repository and upload this project.
2. In GitHub repository Settings > Secrets and variables > Actions, add a repository variable named `VITE_API_BASE_URL` with your deployed HTTPS API URL.
3. Push the project to GitHub. The workflow `.github/workflows/android-apk.yml` builds a debug APK.
4. Open the Actions tab, open the completed workflow run, and download the `JCERT-Study-Buddy-debug-apk` artifact.

## Current starter limitations
- The PDF parser extracts selectable text. Scanned/image-only PDFs need OCR support, which is a planned improvement.
- The app keeps the extracted chapter text in browser local storage. Very large chapters may exceed device storage limits.
- The Gemini backend is a starter and should be deployed behind HTTPS with rate limiting before public use.
- Quiz score and explanations are shown after checking answers. Add a backend quota/authentication layer before sharing publicly.
