# D7 - Cloud Computing and Security Issues

This is my website for the SCI1125D assignment. It's about cloud computing security - specifically data breaches, identity and access management (IAM), and malware/ransomware. I made it look like an old computer terminal because I thought it would be a fun way to present the essay content instead of just a normal-looking webpage.

It's all just HTML, CSS and JavaScript - no frameworks, no libraries, no build tools. Everything is written by hand in the three main files.

Made for **SCI1125D Professional Science Essentials** at **Edith Cowan College**.

---

## What's on the site

The site follows the Home → Aspect 1/2/3 → Summary structure from the assignment rubric. Each page has its own image and a "hero" effect where the image starts big and shrinks up to the top as you scroll.

1. **Home** (`home`) - welcome text, the topic infographic, and links to the three aspect pages.
2. **Data Breach** (`data breach`) - my first essay paragraph, turned into bullet points. Also has a video about the Target data breach.
3. **IAM** (`iam`) - my second essay paragraph as bullet points, about identity and access management problems.
4. **Malware** (`malware`) - my third essay paragraph as bullet points, about malware and ransomware.
5. **Summary** (`about`) - ties the three topics back together, plus my full reference list at the bottom.

The rubric said the three aspect pages shouldn't have in-text references (just bullet points), so all my citations only show up in the reference list on the Summary page.

---

## How it works

- You "navigate" the site by typing commands into a terminal-style input box, kind of like a command line. There's also a `help` command if you forget what to type.
- Text on each page types itself out letter by letter, like it's being typed live. You can click anywhere on the text to skip straight to the end if you don't want to wait.
- Each page has a big image at the top that shrinks and moves up as you scroll down, then the text underneath fades/types in. Clicking the image opens it full-size in a pop-up so you can actually read the infographic properly.
- There's a "glitch" animation on the images when a page opens - it's meant to look like a screen glitching, to fit the terminal theme.
- Typing has a small clicking sound effect (like a keyboard), and there's a switch to turn that on or off, plus a switch to turn off the animations if someone doesn't want all the moving stuff. Both switches are on a "before we start" screen that shows up first, and there's also a `settings` command if you want to change them again later.
- If your browser/OS says you prefer reduced motion, most of this still works the same, since the animation switch is a separate thing you control directly (I did this because a lot of these animations are actually part of the assignment marking, e.g. the infographic scroll effect, so I didn't want them to just silently turn off for some visitors without asking).
- There's a print stylesheet so if you print the page (or print to PDF) from the Summary page it prints my references in a normal, readable black-and-white format instead of the dark terminal colours.
- The site shows a "please use a bigger screen" message if the browser window is too narrow, since I didn't have time to make it fully mobile-friendly.

---

## How to run it

No installs needed, just open it in a browser.

### Option 1: just open the file
```bash
git clone https://github.com/Desandu7000/d7-cloud-security-site.git
cd d7-cloud-security-site
start index.html
```

### Option 2: run a local server
Some things (like the video) work a bit better through a real server instead of opening the file directly:
```bash
python -m http.server 3000
```
Then go to `http://localhost:3000` in your browser.

---

## Commands you can type

| Command | Other words that also work | What it does |
|---|---|---|
| `home` | `start`, `welcome`, `index` | Go to the Home page |
| `data breach` | `databreach`, `breach` | Go to the Data Breach page |
| `iam` | `identity and access management`, `identity access management` | Go to the IAM page |
| `malware` | `ransomware`, `malware and ransomware` | Go to the Malware page |
| `about` | `references`, `refs`, `reference`, `summary` | Go to the Summary page (has my references) |
| `settings` | `options`, `preferences` | Turn the sound/animation switches on or off |
| `back` | `console`, `exit`, `menu` | Go back to the main terminal screen |
| `help` | `?`, `commands` | Shows the list of commands |

Some extra things: pressing `Esc` also takes you back, `Tab` autocompletes whatever you're typing, and clicking on a page while it's typing skips straight to the finished text.

---

## Folder structure

```
d7-cloud-security-site/
├── assets/
│   ├── web/              # the images used on each page
│   ├── favicon.svg       # little tab icon
│   └── logo.jpg          # logo used in the corner
├── index.html            # all the page content/structure
├── styles.css            # all the colours, fonts, layout, animations
├── script.js             # everything that makes the site actually work (commands, typing effect, etc.)
├── .gitignore
├── LICENSE                # see below
└── README.md
```

---

## License

This is public so it can be looked at, not so it can be copied. See [LICENSE](LICENSE) for the full terms, but the short version is: you're welcome to read it, but please don't submit this (or a changed version of it) as your own assignment, and if it inspires something of yours, credit me and link back here.

---

## About me

- **Name:** Desandu Hettiarachchi
- **Student ID:** 74007597
- **Institution:** Edith Cowan College
- **Course/Unit:** SCI1125D Professional Science Essentials
- **Links:** [LinkedIn](https://www.linkedin.com/in/desanduthettiarachchi/) · [GitHub](https://github.com/Desandu7000)
