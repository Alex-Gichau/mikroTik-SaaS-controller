import { RouterOSClient } from 'routeros-client';

export interface RouterConnectionConfig {
  host: string;
  user: string;
  password?: string;
  port?: number;
  timeout?: number;
}

export class MikroTikService {
  private config: RouterConnectionConfig;

  constructor(config: RouterConnectionConfig) {
    this.config = config;
  }

  private createClient() {
    return new RouterOSClient({
      host: this.config.host,
      user: this.config.user,
      password: this.config.password || '',
      port: this.config.port || 8728,
      timeout: this.config.timeout || 10000,
    });
  }

  async getTrafficStats(interfaceName: string = 'ether1') {
    const client = this.createClient();
    const api = await client.connect();
    try {
      // routeros-client usage: menu() returns a RosApiCommands instance which has get()
      const stats = await api.menu('/interface/monitor-traffic').get({
        interface: interfaceName,
        once: true,
      });
      return stats;
    } finally {
      await client.close();
    }
  }

  async getSystemResources() {
    const client = this.createClient();
    const api = await client.connect();
    try {
      const resources = await api.menu('/system/resource').get();
      return Array.isArray(resources) ? resources[0] : resources;
    } finally {
      await client.close();
    }
  }

  async getConfiguration() {
    const client = this.createClient();
    const api = await client.connect();
    try {
      // Use /export to get the full configuration script
      const config = await api.menu('/export').get();
      return config;
    } finally {
      await client.close();
    }
  }
}
