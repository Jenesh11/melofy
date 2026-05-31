<div align="center">
  <br />
  <img src="apps/web/public/logo.png" alt="Melofy Logo" width="180" />
  <br />
  <h1>🎵 MELOFY</h1>
  <p><strong>Elevate Your Auditory Experience</strong></p>
  <p><i>A Premium, High-Performance Music Streaming Platform with a Modern Aesthetic.</i></p>

  <br />

  <div align="center">
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri_v2-1.0-FFC107?style=for-the-badge&logo=tauri&logoColor=black" alt="Tauri v2" /></a>
    <a href="https://capacitorjs.com/"><img src="https://img.shields.io/badge/Capacitor-6.0-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" /></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-4.19-333333?style=for-the-badge&logo=express" alt="Express" /></a>
    <a href="https://firebase.google.com/"><img src="https://img.shields.io/badge/Firebase-11.0-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" /></a>
    <a href="https://nodelink.js.org/"><img src="https://img.shields.io/badge/NodeLink-v3-111111?style=for-the-badge&logo=node.js" alt="NodeLink" /></a>
    <a href="https://discord.com/invite/ZVCB8EnRX2"><img src="https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
  </div>

  <br />
  <br />
</div>

---

## 📽️ The Melofy Vision

**Melofy** isn't just a music web application; it's a meticulously crafted digital ecosystem for your music. Powered by a high-speed Turborepo monorepo, it bridges the gap between premium client interfaces (Web, Frameless Desktop, and Native Mobile) and a robust audio streaming backend.

<div align="center">
  <table border="0" cellspacing="0" cellpadding="20">
    <tr>
      <td width="300" valign="top" style="border: 1px solid #333; border-radius: 15px; background: rgba(255,255,255,0.05);">
        <h3>🎧 Pure Sound</h3>
        <p>Lossless streaming experience powered by <b>NodeLink</b>. Zero latency, maximum vibes.</p>
      </td>
      <td width="300" valign="top" style="border: 1px solid #333; border-radius: 15px; background: rgba(255,255,255,0.05);">
        <h3>🎨 Stunning UI</h3>
        <p>A fluid, glassmorphic interface built with <b>Framer Motion</b> and <b>Tailwind 4.0</b>.</p>
      </td>
    </tr>
    <tr>
      <td width="300" valign="top" style="border: 1px solid #333; border-radius: 15px; background: rgba(255,255,255,0.05);">
        <h3>🖥️ Frameless Desktop</h3>
        <p>Ultra-secure, inspect-proof, frameless desktop client powered by <b>Tauri v2</b>.</p>
      </td>
      <td width="300" valign="top" style="border: 1px solid #333; border-radius: 15px; background: rgba(255,255,255,0.05);">
        <h3>📱 Smart Mobile</h3>
        <p>Native feeling client with hardware optimization powered by <b>Capacitor</b>.</p>
      </td>
    </tr>
  </table>
</div>

---

## 🏗️ System Architecture

Melofy employs a distributed service architecture separating client layers, the main API gateway, and the dedicated audio streaming engine.

```mermaid
graph TD
    %% Core Styling
    classDef client fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef frontend fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef backend fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef audio fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef database fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef external fill:#374151,stroke:#1f2937,stroke-width:2px,color:#fff,rx:8px,ry:8px

    subgraph Clients ["📱 Client Layer"]
        Web["Web Application"]:::client
        Desktop["Tauri v2 Desktop App"]:::client
        Mobile["Capacitor Mobile App"]:::client
    end

    subgraph Frontend ["🎨 Frontend (Next.js 16)"]
        UI["User Interface"]:::frontend
        State["Zustand State"]:::frontend
        AudioPlayer["Web Audio API Player"]:::frontend
    end

    subgraph Backend ["⚙️ API Gateway (Express)"]
        Router["API Router"]:::backend
        SocketServer["Socket.io (Realtime)"]:::backend
        Metadata["Metadata & Search"]:::backend
    end

    subgraph Streaming ["🎵 Audio Engine (NodeLink)"]
        NodeLinkServer["NodeLink Server"]:::audio
        AudioStreamer["Audio Streamer"]:::audio
    end

    subgraph Cloud ["☁️ Cloud & External Services"]
        Firebase["Firebase Auth"]:::database
        Upstash["Upstash Redis"]:::database
        SpotifyAPI["Spotify APIs"]:::external
    end

    %% Client Interactions
    Web -->|Renders| UI
    Desktop -->|Webview API| UI
    Mobile -->|WebView| UI
    UI <--> State
    State -->|HTTP Requests| Router
    UI -->|WebSocket| SocketServer

    %% Backend Integrations
    Router -->|Verify Token| Firebase
    Router --> Metadata
    Metadata <-->|Cache Responses| Upstash
    Metadata -->|Fetch Track Info| SpotifyAPI
    
    %% Audio Flow
    SocketServer -->|Commands Play/Pause| NodeLinkServer
    NodeLinkServer -->|Fetch Audio Source| SpotifyAPI
    NodeLinkServer --> AudioStreamer
    AudioStreamer -.->|Direct Audio Stream HLS/HTTP| AudioPlayer
```

