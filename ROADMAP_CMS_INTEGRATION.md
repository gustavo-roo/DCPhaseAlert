# Roadmap: Avaya CMS Supervisor Integration

This document outlines the strategic plan for integrating the Phase Alert Hub with real-time data from CMS Supervisor (Avaya).

## Objective
To transition from a fully manual status update process to a **Semi-Automated Hybrid Model** where:
1.  **Detection is Automated:** The system monitors CMS Skill wait times and updates the dashboard colors automatically.
2.  **Notification is Manual:** A human operator (Forecasting/Deployment) reviews the automated changes and triggers the formal Email/Teams broadcast once they verify the impact.

---

## Technical Architecture

### 1. Data Acquisition (The Bridge)
Avaya CMS data can be extracted using several methods depending on the environment restrictions:
*   **CMS Web API:** (Preferred) RESTful endpoints provided by Avaya to query real-time skill statistics.
*   **ODBC/JDBC Driver:** Direct SQL-like queries against the CMS Informix database.
*   **Terminal Scraping/Reports:** Automated extraction from exported .txt or .cvs reports (least preferred).

### 2. The Watcher (Backend Logic)
A background service (Cron Job) running on the server will:
*   Poll CMS every 30-60 seconds.
*   Fetch `Wait Time (ASA)` or `Oldest Call Waiting` for specific Skill IDs.
*   **Mapping Table:**
    *   Skill 101 -> Associates
    *   Skill 102 -> Specialists
    *   ...etc.

### 3. Threshold Engine
Define configurable logic to transform numbers into colors:
```json
{
  "community": "Associates",
  "thresholds": {
    "yellow": 120, 
    "red": 240   
  }
}
```
*   If Wait Time > 240s -> Set state to `Red - Critical` (Internal only).

---

## User Workflow: The "Verified Publish" Pattern

To ensure we don't spam the distro lists with "flickering" phases, the app will implement a two-stage process:

### Stage 1: The "Suggested" State (Monitor Mode)
*   The dashboard updates in real-time based on CMS wait times.
*   A community that has jumped a threshold will glow or pulse on the administrator's screen to grab attention.
*   The system marks the status as **"Pending Verification"**.

### Stage 2: The "Manual Trigger" (Broadcast)
*   The user clicks a **"Finalize & Send Alert"** button.
*   This action:
    1.  Prompts the user to add optional context (e.g., "Due to high call volume from west coast").
    2.  Sets the state as **OFFICIAL**.
    3.  Triggers the Email and Microsoft Teams API calls.

---

## Implementation Requirements

1.  **Environment Variables:** Add `CMS_API_KEY` and `CMS_ENDPOINT` to `.env`.
2.  **New Schema Fields:** 
    *   `lastCmsValue`: The raw number (seconds) from CMS.
    *   `isAutoDetected`: Boolean flag.
    *   `isVerified`: Boolean flag to distinguish between what the machine thinks vs. what the human sent.
3.  **Backend Socket Updates:** Emit a "CMS_UPDATE" event to all connected dashboards to keep the TV Monitor in sync without page refreshes.

---

## Security Considerations
*   CMS credentials must be stored server-side.
*   API polling must be rate-limited to avoid impact on CMS performance.
