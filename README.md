# D7 — Cloud Computing and Security Issues

An interactive web report exploring key security threats in cloud computing environments. Built using vanilla HTML, CSS, and JavaScript, the project presents academic research in an engaging retro-terminal format.

Developed for **SCI1125D Professional Science Essentials** at **Edith Cowan College**.

---

## 📌 Project Overview

The site follows a Home → Aspect 1/2/3 → Summary structure, with each page carrying its own topic image and a scroll-driven hero effect:
1. **Home** (`home`): Welcome message, topic infographic, and links into the three aspect pages.
2. **Data Breaches and Exposure** (`data breach`): Bullet-point summary of third-party supply chain vulnerabilities (Target 2013 case study) and multi-tenant data leakage risks, plus a video card.
3. **Identity and Access Management** (`iam`): Bullet-point summary of account hijacking, weak authentication, and stale permissions in dynamic cloud infrastructures.
4. **Malware and Ransomware** (`malware`): Bullet-point summary of how compromised endpoints disrupt cloud infrastructure (Spark NZ case study) and the shared risk profile.
5. **Summary** (`about`): Overview tying the three aspects back to the thesis, followed by the full APA 7th edition reference list with linked DOIs.

The three aspect pages summarise their essay paragraph in bullet points with no in-text citations, per the assignment rubric; citations only appear in the end-text reference list on the Summary page. Content is delivered through an interactive terminal interface where users enter commands to inspect simulated log files (`data_breach.log`, `iam.log`, `malware.log`, `about.log`).

---

## 🛠️ Technical Features & Implementation

- **Command-Line Interface & Routing**: Custom JavaScript router that parses commands, supports case-insensitive aliases, and manages screen transitions. Features tab-completion, inline ghost text suggestions, and a dynamic measuring caret that relocates between the console and a pinned top bar on content pages.
- **Sequential Text Rendering**: Character-by-character typewriter presentation for headings and paragraphs, interleaved in DOM order with whole-block fade-in reveals for markup a typewriter can't type into (bullet lists, the video card, the reference section) — with reverse erase transitions and instant-skip support (`[Esc]` or click).
- **Scroll-Driven Hero Images**: Each page's topic image opens full-size and shrinks into a pinned thumbnail as the page is scrolled, reversing on scroll-up; clicking the image at any time opens a full-screen scrollable lightbox for reading it at full clarity.
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
| `home` | `start`, `welcome`, `index` | View the Home page |
| `data breach` | `databreach`, `breach` | View Data Breach analysis (`data_breach.log`) |
| `iam` | `identity and access management`, `identity access management` | View IAM analysis (`iam.log`) |
| `malware` | `ransomware`, `malware and ransomware` | View Malware/Ransomware analysis (`malware.log`) |
| `about` | `references`, `refs`, `reference`, `summary` | View the Summary page & APA7 references (`about.log`) |
| `back` | `console`, `exit`, `menu` | Return to main command console |
| `help` | `?`, `commands` | Lists the available commands |

*Tips: `[Esc]` returns to the console (press again mid-transition to skip the closing animation). `[Tab]` autocompletes a partial command. Clicking a page's text while it's typing in reveals it instantly.*

---

## 📁 Repository Structure

```
d7-cloud-security-site/
├── assets/
│   ├── web/              # Page hero & topic images (Home, aspect pages, Summary)
│   ├── favicon.svg       # Favicon
│   └── logo.jpg          # Project logo
├── index.html            # Main semantic HTML structure & screen markup
├── styles.css            # Styling, design tokens, layout & CRT visual effects
├── script.js             # Router, typewriter engine, hero scroll effect, Web Audio synth & canvas FX
├── .gitignore            # Git ignore rules
└── README.md             # Project documentation
```

---

## 👤 Academic Details

- **Student Name:** Desandu Hettiarachchi
- **Student ID:** 74007597
- **Institution:** Edith Cowan College
- **Course / Unit:** SCI1125D Professional Science Essentials
- **Profiles:** [LinkedIn](https://www.linkedin.com/in/desanduthettiarachchi/) &bull; [GitHub](https://github.com/Desandu7000)
