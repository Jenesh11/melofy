# 🛡️ Melofy Security Policy

At Melofy, we are dedicated to providing a premium, ultra-secure, and latency-free auditory experience. We appreciate security researchers, developers, and users reporting potential vulnerabilities to help keep our ecosystem safe.

---

## 📦 Supported Scope & Components

Security monitoring is actively provided for the main branches of the Melofy repository across all integrated layers:

| Component | Target Environment | Security Scope |
| --- | --- | --- |
| **`apps/web`** (Next.js 16) | Production Web Client | XSS protection, token storage, glassmorphic UI overlay spoofing. |
| **`apps/api`** (Express Gateway) | Production REST & Socket Server | API Authentication checks, Firebase auth verification bypasses. |
| **`apps/desktop`** (Tauri v2) | Windows/macOS Desktop App | Frameless inspect-proofing, native platform command injection, devtools bypasses. |
| **`apps/mobile`** (Capacitor) | iOS/Android Wrapper | WebView sandbox escapes, platform permission leaks. |
| **`NodeLink/`** (Audio Server) | Audio Engine Backend | Spotify API key exposure, private socket/HLS streaming endpoint leakage. |

---

## 🔍 Vulnerabilities We Prioritize

We particularly care about vulnerabilities involving:
1. **API Key Leaks**: Exposure of Spotify APIs, Firebase secret tokens, or Upstash Redis keys in production bundles.
2. **Desktop Sandbox Bypass**: Escaping the Tauri v2 IPC context or inspecting secure elements in our production desktop client.
3. **Authentication Overrides**: Bypassing Firebase Authentication tokens at the `apps/api` gateway.
4. **Denial of Service**: Crashing the NodeLink audio streaming server via malicious socket messages or malformed streaming queries.

---

## 🚨 Reporting a Vulnerability

If you believe you have found a security vulnerability in the Melofy codebase, please **do not report it publicly via open GitHub issues or standard Discord channels**.

### Safe Reporting Channels:
1. **GitHub Security Advisories (Preferred)**: Navigate to the [Melofy Security Tab](https://github.com/ShreyJaiswal1/melofy/security/advisories) on GitHub and select **"Report a vulnerability"** to draft a private advisory.
2. **Direct Contact**: Direct message the project creator, **Shrey Jaiswal**, via the [Lazy Devs Discord Server](https://discord.gg/ZVCB8EnRX2) (username: `ShreyJaiswal1`).

### What to Include:
To help us triage and patch the issue as fast as possible, please provide:
* A detailed description of the flaw, its potential impact, and the affected component (e.g., Tauri IPC, Express router, NodeLink Socket).
* A step-by-step reproduction path or proof-of-concept (PoC) code/commands.
* Any browser/system environment information (e.g. NodeLink version, OS version).

### Our Commitment:
* We will acknowledge receipt of your report within **48 hours**.
* We will keep you updated on our progress toward patching the issue.
* If requested, you will be properly credited in the release notes once the patch is published.
