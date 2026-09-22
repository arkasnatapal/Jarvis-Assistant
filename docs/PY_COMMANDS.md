# 🐍 JARVIS Python Desktop & Higher Math Commands Reference (`PY_COMMANDS.md`)

This document details all **100% deterministic, non-AI Python automation & higher engineering mathematics commands** integrated into JARVIS. These commands run natively via Python (`apps/server/scripts/desktop_automation.py` & `apps/server/scripts/math_engine.py`) using NumPy, SymPy, SciPy, Matplotlib, and Windows OS APIs without relying on external LLMs or cloud latency.

---

## 📐 1. Higher Mathematics, Symbolic Calculus & Control Systems Engineering (Non-AI Python Engine)

JARVIS handles advanced engineering and higher mathematics using native Python (`math_engine.py` powered by `numpy`, `sympy`, `scipy`, and `matplotlib`).

### Spoken Speech-to-Text Math Normalizer
JARVIS automatically parses spoken voice math phrases:
- `"by"` / `"over"` / `"divided by"` $\rightarrow$ `/`
- `"plus"` $\rightarrow$ `+`, `"minus"` $\rightarrow$ `-`, `"times"` / `"into"` $\rightarrow$ `*`
- `"a square"` / `"s square"` / `"s squared"` $\rightarrow$ `s**2`
- `"s cube"` / `"s cubed"` $\rightarrow$ `s**3`
- `"2s"` / `"2 s"` $\rightarrow$ `2*s`
- e.g. `"Board plot for 1 by 2s plus 6 plus a square"` $\rightarrow$ **Bode Plot for $H(s) = \frac{1}{s^2 + 2s + 6}$**

| Voice / Text Command | Math Category | Python Action / Output |
| :--- | :--- | :--- |
| `"bode plot for 1 by 2s plus 6 plus a square"` | **Control Systems Bode Plot** | Computes SciPy magnitude & phase curves for $H(s) = \frac{1}{s^2+2s+6}$, saves plot PNG to `Desktop/jarvis_plots`, opens image viewer |
| `"find the root locus of 1 by 2s plus 6 plus a square"` | **Control Systems Root Locus** | Computes s-plane closed loop pole trajectories ($K \to \infty$), plots Open-Loop Poles (X), Open-Loop Zeros (O), Centroid $\sigma_a$, and stability boundary $Re(s)=0$ |
| `"plot step response for 1/s^2+2s+5"` | **Step Response Plot** | Computes step response $H(s) = \frac{1}{s^2+2s+5}$, saves plot PNG, opens image viewer |
| `"integrate sin(x)"` / `"integral of x^2"` | **Symbolic Integration** | `sp.integrate(sin(x), x)` $\rightarrow$ `-cos(x) + C` |
| `"diff x^3"` / `"derivative of cos(x)"` | **Symbolic Differentiation** | `sp.diff(x**3, x)` $\rightarrow$ `3*x**2` |
| `"solve x^2 - 4"` / `"solve 2*x + 5 = 15"` | **Algebraic Solver** | `sp.solve(x**2 - 4, x)` $\rightarrow$ `[-2, 2]` |
| `"matrix det [[1,2],[3,4]]"` | **Matrix Determinant** | `sp.Matrix([[1,2],[3,4]]).det()` $\rightarrow$ `-2` |
| `"matrix inv [[1,2],[3,4]]"` | **Matrix Inverse** | `sp.Matrix([[1,2],[3,4]]).inv()` $\rightarrow$ `[[-2, 1], [1.5, -0.5]]` |
| `"matrix eigenvalues [[1,2],[3,4]]"` | **Eigenvalues & Eigenvectors** | `sp.Matrix.eigenvals()` |
| `"matrix rank [[1,2],[3,4]]"` | **Matrix Rank** | `sp.Matrix.rank()` |
| `"plot sin(x)"` | **2D Function Plotting** | Generates Matplotlib plot, saves PNG to `Desktop/jarvis_plots`, opens image viewer |
| `"calculate 482 * 37"` | **Basic Arithmetic** | Evaluates expressions safely |

---

## 🔄 2. Interactive Follow-up Conversational System

When opening apps or performing math, JARVIS enters a **natural follow-up state**:

1. **Opening Calculator**:
   - **User**: `"Open calculator"`
   - **JARVIS**: `"Opening calculator. What would you like to calculate?"`
2. **Follow-up Math Queries**:
   - **User**: `"integrate sin(x)"`
   - **JARVIS**: `"Integral of sin(x) with respect to x is: -cos(x) + C. What would you like to calculate next?"`
   - **User**: `"find the root locus of 1 by 2s plus 6 plus a square"`
   - **JARVIS**: `"Generated Root Locus for G(s)H(s) = 1/(s^2 + 2s + 6). Open-Loop Poles: [-1.000 + 2.236j, -1.000 - 2.236j], Open-Loop Zeros: [None], Asymptotes: 2, Centroid: -1.000. Saved image to Desktop/jarvis_plots. Opened in image viewer. What would you like to calculate next?"`
3. **Closing & Exit Intent**:
   - **User**: `"ok done"` / `"done"` / `"close"` / `"close calculator"` / `"exit"` / `"go to jarvis"`
   - **JARVIS**: `"Closed calculator. Returning to JARVIS main mode."`

---

## 🎵 3. YouTube & Media Playback Controls

