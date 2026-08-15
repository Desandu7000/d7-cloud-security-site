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

- **Command-Line Interface & Routing**: Lightweight custom routing in JavaScript that parses user commands, supports aliases, and manages screen transitions.
- **Dynamic Typewriter Presentation**: Sequential text rendering for headings and paragraphs with an instant-skip option (`[Esc]` key or click).
- **Procedural Canvas Visualizations**: Canvas-based background animations representing the security concepts (falling data fragments, access scanning waves, and infection network graphs).
- **Synthesized Audio (Web Audio API)**: Real-time procedural keyboard click sounds generated via filtered noise bursts without requiring external audio media files (includes mute/unmute control).
- **Desktop Optimization & Error Handling**: Designed for desktop/laptop displays. Viewports under 768px display a styled resolution notice (`viewport_error.log`).
- **Accessibility & Motion Consideration**: Supports `prefers-reduced-motion` media queries by bypassing animations and rendering static layouts.

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

*Tip: Pressing `[Esc]` returns to the console or skips in-progress typing animations.*

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
