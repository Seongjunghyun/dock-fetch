# 🐳 DockFetch

> A Standalone Desktop App for Exploring and Downloading Docker Images

DockFetch is a powerful, beautifully designed Electron application that allows you to search the Docker Hub registry, inspect tags and metadata, and securely download Docker image layers directly as `.tar` files to your local machine—**all without needing the Docker Desktop daemon running.**

## ✨ Key Features

- **Standalone Operation**: Directly fetches image layers via `tar-stream` and packages them into standard `docker load`-ready `.tar` files. No `dockerd` required!
- **Rich Meta Exploration**: Instantly browse repository details, star counts, pull counts, platforms, and specific tag digests.
- **Smart Local Storage Management**: A dedicated `Storage` tab to view, open, and permanently delete your downloaded `.tar` images to manage disk space.
- **Download History & Redownload**: The `Recent` tab tracks all your downloaded images, showing whether the physical file is `Available` or `Missing`. Seamlessly redownload identical tags with an auto-overwrite mechanism.
- **Favorites System**: Bookmark your most used Docker images with a single click. The `Favorites` tab tracks if you already have the image stored locally.
- **Local Docker Integration**: If you *do* have Docker Desktop running, DockFetch can show you your currently installed local images and export them directly to `.tar` files.
- **Beautiful & Customizable UI**: Featuring a modern dark/light mode toggle, squircle action buttons, and drag-and-drop customizable sidebar navigation.

## 🚀 Getting Started

### ⚠️ macOS "App is damaged" Error (Gatekeeper)
Because this is an open-source tool without a paid Apple Developer certificate, macOS Gatekeeper may flag the downloaded `.dmg` or `.app` as "damaged" due to it being unsigned.

**To fix this:**
1. Open the `.dmg` and drag **DockFetch** into your `Applications` folder.
2. Open your terminal and run the following command to remove the quarantine flag:
   ```bash
   sudo xattr -cr /Applications/DockFetch.app
   ```
3. You can now open DockFetch normally from your Launchpad!

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- (Optional) Docker daemon for the "Local Docker" export feature.

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/your-username/dock-fetch.git
cd dock-fetch

# Install dependencies
npm install

# Start the development server and Electron app
npm run dev
```

### Build for Production
```bash
npm run build
```

## 📸 Screenshots

*(Replace these lines with actual image links)*

1. **Search & Details** - Browsing images and selecting specific tags.
2. **Recent History** - Viewing download history with `Available` and `Missing` tracking.
3. **Storage Manager** - Managing physical `.tar` files and quick deletion.

## 🛠 Tech Stack
- **Frontend**: React, Vite, Vanilla CSS, Lucide React Icons
- **Backend/App**: Electron, Node.js

## 📄 License
MIT License
