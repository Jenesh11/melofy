'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, FolderGit, Database, Cpu, Sparkles, ShieldCheck, 
  Layers, MonitorPlay, MessageSquare 
} from 'lucide-react';

const TABS = [
  { id: 'setup', label: '🚀 Setup & Structure', icon: <Terminal className="w-4 h-4" /> },
  { id: 'architecture', label: '⚙️ Stack Architecture', icon: <Cpu className="w-4 h-4" /> },
  { id: 'design', label: '🎨 Design & Security', icon: <Sparkles className="w-4 h-4" /> }
];

export function GithubGuidelines() {
  const [activeTab, setActiveTab] = useState('setup');

  return (
    <div className="w-full mt-16 max-w-4xl mx-auto text-left">
      <div className="flex flex-col gap-3 mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Contribution Guidelines
        </h2>
        <h3 className="text-3xl font-bold tracking-tight text-foreground">
          Interactive Contribution Portal
        </h3>
        <p className="text-muted-foreground text-sm font-light max-w-xl">
          Melofy follows strict architectural rules and aesthetic principles to maintain its premium multi-client streaming experience. Explore the standards below.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 p-1.5 rounded-full bg-muted/20 border border-border/40 backdrop-blur-sm mb-8 overflow-x-auto custom-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer select-none whitespace-nowrap ${
                isActive ? 'text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-foreground rounded-full z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content wrapper */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 rounded-3xl border border-border/50 bg-card/20 backdrop-blur-sm shadow-xl space-y-8"
          >
            {activeTab === 'setup' && (
              <>
                {/* Monorepo Architecture */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/25">
                      <FolderGit className="w-5 h-5 text-purple-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">Monorepo Workspace</h4>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
                    Melofy operates under a highly optimized **Turborepo monorepo** splitting client, gateway, and streaming layers to keep builds lightning fast and local tasks synchronized.
                  </p>
                  <div className="p-5 rounded-2xl bg-zinc-950/40 border border-white/5 font-mono text-[11px] leading-relaxed text-zinc-400">
                    <span className="text-zinc-500">melofy/</span><br />
                    ├── <span className="text-purple-400">apps/</span><br />
                    │   ├── <span className="text-emerald-400">web/</span>        <span className="text-zinc-500"># Next.js 16 Frontend Web Client</span><br />
                    │   ├── <span className="text-emerald-400">api/</span>        <span className="text-zinc-500"># Express.js API Gateway (WebSocket Controller)</span><br />
                    │   ├── <span className="text-emerald-400">desktop/</span>    <span className="text-zinc-500"># Tauri v2 Desktop client workspace configuration</span><br />
                    │   └── <span className="text-emerald-400">mobile/</span>     <span className="text-zinc-500"># Capacitor wrapper for Android & iOS deploy targets</span><br />
                    ├── <span className="text-amber-400">NodeLink/</span>       <span className="text-zinc-500"># Pure NodeLink lossless audio player core streaming server</span><br />
                    └── turbo.json      <span className="text-zinc-500"># Monorepo build and development pipelines config</span>
                  </div>
                </div>

                {/* Installation steps */}
                <div className="space-y-4 pt-4 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/25">
                      <Terminal className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">Ignition Checklist</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-card/15 border border-border/30 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Step 1</span>
                      <h5 className="font-bold text-foreground text-sm">Clone & Fuel Up</h5>
                      <p className="text-xs text-muted-foreground/80 font-light">Install dependencies cleanly from the monorepo root:</p>
                      <pre className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 font-mono text-[10px] text-zinc-300">
                        npm install
                      </pre>
                    </div>

                    <div className="p-5 rounded-2xl bg-card/15 border border-border/30 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Step 2</span>
                      <h5 className="font-bold text-foreground text-sm">Configure Environment</h5>
                      <p className="text-xs text-muted-foreground/80 font-light">Copy template env files inside web and api directories:</p>
                      <pre className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 font-mono text-[10px] text-zinc-300">
                        # Configure apps/web/.env.local<br />
                        # Configure apps/api/.env
                      </pre>
                    </div>

                    <div className="p-5 rounded-2xl bg-card/15 border border-border/30 space-y-2 md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Step 3</span>
                      <h5 className="font-bold text-foreground text-sm">Ignite Concurrently</h5>
                      <p className="text-xs text-muted-foreground/80 font-light">Launch local development nodes with a single command:</p>
                      <pre className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 font-mono text-[10px] text-zinc-300">
                        npm run dev
                      </pre>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'architecture' && (
              <>
                {/* Redis + Sockets Jam */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/25">
                      <Database className="w-5 h-5 text-red-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground font-sans">Real-Time Jam Rooms</h4>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
                    Users create collaborative listening rooms. Hosts generate codes to register sessions in **Upstash Redis** (4h expiration), pushing audio packets dynamically over standard **Socket.io** protocols.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border/30 bg-card/10 space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Server Handlers</span>
                      <p className="text-xs font-semibold text-foreground">`apps/api/src/sockets/jam.ts`</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border/30 bg-card/10 space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Client Sync Hook</span>
                      <p className="text-xs font-semibold text-foreground">`apps/web/src/hooks/usePlayerSync.ts`</p>
                    </div>
                  </div>
                </div>

                {/* State Persistency */}
                <div className="space-y-4 pt-6 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/25">
                      <Layers className="w-5 h-5 text-green-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground font-sans">Throttled Zustand State Sync</h4>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
                    Zustand store variables sync persistent volume, loop, shuffle, current tracks, queue indexes, and active collection details to Firestore. 
                    Synchronization is safely **throttled at 2 seconds** using custom timers to prevent database query bloat.
                  </p>
                </div>

                {/* Discord Presence */}
                <div className="space-y-4 pt-6 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/25">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground font-sans">PreMiD Discord Rich Presence</h4>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
                    The client player exposes metadata properties dynamically to <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded text-blue-400">window.melofy</code> and fires custom browser <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded text-blue-400">melofy_state_update</code> triggers, enabling zero-config background Discord Rich Presence.
                  </p>
                </div>
              </>
            )}

            {activeTab === 'design' && (
              <>
                {/* Glassmorphism styling rules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/25">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground font-sans">Vibrant Glassmorphism & Layouts</h4>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
                    Components must strictly follow our frosted styling system using heavy translucency values and boundary strokes:
                  </p>
                  <pre className="p-4 rounded-2xl bg-zinc-950/40 border border-white/5 font-mono text-[10px] leading-relaxed text-zinc-300">
                    background: rgba(23, 23, 27, 0.85);<br />
                    backdrop-filter: blur(16px);<br />
                    border: 1px solid rgba(255, 255, 255, 0.08);
                  </pre>
                  <p className="text-xs text-amber-400/80 font-medium">
                    ⚠️ The Picture-in-Picture window renders a custom compact horizontal layout (450x150) on Tauri, but falls back to standard Chromium guidelines (380x240) on the web.
                  </p>
                </div>

                {/* Security */}
                <div className="space-y-4 pt-6 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/25">
                      <ShieldCheck className="w-5 h-5 text-red-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground font-sans">Inspect-Proof Security</h4>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
                    Standard operating system context boxes are completely intercepted in <code className="text-xs bg-muted/30 px-1.5 rounded text-red-400">AppWrapper.tsx</code> and replaced with a custom dark glassmorphic menu providing quick navigations: **Back** (via `router.back()`), **Refresh**, **Search**, **Library**, and **Settings**.
                    Standard developer shortcut combinations (F12, Ctrl+Shift+I/J/C, Ctrl+U) are globally blocked.
                  </p>
                </div>

                {/* Abort Tolerances */}
                <div className="space-y-4 pt-6 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/25">
                      <MonitorPlay className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground font-sans">Abort Tolerance & Stability</h4>
                  </div>
                  <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
                    All network operations inside components or custom hook mounts must use our custom <code className="text-xs bg-muted/30 px-1 py-0.5 rounded text-indigo-400">safeFetch</code> handler. This cleanly maps cancelled fetches (due to double-mounting or unmounting) to status <code className="text-xs bg-muted/30 px-1 py-0.5 rounded text-indigo-400">499 Client Aborted</code> instead of throwing uncaught exceptions, preventing Next.js Fast Refresh full-screen error overlays.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
