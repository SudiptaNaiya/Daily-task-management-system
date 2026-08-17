# DayPulse - Daily Work Schedule & Routine OS

> A production-grade daily work schedule & routine tracking web application. Features dedicated column-based task boards, automatic daily midnight status resets, exact timestamp recording, authentic Google Identity Services (GIS) OAuth, missed task blocker archiving, and 100% automatic target-time background notifications.

![DayPulse Routine OS](https://img.shields.io/badge/License-MIT-black.svg)
![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JavaScript%20(ES6+)-000000.svg)

---

## 🌟 Key Features

1. **Dedicated Daily Task Columns**:
   - Every daily task (e.g., *Meal*, *Deep Work*, *Gym*, *Evening Review*) is represented as an interactive board column card with target schedule times.

2. **Exact Timestamp Recording**:
   - Clicking **Mark Complete** records the exact timestamp (`YYYY-MM-DD HH:mm:ss`) down to the second in a permanent audit log.

3. **Automated Daily Midnight Reset**:
   - Every day at midnight, task column statuses automatically reset back to `Pending` so you can track your routine fresh every morning.
   - Includes a **Time Travel Test Mode** banner to test date transitions (+1 Day).

4. **100% Automatic Target Time Notifications**:
   - Monitors clock time against target schedule times.
   - Automatically triggers Web Desktop Push Notifications, audio bell chimes, and header bell dropdown alerts for **unfinished / pending tasks** as soon as target times arrive.

5. **Missed Task Blocker & Reason Log**:
   - Option to log reasons/blockers for unfinished tasks.
   - Permanently archived in history logs so you can look back months or years later to review why a task wasn't completed.

6. **Authentic Google OAuth & Security**:
   - Official Google Identity Services (GIS) integration for authentic Google Account sign-in.
   - Isolated local storage per user session.

7. **Minimalist Monochrome Aesthetics**:
   - High-contrast Deep White, Off-White, and Pitch Black visual system.

---

## 📁 Repository Structure

```
daily-routine-tracker/
├── index.html        # Main HTML application layout & Google GSI SDK
├── css/
│   └── styles.css    # Monochromatic design system & CSS variables
├── js/
│   ├── state.js      # Core state manager, daily resets, LocalStorage engine
│   └── app.js        # Main UI controller, Google OAuth & notification engine
├── server.js         # Lightweight Node static dev server
├── package.json      # Node project configuration
├── .gitignore        # Files excluded from git
└── README.md         # Project documentation
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v14 or higher)

### Installation & Launch
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/daypulse-routine-tracker.git
   cd daypulse-routine-tracker
   ```

2. Start the local server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