---

## 🛠️ Performance-Driven Tech Stack

<div align="center">
  <table>
    <tr>
      <th align="center">Layer</th>
      <th align="center">Technologies</th>
    </tr>
    <tr>
      <td><b>Frontend</b></td>
      <td><code>Next.js 16</code> • <code>React 19</code> • <code>TypeScript</code> • <code>Zustand</code> • <code>Radix UI</code> • <code>Lucide</code></td>
    </tr>
    <tr>
      <td><b>Clients</b></td>
      <td><code>Tauri v2</code> (Desktop) • <code>Capacitor 6</code> (Mobile)</td>
    </tr>
    <tr>
      <td><b>Styling</b></td>
      <td><code>Tailwind CSS 4.0</code> • <code>Framer Motion</code> • <code>Shadcn/UI</code></td>
    </tr>
    <tr>
      <td><b>Backend</b></td>
      <td><code>Node.js</code> • <code>Express</code> • <code>Socket.io</code> • <code>NodeLink</code></td>
    </tr>
    <tr>
      <td><b>Cloud</b></td>
      <td><code>Firebase Authentication</code> • <code>Upstash Redis</code></td>
    </tr>
  </table>
</div>

---

## 📂 Project Structure

```bash
melofy/
├── apps/
│   ├── web/        # Next.js 16 Frontend Web Client
│   ├── api/        # Express.js Backend (Audio Controller)
│   ├── desktop/    # Tauri v2 Desktop App Config
│   └── mobile/     # Capacitor Mobile App (Android/iOS wrapper)
├── NodeLink/       # NodeLink Audio Server
├── turbo.json      # Monorepo Orchestration
└── package.json    # Project Manifest
```

---

## 🏁 Quick Ignition

### 1️⃣ Clone & Fuel Up

```bash
git clone https://github.com/lazyshrey/melofy.git
cd melofy
npm install
```

### 2️⃣ Configure Environmentals

Copy the example files and fill in your credentials:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Important production variables:
- `apps/api`: `FIREBASE_API_KEY`, `CORS_ORIGINS`, NodeLink + Spotify + Upstash variables
- `apps/web`: Firebase public variables, Upstash variables, and `BACKEND_API_URL`

### 3️⃣ Launch the Engines

```bash
# Full Monorepo Dev (Recommended)
npm run dev
```

> **Pro Tip:** If you want to run the NodeLink audio server separately, navigate to `NodeLink/` and run `npm start`.

---

## 🤝 Community & Support

Join our Discord server to get updates, report bugs, or just hang out with the devs!

<div align="center">
  <a href="https://discord.gg/ZVCB8EnRX2">
    <img src="https://img.shields.io/discord/951909987838468116?color=%237289DA&label=Lazy%20Devs&logo=discord&logoColor=white&style=for-the-badge" alt="Join Discord" />
  </a>
</div>

<br />

### Support the Project 💖

If you appreciate the work and want to support the development of Melofy, consider buying me a coffee!

<div align="center">
  <a href="https://payments.cashfree.com/forms/shrey">
    <img src="https://img.shields.io/badge/Donate-Buy%20Me%20A%20Coffee-a3d4ec?style=for-the-badge&logo=coffee&logoColor=black" alt="Buy me a coffee" />
  </a>
</div>

---

<div align="center">
  <p>Built with 💖 and ☕ by <b><a href="https://github.com/lazyshrey">lazyshrey</a></b></p>
  <p><i>© 2026 Melofy. Licensed under ISC.</i></p>
</div>
