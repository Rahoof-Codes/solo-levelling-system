<div align="center">

# ⚔️ SOLO LEVELLING SYSTEM
### Real-Life RPG Fitness & Habit Tracking Application

[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-v57.0-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Offline_First-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-00F0FF?style=for-the-badge)](./LICENSE)

<br />

> **[ SYSTEM NOTIFICATION ]**  
> *"You have been selected as a Player. Complete your daily quests, train your stats, and awaken your true potential."*

<br />

</div>

---

## 🌟 Overview

**Solo Levelling System** is an offline-first, gamified fitness and self-improvement mobile application inspired by the iconic *Solo Leveling* anime and webtoon. Transform your real-world workouts, daily habits, and physical training into character levels, attribute points, hunter rank upgrades, and legendary rewards.

Built with **React Native**, **Expo SDK 57**, **TypeScript**, and an **offline-first SQLite architecture** with cloud backup via **Firebase Firestore**.

---

## ✨ Core Features

### 🗡️ 1. Hunter Status & Attributes
- **RPG Stat System**: Distribute points into **STR** (Strength), **AGI** (Agility), **VIT** (Vitality), **INT** (Intelligence), and **PER** (Perception).
- **Dynamic Leveling & XP**: Earn experience points from logged workouts and completed daily quests.
- **Hunter Rank Progression**: Climb the ranks from **E-Rank ➔ D-Rank ➔ C-Rank ➔ B-Rank ➔ A-Rank ➔ S-Rank ➔ National Level / Shadow Monarch**.
- **Hunter License Card**: Customized Hunter ID card with your current status, title, and avatar.

### 📜 2. Daily Quests & Penalty Zone
- **The System's Daily Quest**: Complete the iconic regiment:
  - 🏃 10 km Run / Jog
  - 💪 100 Push-ups
  - 🧘 100 Sit-ups
  - 🏋️ 100 Squats
- **Custom Quests**: Create personalized custom quests with custom target sets, reps, and XP bounties.
- **Streak & Penalty Mechanic**: Maintain your daily streak to receive XP multipliers and avoid the dreaded Penalty Zone.

### ⚡ 3. Mana & Recovery System
- **Mana Bar HUD**: Manage your hunter's daily energy reserve.
- **Mana Replenishment Modal**: Meditate and recover mana to activate status perks and training buffs.

### 🏋️ 4. Workout Logging & MET Calorie Engine
- **Metabolic Equivalent of Task (MET)**: Real-time calorie burn calculation tailored to your body weight, workout type, duration, and intensity.
- **Multi-Category Tracking**: Strength training, cardio, calisthenics, flexibility, and custom exercises.
- **Detailed History & Timers**: Track sets, reps, weights, pace, and time elapsed.

### 📊 5. Analytics & Progress Hub
- **Activity Feed**: Comprehensive visual logs of every session.
- **Streak Tracker**: Monitor consistency over 7-day, 30-day, and all-time intervals.
- **Stat Distribution Charts**: Visualize your character build balance over time.

### 🛡️ 6. Offline-First & Cloud Sync
- **Zero-Latency Offline Mode**: Full app functionality powered locally by **Expo SQLite**.
- **Firebase Cloud Backup**: Sync your profile, quests, and workout logs across devices seamlessly.
- **Authentication**: Sign in with **Google** or continue instantly in **Guest Mode**.

### 🌌 7. Dark Neon Cyber Aesthetics
- Immersive blue/cyan glowing HUD with glassmorphic cards.
- Fluid micro-interactions and animations powered by `react-native-reanimated`.

---

## 📱 App Preview

| Hunter Status | Daily Quests | Workout Log | Profile & Sync |
|:---:|:---:|:---:|:---:|
| <img src="./assets/images/logo-glow.png" width="180" alt="Status" /> | <img src="./assets/images/ranks/rank-s.png" width="180" alt="Quests" /> | <img src="./assets/images/splash-icon.png" width="180" alt="Workout Log" /> | <img src="./assets/images/ranks/rank-a.png" width="180" alt="Profile" /> |

---

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) (v0.86) with [Expo](https://expo.dev/) (SDK 57)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Local Database**: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (Offline-first storage)
- **Backend & Auth**: [Firebase](https://firebase.google.com/) (Firestore & Firebase Auth) + Google Sign-In
- **Animations & UI**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/), [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- **Styling**: Vanilla CSS & responsive StyleSheet with neon glassmorphism tokens

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) app on your mobile device (or an Android Emulator / iOS Simulator)

### 1. Clone the Repository
```bash
git clone https://github.com/Rahoof-Codes/solo-levelling-system.git
cd solo-levelling-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```
Fill in your Firebase credentials in `.env`:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
```

> **Note**: The app works 100% offline in Guest Mode with local SQLite even without Firebase configured.

### 4. Setup Android Google Services (Optional for Google Sign-In)
Place your `google-services.json` in the root folder (see [`google-services.json.example`](./google-services.json.example)).

### 5. Start the Development Server
```bash
npx expo start
```
Scan the QR code with your **Expo Go** app on Android/iOS, or press:
- `a` to run on Android Emulator / connected device
- `i` to run on iOS Simulator
- `w` to run on Web Browser

---

## 📂 Project Structure

```
SOLO/
├── assets/                  # Icons, rank badges, splash screens, graphics
│   └── images/
│       └── ranks/           # E, D, C, B, A, S rank emblems
├── src/
│   ├── app/                 # Expo Router pages & tab layouts
│   │   ├── (tabs)/          # Main tabs: Status, Quests, Log, Activity, Profile
│   │   ├── _layout.tsx      # Root app navigation layout
│   │   └── modal.tsx        # System modal screens
│   ├── components/          # Reusable UI components & modals
│   │   ├── status/          # Hunter attributes, streak card, status HUD
│   │   ├── xp-claim-modal.tsx
│   │   └── mana-replenish-modal.tsx
│   ├── constants/           # Colors, rank images, theme tokens
│   ├── contexts/            # React Contexts (AuthContext, ThemeContext)
│   ├── db/                  # SQLite schema, migrations, and operations
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Firebase client, Auth handlers, MET calculators
│   └── types/               # TypeScript interfaces and models
├── .env.example             # Example environment variables template
├── google-services.json.example
├── app.json                 # Expo configuration
├── package.json
└── tsconfig.json
```

---

## 🧪 Development & Quality Checks

Run the TypeScript type checker:
```bash
npm run typecheck
```

Run ESLint:
```bash
npm run lint
```

---

## 📦 Building Standalone APK (Android)

To generate a standalone APK or AAB build using EAS:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to Expo:
   ```bash
   eas login
   ```
3. Build for Android:
   ```bash
   eas build --platform android --profile preview
   ```

Or run a local prebuild:
```bash
npx expo run:android
```

---

## 🤝 Contributing

Contributions, feature suggestions, and pull requests are welcome!

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/EpicFeature`)
3. **Commit your Changes** (`git commit -m 'Add some EpicFeature'`)
4. **Push to the Branch** (`git push origin feature/EpicFeature`)
5. **Open a Pull Request**

Please check our [Bug Report](./.github/ISSUE_TEMPLATE/bug_report.md) or [Feature Request](./.github/ISSUE_TEMPLATE/feature_request.md) templates when submitting issues.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

---

<div align="center">

**⚔️ ARISE AND CONQUER YOUR FITNESS GOALS ⚔️**

Made with ❤️ by [Abdul](https://github.com/Rahoof-Codes)

</div>
