# Building your MindGear APK (with real notifications) — from your phone

This folder is a ready-to-build native Android wrapper around your existing
MindGear app. Nothing about the app itself was changed — only two new files
were added (`www/notifications.js` and one `<script>` line in `www/index.html`)
that make real Android notifications work once this is compiled as a native app.

You don't need Android Studio, a laptop, or anything installed. GitHub's
servers do the actual compiling — you just need to get these files into a
GitHub repo and press one button.

---

## Step 1 — Create a GitHub account & repo (2 min)

1. Go to **github.com** in your phone's browser and sign up if you don't have
   an account (it's free).
2. Tap **+** (top right) → **New repository**.
3. Name it `mindgear-app` (or anything). Keep it **Private** if you'd like.
   Leave everything else default. Tap **Create repository**.

## Step 2 — Upload these files into the repo

You have two options — pick whichever is easier:

### Option A — You can get 5 minutes on any desktop/laptop browser
This is much faster. Open your new repo on github.com, click
**Add file → Upload files**, then drag the *entire unzipped folder*
(everything inside this zip) onto the page. GitHub will preserve the folder
structure automatically. Commit the changes. Skip to Step 3.

### Option B — Phone only
GitHub's mobile upload can't take a whole folder at once, so text files and
images are added slightly differently:

**For the text/code files** (`package.json`, `capacitor.config.json`,
`.gitignore`, `.github/workflows/build-apk.yml`, `www/index.html`,
`www/manifest.json`, `www/service-worker.js`, `www/notifications.js`):
1. In your repo, tap **Add file → Create new file**.
2. In the filename box, type the **full path**, e.g. `www/index.html` —
   GitHub creates the `www` folder automatically.
3. Open that file from this project on your phone (e.g. with a text/file app),
   copy its full contents, and paste into GitHub's editor.
4. Tap **Commit changes**. Repeat for each file above, using its exact path
   (including the `.github/workflows/build-apk.yml` one).

**For the icon images** (`www/icons/icon-192.png`, `icon-512.png`,
`apple-touch-icon.png`, `favicon-32.png`, `favicon-16.png`):
1. Tap **Add file → Upload files**.
2. Use your phone's file picker to select all 5 PNGs from the `www/icons`
   folder in this zip (multi-select is fine).
3. After uploading, open each uploaded file in GitHub, tap the pencil
   (rename), and change its path to `www/icons/<filename>.png` so it moves
   into the right folder. Commit each rename.

## Step 3 — Run the build

1. In your repo, tap the **Actions** tab.
2. You should see **"Build MindGear APK"**. Tap it.
3. Tap **Run workflow → Run workflow** (this triggers it manually).
4. Wait 4–8 minutes — you can back out and check later, it runs on GitHub's
   servers, not your phone.
5. Once it shows a green checkmark, open that run, scroll to **Artifacts**,
   and download **MindGear-debug-apk** — it'll be a `.zip` containing your
   `app-debug.apk`.

## Step 4 — Install it

1. Unzip and open `app-debug.apk` on your phone.
2. Android will warn about installing from an unknown source — allow it for
   this file.
3. Install. Open the app once so it can request notification permission —
   **accept it**, or reminders won't fire.

---

## What you'll actually get

- **Timetable** blocks notify daily at their start time — even with the app
  fully closed, no internet needed once scheduled.
- **Birthdays** notify every year on that date at 9:00 AM.
- **Entertainment** items (movies/shows/books/games with a date set) notify
  once, at that date/time.
- **Custom sections** with a date set behave the same way.
- Every time you add, edit, or delete something in the app, reminders are
  automatically re-scheduled to match — no extra step needed.

## Re-building after future app updates

If you ever get an updated `www/index.html` from me, just replace that one
file in the repo (edit it, paste the new contents, commit) and re-run the
workflow from the Actions tab. Everything else stays the same.
