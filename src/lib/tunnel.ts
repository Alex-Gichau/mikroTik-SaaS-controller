import { supabase } from './supabase';

export interface WireGuardConfig {
  privateKey: string;
  publicKey: string;
  address: string;
  endpoint: string;
  serverPublicKey: string;
}

export const generateRouterScript = (config: WireGuardConfig, routerName: string) => {
  return `
# MikroTik "One-Click" Onboarding Script for Vortex
# Router Name: ${routerName}

/interface wireguard
add listen-port=13231 name=wireguard-vortex private-key="${config.privateKey}"

/interface wireguard peers
add allowed-address=0.0.0.0/0 endpoint-address=${config.endpoint} endpoint-port=13231 \
    interface=wireguard-vortex public-key="${config.serverPublicKey}"

/ip address
add address=${config.address} interface=wireguard-vortex

/system identity
set name="Vortex-${routerName}"

# Enable API over SSL on port 8729
/ip service
set api-ssl disabled=no port=8729

# Ensure the API is only accessible via the tunnel
/ip service
set api-ssl address=${config.address.split('/')[0]}/32

/log info "Vortex Onboarding Complete. Tunnel established to ${config.endpoint}"
  `.trim();
};

export const provisionRouter = async (orgId: string, routerName: string) => {
  // 1. Generate WireGuard keys (In a real app, use a crypto library or call WG binary)
  // For now, we'll use placeholders
  const mockConfig: WireGuardConfig = {
    privateKey: "PLACEHOLDER_PRIVATE_KEY",
    publicKey: "PLACEHOLDER_PUBLIC_KEY",
    address: "10.0.0.2/24",
    endpoint: process.env.VORTEX_SERVER_IP || "vortex-server.example.com",
    serverPublicKey: process.env.VORTEX_SERVER_PUBKEY || "SERVER_PUB_KEY",
  };

  // 2. Register router in Supabase
  const { data, error } = await supabase
    .from('routers')
    .insert([
      {
        org_id: orgId,
        name: routerName,
        serial_number: `SN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        tunnel_ip: mockConfig.address.split('/')[0],
        status: 'provisioning'
      }
    ])
    .select();

  if (error) throw error;

  // 3. Return the script to the user
  return generateRouterScript(mockConfig, routerName);
};