| Voice / Text Command | Action Executed | Python Mechanism |
| :--- | :--- | :--- |
| `"play <song / video name>"` | Searches YouTube via scraping, extracts direct video link & auto-plays in browser | `play_youtube_song(query)` (HTTP request + Regex + `webbrowser`) |
| `"play some good songs"` | Opens top music results on YouTube | `play_youtube_song("popular music songs")` |
| `"change song to <title>"` | Instant playback switch to new YouTube song | `play_youtube_song(new_title)` |
| `"pause song"` / `"pause"` | Toggles system-wide media pause | `VK_MEDIA_PLAY_PAUSE` (`0xB3`) |
| `"resume song"` / `"resume"` | Toggles system-wide media resume | `VK_MEDIA_PLAY_PAUSE` (`0xB3`) |
| `"stop song"` / `"stop"` | Stops active media playback | `VK_MEDIA_STOP` (`0xB2`) |
| `"next song"` / `"skip song"` | Skips to the next video or track | `VK_MEDIA_NEXT_TRACK` (`0xB5`) |
| `"previous song"` / `"prev song"` | Returns to previous track | `VK_MEDIA_PREV_TRACK` (`0xB4`) |
| `"full screen"` / `"fullscreen"` | Toggles video full screen mode | `VK_F` keypress (`0x46`) |
| `"cinema mode"` / `"theater mode"` | Toggles YouTube theater view | `VK_T` keypress (`0x54`) |

---

## 🔊 4. Volume & Audio Controls

| Voice / Text Command | Action Executed | Python Mechanism |
| :--- | :--- | :--- |
| `"mute volume"` / `"mute"` | Mutes/unmutes master volume | `VK_VOLUME_MUTE` (`0xAD`) |
| `"volume up"` / `"increase volume"` | Increases system volume (5 steps) | `VK_VOLUME_UP` (`0xAF`) x 5 |
| `"volume down"` / `"decrease volume"` | Decreases system volume (5 steps) | `VK_VOLUME_DOWN` (`0xAE`) x 5 |

---

## 💻 5. Application Launcher & Process Management

| Voice / Text Command | Target Executable | Python Mechanism |
| :--- | :--- | :--- |
| `"open chrome"` | Google Chrome | `subprocess.Popen("chrome", shell=True)` |
| `"open vscode"` / `"open code"` | VS Code | `subprocess.Popen("code", shell=True)` |
| `"open notepad"` | Windows Notepad | `subprocess.Popen("notepad", shell=True)` |
| `"open calculator"` / `"open calc"` | Windows Calculator | `subprocess.Popen("calc", shell=True)` |
| `"open task manager"` | Task Manager | `subprocess.Popen("taskmgr", shell=True)` |
| `"open spotify"` | Spotify App | `subprocess.Popen("spotify", shell=True)` |
| `"open terminal"` | Windows Terminal | `subprocess.Popen("wt", shell=True)` |
| `"close <app_name>"` | Forces close of target process | `taskkill /f /im <app>.exe` |

---

## 🖥️ 6. System & Window Management

| Voice / Text Command | Action Executed | Python Mechanism |
| :--- | :--- | :--- |
| `"lock pc"` / `"lock screen"` | Instant workstation lock | `ctypes.windll.user32.LockWorkStation()` |
| `"show desktop"` / `"minimize all"` | Toggles Windows Desktop view | `send_key(VK_LWIN)` / Win + D shortcut |

---

## 📁 7. File, Folder & Dictation Notes

| Voice / Text Command | Action Executed | Python Mechanism |
| :--- | :--- | :--- |
| `"open downloads"` | Opens Downloads folder in File Explorer | `subprocess.Popen('explorer "C:\Users\<user>\Downloads"')` |
| `"open documents"` | Opens Documents folder | `subprocess.Popen('explorer "C:\Users\<user>\Documents"')` |
| `"open desktop"` | Opens Desktop folder | `subprocess.Popen('explorer "C:\Users\<user>\Desktop"')` |
| `"organize downloads"` | Categorizes files into `Documents`, `Images`, `Videos`, `Executables`, `Archives` | `shutil.move()` based on extension analysis |
| `"take note <text>"` | Appends timestamped note to `Desktop/jarvis_notes.txt` | File append `open("~/Desktop/jarvis_notes.txt", "a")` |

---

## 🌐 8. Browser & Web Search Automation

| Voice / Text Command | Action Executed | Python Mechanism |
| :--- | :--- | :--- |
| `"google search <query>"` | Opens Google search in default browser | `webbrowser.open("https://google.com/search?q=...")` |
| `"open github"` | Navigates to GitHub | `webbrowser.open("https://github.com")` |
| `"open reddit"` | Navigates to Reddit | `webbrowser.open("https://reddit.com")` |
| `"open whatsapp"` | Navigates to WhatsApp Web | `webbrowser.open("https://web.whatsapp.com")` |
| `"open twitter"` / `"open x"` | Navigates to X / Twitter | `webbrowser.open("https://x.com")` |
| `"google maps <place>"` | Opens location on Google Maps | `webbrowser.open("https://google.com/maps/search/...")` |

---

## ⚡ Direct Command Line (CLI) Usage

```bash
# 1. Spoken Bode Plot
python apps/server/scripts/math_engine.py "Board plot for 1 by 2s plus 6 plus a square"

# 2. Root Locus Computation
python apps/server/scripts/math_engine.py "find the root locus of 1 by 2s plus 6 plus a square"

# 3. Desktop Automations
python apps/server/scripts/desktop_automation.py app open calc
python apps/server/scripts/desktop_automation.py media play "Believer"
```
