# D7 — Cloud Computing and Security Issues

An interactive web report exploring key security threats in cloud computing environments. Built using vanilla HTML, CSS, and JavaScript, the project presents academic research in an engaging retro-terminal format.

Developed for **SCI1125D Professional Science Essentials** at **Edith Cowan College**.

---

## 📌 Project Overview

This project presents an academic analysis of three critical security challenges in cloud computing:
1. **Data Breaches and Exposure** (`data breach`): Analyzing third-party supply chain vulnerabilities (Target 2013 case study) and multi-tenant data leakage risks during transfer and storage.
2. **Identity and Access Management** (`iam`): Examining account hijacking, weak authentication, and stale permissions in dynamic cloud infrastructures.
3. **Malware and Ransomware** (`malware`): Investigating how compromised endpoints disrupt cloud infrastructure (Spark NZ case study) and evaluating collaborative defense models.
4. **Academic References** (`about`): Full APA 7th edition bibliography with linked DOIs and academic citations.

Rather than a static document, the content is delivered through an interactive terminal interface where users enter commands to inspect simulated log files (`data_breach.log`, `iam.log`, `malware.log`, `references.log`).

---

## 🛠️ Technical Features & Implementation

- **Command-Line Interface & Routing**: Custom JavaScript router that parses commands, supports case-insensitive aliases, and manages screen transitions. Features tab-completion, inline ghost text suggestions, and a dynamic measuring caret.
- **Sequential Text Rendering**: Character-by-character typewriter presentation for headings and paragraphs, with reverse erase transitions and instant-skip support (`[Esc]` or click).
- **Procedural Canvas Visualizations**: Lightweight, hardware-accelerated 2D canvas background simulations representing data fragmentation, scanning access grids, and network infection spread.
- **Procedural Web Audio Synthesis**: Real-time synthesized keyboard click feedback via filtered noise bursts using the Web Audio API, eliminating external media asset dependencies.
- **Print Stylesheet**: Dedicated print media styles (`@media print`) rendering a clean, black-and-white academic citation view regardless of the current active screen.
- **Desktop Optimization**: Styled layout tailored for desktop screen viewports, providing a resolution warning notice for smaller displays.
- **Accessibility**: Respects `prefers-reduced-motion` preferences by instantly completing animations and displaying static views.

---

## 🚀 How to Run the Project

The application requires no external frameworks, dependencies, or build tools. It runs directly in any modern desktop web browser.

### Option 1: Direct File Access
Clone the repository and open `index.html`:
```bash
git clone https://github.com/Desandu7000/d7-cloud-security-site.git
cd d7-cloud-security-site
start index.html
```

### Option 2: Local HTTP Server
Run a local development server using Python:
```bash
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser.

---

## ⌨️ Console Navigation

| Command | Accepted Aliases | Function |
|---|---|---|
| `data breach` | `databreach`, `breach` | View Data Breach analysis (`data_breach.log`) |
| `iam` | `identity and access management`, `identity access management` | View IAM analysis (`iam.log`) |
| `malware` | `ransomware`, `malware and ransomware` | View Malware/Ransomware analysis (`malware.log`) |
| `about` | `references`, `refs`, `reference` | View APA7 References & Author details (`references.log`) |
| `back` | `console`, `home`, `exit`, `menu` | Return to main command console |
| `help` | `?`, `commands` | Lists the available commands |

*Tips: `[Esc]` returns to the console (press again mid-transition to skip the closing animation). `[Tab]` autocompletes a partial command. Clicking a page's text while it's typing in reveals it instantly.*

---

## 📁 Repository Structure

```
d7-cloud-security-site/
├── assets/
│   ├── favicon.svg      # Favicon
│   └── logo.jpg         # Project logo
├── index.html           # Main semantic HTML structure & screen markup
├── styles.css           # Styling, design tokens, layout & CRT visual effects
├── script.js            # Router, typewriter engine, Web Audio synth & canvas FX
├── .gitignore           # Git ignore rules
└── README.md            # Project documentation
```

---

## 👤 Academic Details

- **Student Name:** Desandu Hettiarachchi
- **Student ID:** 74007597
- **Institution:** Edith Cowan College
- **Course / Unit:** SCI1125D Professional Science Essentials
- **Profiles:** [LinkedIn](https://www.linkedin.com/in/desanduthettiarachchi/) &bull; [GitHub](https://github.com/Desandu7000)
