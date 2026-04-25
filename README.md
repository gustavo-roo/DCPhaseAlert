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

## 📄 License
This project is licensed under the Apache-2.0 License.
