## 🌐 System Design: MikroTik SaaS Controller

### Core Philosophy
To bridge the gap between MikroTik's high-performance networking and the modern need for intuitive, visual, and secure management.

### Key Innovations
1. **Zero-Trust Management**: No public API ports required. Routers connect via encrypted WireGuard tunnels to the Node.js controller.
2. **State Management**: Using Supabase to mirror router states, allowing for instant UI updates and offline configuration queuing.
3. **Automated Provisioning**: A shell script-based "onboarding" flow that turns a factory-reset router into a managed node in < 60 seconds.

### Logic Flow
1. **Request**: Next.js UI sends a command (e.g., "Limit Guest Speed").
2. **Validation**: Node.js checks Supabase RLS (Row Level Security) to ensure the user has permission for that router.
3. **Execution**: Node.js sends the API command through the private tunnel to the router.
4. **Sync**: On success, the local database is updated, and the UI reflects the change via Supabase Realtime.
