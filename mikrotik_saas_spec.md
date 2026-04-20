# Comprehensive System Design Specification: MikroTik SaaS Platform (Project "Vortex")

## 1. Executive Summary & Core Philosophy
Project Vortex is a high-performance, multi-tenant SaaS designed for Wireless Internet Service Providers (WISPs) and MSPs. It bridges the gap between MikroTik’s robust networking power and the modern need for beautiful, human-centric, and secure management interfaces.

**Core Pillars:**
- **Zero-Exposure Security:** Management via private tunnels, never public API ports.
- **Historical Fidelity:** Turning "live-only" data into actionable historical insights.
- **Client-Empowerment:** A "Lite" portal for end-users to manage their own Wi-Fi and basic security.
- **The "Sound Mix" UI:** High-contrast, visual-first dashboards with clear signal-to-noise ratios.

---

## 2. Technical Stack
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Framer Motion (for smooth signal visualizations).
- **Backend:** Node.js (Fastify) for high-throughput API communication.
- **Database:** Supabase (PostgreSQL) with Row Level Security (RLS) for multi-tenancy.
- **Real-time:** Supabase Realtime + WebSockets for live traffic "VU meters."
- **Networking Library:** `routeros-client` or `node-routeros`.
- **Infrastructure:** WireGuard for secure "Call-Home" tunneling.

---

## 3. Deep-Dive Architecture & Logic

### 3.1. The "Call-Home" Provisioning (The Reddit Fix)
*Problem: Opening API ports (8728/8729) is a security liability.*
*Solution:* A "One-Click" onboarding script.
- **Logic:** The ISP runs a generated script on a fresh MikroTik.
- **Execution:** The script creates a **WireGuard** interface, generates a keypair, and establishes a tunnel to the SaaS Backend.
- **Result:** The SaaS communicates with the router via its internal tunnel IP (e.g., `10.0.x.x`).

### 3.2. The Analytics Engine (Historical Visibility)
*Problem: MikroTik lacks historical logging for bandwidth/latency.*
*Solution:* A Time-Series Polling Service.
- **Polling:** Node.js worker pulls `/interface/monitor-traffic` and `/system/resource/print` every 60s.
- **Storage Strategy:** - **Raw Data:** Stored in Supabase for 24 hours.
    - **Aggregation:** A Postgres function rolls 1-minute data into 15-minute, 1-hour, and 1-day averages for long-term "Time-Travel" troubleshooting.
- **Pinpoint:** ISP can see exactly why a customer’s speed dropped at 3 AM.

### 3.3. Snapshot & Rollback (The "Undo" Button)
- **Feature:** Automated Config Backups.
- **Git-Style Diff:** Use a library to compare the current config with the previous version. Highlight changes in Red/Green.
- **One-Click Recovery:** Restore a previous configuration if a change breaks the network.

---

## 4. Advanced "Hunger" Features

### 4.1. The Client (End-User) Portal
A restricted dashboard for the ISP’s customers:
- **Simple Speed Test:** Integrated Speedtest.net or internal Bandwidth Test.
- **Wi-Fi Management:** Change SSID/Password without touching WinBox.
- **Friendly Naming:** Map `00:1A...` MAC addresses to names like "Kitchen Sonos" via a `device_inventory` table.
- **Parental Pause:** A single button to disable internet access for specific MAC addresses.

### 4.2. ISP Operations Dashboard
- **Bulk Push:** Select multiple routers and apply a standardized Firewall Filter or DNS update.
- **Firmware Auditor:** List all routers and highlight those running outdated/vulnerable RouterOS versions.
- **AI Log Summarizer:** Send cryptic MikroTik logs to an LLM to explain in plain English (e.g., "Phase 1 failure" -> "The VPN password is wrong").

---

## 5. Database Schema (Extended)

### `organizations`
- `id`, `name`, `billing_status`, `api_key`

### `routers`
- `id`, `org_id`, `serial_number`, `model`, `tunnel_ip`, `last_seen`, `firmware_version`
- `credentials_encrypted`: AES-256 encrypted API password.

### `device_inventory` (The "Friendly Mapper")
- `id`, `router_id`, `mac_address`, `nickname`, `icon_type`, `is_blocked` (boolean)

### `telemetry_metrics` (Time-Series)
- `router_id`, `timestamp`, `tx_bps`, `rx_bps`, `cpu_load`, `ram_usage`, `signal_strength_dbm`

### `config_snapshots`
- `id`, `router_id`, `config_blob` (jsonb), `created_at`

---

## 6. Implementation Instructions for Coding Agent

### Step 1: The Tunnel Controller
Build a Node.js service that:
1. Generates WireGuard peer configs.
2. Listens for API requests and proxies them to the correct `tunnel_ip`.
3. Handles authentication via Supabase RLS.

### Step 2: High-Performance Polling
Implement a worker using `p-limit` to poll 100+ routers concurrently without crashing the API. Use `UPSERT` in Supabase to log metrics efficiently.

### Step 3: The "Sound Mixer" UI
Build the Next.js frontend with:
- **Dashboard Grid:** Cards showing CPU, Traffic, and Health.
- **Visual Feedback:** Use CSS animations or SVGs to show data "flowing" through interfaces.
- **Dynamic Search:** Instantly filter routers by Serial, Model, or Org.

---

## 7. Security Constraints
- **AES-256:** All router credentials must be encrypted at rest.
- **Scoped Tokens:** API keys must be scoped to specific organizations.
- **Audit Logging:** Every write action (`/ip/firewall/add`, etc.) must be logged in a `system_audits` table.
