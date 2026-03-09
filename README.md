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

**Melofy** isn't just a Spotify clone; it's a meticulously crafted digital stage for your music. Built on a powerful monorepo architecture, it bridges the gap between high-speed web interfaces and robust audio processing servers.

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
        <h3>⚡ Turbo Core</h3>
        <p>Managed via <b>Turborepo</b> for lightning-fast builds and synchronized development.</p>
      </td>
      <td width="300" valign="top" style="border: 1px solid #333; border-radius: 15px; background: rgba(255,255,255,0.05);">
        <h3>🔐 Secure & Social</h3>
        <p>Integrated with <b>Firebase Auth</b> and <b>Discord</b> for a connected experience.</p>
      </td>
    </tr>
  </table>
</div>

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
      <td><code>Next.js 16</code> • <code>TypeScript</code> • <code>Zustand</code> • <code>Radix UI</code> • <code>Lucide</code></td>
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
│   ├── web/        # Next.js 16 Frontend
│   └── api/        # Express.js Backend (Audio Controller)
├── NodeLink/       # NodeLink Audio Server
├── turbo.json      # Monorepo Orchestration
└── package.json    # Project Manifest
```

---

## 🏁 Quick Ignition

### 1️⃣ Clone & Fuel Up

```bash
git clone https://github.com/ShreyJaiswal1/melofy.git
cd melofy
npm install
```

### 2️⃣ Configure Environmentals

Fill in your credentials in the respective `.env` files located in `apps/web` and `apps/api`.

### 3️⃣ Launch the Engines

```bash
# Full Monorepo Dev (Recommended)
npm run dev
```

> **Pro Tip:** If you want to run the audio server separately, navigate to `NodeLink/` and run `npm start`.

---

## 🤝 Community & Support

Join our Discord server to get updates, report bugs, or just hang out with the devs!

<div align="center">
  <a href="https://discord.com/invite/ZVCB8EnRX2">
    <img src="https://invidget.switchblade.xyz/ZVCB8EnRX2" alt="Discord Status" />
  </a>
</div>

---

<div align="center">
  <p>Built with 💖 and ☕ by <b><a href="https://github.com/ShreyJaiswal1">ShreyJaiswal1</a></b></p>
  <p><i>© 2026 Melofy. Licensed under ISC.</i></p>
</div>
