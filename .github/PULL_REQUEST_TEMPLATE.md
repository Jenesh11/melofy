## 🎵 Melofy Pull Request Template

### Description
Please include a concise summary of the changes introduced by this pull request. Explain the problem being solved, the motivation behind these changes, and any technical decisions made.

Fixes # (issue number)

---

### 📦 Component Scope
Which parts of the Melofy ecosystem does this PR modify? *(Select all that apply)*

- [ ] **`apps/web`** (Next.js 16 Web Client / Core UI)
- [ ] **`apps/api`** (Express Audio Controller Gateway)
- [ ] **`apps/desktop`** (Tauri v2 Desktop App Config)
- [ ] **`apps/mobile`** (Capacitor Mobile App wrapper)
- [ ] **`NodeLink/`** (Audio Streaming Engine Server)
- [ ] **`packages/*`** (Shared libraries/utilities)
- [ ] **`Workflow / CI / DevOps`** (GitHub Actions, deploy configurations)

---

### 🛠️ Type of Change
- [ ] **Bug Fix** (non-breaking change which fixes an issue)
- [ ] **New Feature** (non-breaking change which adds audio features/UI elements)
- [ ] **Performance Boost** (latency reduction, streaming optimizations, Tauri bundle size reduction)
- [ ] **Breaking Change** (fix or feature that would cause existing APIs or audio players to break)
- [ ] **Documentation Update** (improvements to setup, instructions, or inline docs)

---

### 🧪 Verification & Testing
Please describe the tests and checks you performed to verify your changes.

#### 1. Apps & Client Verification:
- [ ] **Next.js Web**: Ran `npm run dev` and checked local UI responsiveness.
- [ ] **Tauri Desktop**: Ran `npm run tauri dev` or verified that frameless app borders and devtools blocker are functional.
- [ ] **Capacitor Mobile**: Executed Android/iOS synchronization and tested platform-native player functions.
- [ ] **NodeLink Audio**: Tested local audio streaming connection (lossless streaming HLS/HTTP).

#### 2. General Quality Checks:
- [ ] Checked against logs and devtools console for warnings or unexpected errors.
- [ ] Verified Firebase Auth or Upstash Redis state transitions (if modified).
- [ ] Code builds cleanly using Turbo Orchestration (`npm run build`).

---

### 📋 Checklist
- [ ] My code adheres to the styling standards of this project (Tailwind 4.0, fluid/glassmorphic designs).
- [ ] I have commented my code, especially in core streaming layers or state-heavy hook files.
- [ ] My changes generate no new build errors or linter warnings.
- [ ] I have updated the documentation / README if there are changes to environment variables.

---

### 📸 Media (Optional)
*If your changes affect the client UI (Next.js, Tauri, or Capacitor), please attach screenshots or screen recordings showing the modern fluid/glassmorphic visual changes below:*
