# Disney Central Phase Alert Dashboard

A real-time, collaborative monitoring tool designed to track and communicate operational statuses across multiple service communities.

## 🚀 Features

- **Real-Time Synchronization:** Shared backend ensures all logged-in users see the same live data instantly.
- **Status Monitoring:** Track 20+ communities with color-coded indicators:
  - 🟢 **Green - Normal**
  - 🟡 **Yellow - Warning**
  - 🔴 **Red - Critical**
- **Staging Tray:** Review and bulk-update multiple status changes before committing them to the live dashboard.
- **Automated Reporting:** Generate professionally formatted status reports for:
  - **Email:** Clean HTML format.
  - **Microsoft Teams:** Adaptive Card and Rich Text formats.
- **Automated Midnight Reset:** Automatically resets all statuses to "Green - Normal" every day at 12:00 AM EST.
- **Secure Access:** ID-based login system to ensure only authorized personnel can view or modify the dashboard.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend:** Node.js, Express.
- **Automation:** `node-cron` for scheduled tasks.

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd disney-phase-alert-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   ```bash
   npm run start
   ```

5. **Access the app:**
   Open your browser and navigate to `http://localhost:3000`.

## 🔑 Configuration

### Adding Users
To add or manage authorized users, edit the `USER_REGISTRY` in `src/types.ts`:
```typescript
export const USER_REGISTRY: Record<string, string> = {
  '12345678': 'John Doe',
  // Add new users here
};
```

### Midnight Reset
The automated reset is configured in `server.ts` and follows the `America/New_York` (EST) timezone.

---

## 🗄️ Database Architecture & Deployment Instructions

This application requires a shared data persistence layer so that all devices, coordinator consoles, and wall-mounted TV monitors stay synchronized in real time.

### Where the Database Logic Lives in Code

1. **Client Initialization & Credentials (`src/firebase.ts` & `firebase-applet-config.json`)**
   - Initializes the Firebase app and Firestore instance:
     ```typescript
     // src/firebase.ts
     import { initializeApp } from 'firebase/app';
     import { getFirestore } from 'firebase/firestore';
     import firebaseConfig from '../firebase-applet-config.json';

     const app = initializeApp(firebaseConfig);
     export const db = getFirestore(app);
     ```
   - `firebase-applet-config.json` stores the project credentials (`projectId`, `apiKey`, `authDomain`, `appId`).

2. **Real-Time Synchronization & Reads (`src/App.tsx`)**
   - Sets up a real-time snapshot listener on the `communities` collection:
     ```typescript
     const unsub = onSnapshot(collection(db, 'communities'), (snapshot) => {
       // Receives live updates whenever any user changes a status
     });
     ```

3. **Status Mutations & Writes (`src/App.tsx`)**
   - Direct document write operations updating individual communities:
     ```typescript
     await setDoc(doc(db, 'communities', updatedCommunity.id), updatedCommunity);
     ```

4. **Security & Access Control (`firestore.rules`)**
   - Defines read/write rules for document collections. Review and align this file with your organization's security and data compliance policies.

---

### Internal Deployment Options for IT / Platform Teams

#### Option A: Deploying with Your Organization's Firebase / Google Cloud Project
If your organization provides an internal Google Cloud / Firebase project:
1. Create a Firestore database in your organization's Google Cloud / Firebase console.
2. Replace the credentials in `firebase-applet-config.json` (or supply them via environment variables) with your organization's project config.
3. Deploy the database rules from `firestore.rules`.
4. Deploy the Node/Vite app to your enterprise container platform (e.g., Cloud Run, Kubernetes, AWS ECS, or internal VM).

#### Option B: Adapting to an Internal Enterprise API / SQL Database (Postgres, MySQL, etc.)
If your enterprise environment forbids Firebase and requires an internal backend or SQL database:
1. **API Endpoints:** In `server.ts` (or your backend framework), expose REST or GraphQL endpoints:
   - `GET /api/communities` — returns all current community records.
   - `POST /api/communities/update` — updates a community status and triggers a broadcast.
2. **Real-Time Transport:** Use WebSockets or Server-Sent Events (SSE) so all connected clients receive updates immediately.
3. **Frontend Adjustment:** In `src/App.tsx`:
   - Replace the `onSnapshot(collection(db, 'communities'), ...)` listener with your WebSocket/SSE client.
   - Replace `setDoc(...)` calls in `handleStatusChange`, `updateCommunity`, and `resetUpdates` with `fetch('/api/communities/update', ...)`.

---

## 📄 License
This project is licensed under the Apache-2.0 License.
