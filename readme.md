# 🎵 beatbank
### Powered by Tauri, React, & TypeScript

Beatbank is an open-source organizational tool for managing and analyzing audio files. Whether you're a musician or a producer, Beatbank helps you keep your beats organized and accessible, even outside of Rekordbox or a DAW. Plus, it doubles as a cross-platform desktop audio player.

[Visit Our Releases Page For Easy Installation By Clicking Here](https://github.com/parkertonra/beatbank-senior-project/releases)

## ✨ Features

- **🎛️ Table View for Beats**
    - Display all your audio files in a clean, sortable table.

- **📁 Organize Beats into Sets**
    - Plan your upcoming gigs by crafting dynamic setlists from your beat collection.

- **🎶 Audio Playback**
    - Supports playback for `.wav`, `.mp3`, and `.flac` files.
    - Other file types may be supported but may be limited in functionality.

- **💾 Persistent State**
    - All your data is saved across sessions via SQLite, so you never lose your progress.

---

Beatbank is designed to make managing your audio files simple and efficient, all in a beautiful and intuitive interface. Ready to streamline your audio workflow? Give Beatbank a try!

## 🛠️ Building Beatbank

To get started with Beatbank, follow these steps to build the app:

### Prerequisites

Ensure you have the following installed on your system:
- **Node.js** (v16 or later recommended)
- **Rust** (latest stable version)
- **Tauri CLI**: You can install it via Cargo:
  ```bash
  cargo install tauri-cli

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/parkertonra/beatbank.git
   cd beatbank

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Run the Development Server:**
   ```bash
   pnpm tauri dev
   ```
4. ***Optional*: Build for production:**
   ```bash
   pnpm tauri build
   ```
   After the build process completes, a .exe (Windows) or a .dmg (MacOS) or a .deb (Linux) file will be generated in the `src-tauri/target/release` directory of your project.
  

5. **Tests**
    ```bash
   pnpm test
   ```
  
<br/><br/>


Future Enhancements:
- Allow users to star sets to prioritize favs/ones being worked on
- BeatCollection page has multiple tabs / ways to look at the set
- Export sets to use in dj software
- Additional user settings + Dropdown for user settings
- Key Detection (Currently working in open PR for python build)

