# Firebase Setup Guide for SOLO

SOLO uses an **Offline-First** architecture:
- All data is read and written directly to the local **Expo SQLite** database for 0ms latency and 100% offline functionality.
- When connected and configured, **Firebase Cloud Firestore** acts as the remote cloud backup and synchronization backend.

---

## Quick Setup Steps

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and follow the prompts.

### 2. Add a Web App to Your Project
1. In project overview, click the **Web (`</>`)** icon to register a web app.
2. Name it `SOLO-App` and click **Register app**.
3. Copy the `firebaseConfig` keys.

### 3. Create Cloud Firestore Database
1. In the left navigation, click **Build > Firestore Database**.
2. Click **Create Database**.
3. Choose your database location and select **Start in test mode** (or apply the rules from `firebase/firestore.rules`).
4. Click **Create**.

### 4. Configure Environment Variables
Create a `.env` file in the root of the project (copy from `.env.example`):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...
```

### 5. Collections
The sync engine will automatically create documents inside the following Firestore collections:
- `profiles`
- `quests`
- `quest_logs`
- `workout_plans`
- `workouts`
- `workout_logs`
- `meals`
- `activities`
- `stats_history`
- `streaks`

### 6. Security Rules
Deploy or paste the contents of `firebase/firestore.rules` into **Firestore Database > Rules** tab.
