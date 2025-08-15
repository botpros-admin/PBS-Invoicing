import { supabase } from '../../api/supabase';

interface IPWhitelistRule {
  id: string;
  tenant_id?: string;
  clinic_id?: string;
  ip_address?: string;
  ip_range_start?: string;
  ip_range_end?: string;
  cidr?: string;
  description: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  expires_at?: string;
}

class IPWhitelistService {
  private rules: IPWhitelistRule[] = [];
  private lastFetch: Date | null = null;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get client IP address
   */
  async getClientIP(): Promise<string> {
    try {
      // Try multiple services for redundancy
      const services = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://api.my-ip.io/ip.json'
      ];

      for (const service of services) {
        try {
          const response = await fetch(service);
          const data = await response.json();
          return data.ip || data.origin || '';
        } catch {
          continue;
        }
      }

      // Fallback to WebRTC if available
      return await this.getIPFromWebRTC();
    } catch (error) {
      console.error('Error getting client IP:', error);
      return '';
    }
  }

  /**
   * Get IP using WebRTC (more reliable but requires user permission)
   */
  private async getIPFromWebRTC(): Promise<string> {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const noop = () => {};
      pc.createDataChannel('');
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer), noop);
      
      pc.onicecandidate = (event) => {
        if (event && event.candidate && event.candidate.candidate) {
          const candidate = event.candidate.candidate;
          const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
          const match = candidate.match(ipRegex);
          if (match) {
            pc.close();
            resolve(match[0]);
          }
        }
      };

      setTimeout(() => {
        pc.close();
        resolve('');
      }, 1000);
    });
  }

  /**
   * Check if IP is whitelisted
   */
  async isIPWhitelisted(
    ip: string,
    tenantId?: string,
    clinicId?: string
  ): Promise<boolean> {
    try {
      // Refresh cache if needed
      if (!this.lastFetch || Date.now() - this.lastFetch.getTime() > this.cacheTimeout) {
        await this.fetchRules(tenantId, clinicId);
      }

      // Check each rule
      for (const rule of this.rules) {
        if (!rule.is_active) continue;

        // Check expiration
        if (rule.expires_at && new Date(rule.expires_at) < new Date()) {
          continue;
        }

        // Check exact IP match
        if (rule.ip_address && rule.ip_address === ip) {
          return true;
        }

        // Check IP range
        if (rule.ip_range_start && rule.ip_range_end) {
          if (this.isIPInRange(ip, rule.ip_range_start, rule.ip_range_end)) {
            return true;
          }
        }

        // Check CIDR
        if (rule.cidr && this.isIPInCIDR(ip, rule.cidr)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking IP whitelist:', error);
      // Fail open in case of error (allow access)
      return true;
    }
  }

  /**
   * Fetch whitelist rules from database
   */
  private async fetchRules(tenantId?: string, clinicId?: string): Promise<void> {
    try {
      let query = supabase
        .from('ip_whitelist')
        .select('*')
        .eq('is_active', true);

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      if (clinicId) {
        query = query.or(`clinic_id.eq.${clinicId},clinic_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.rules = data || [];
      this.lastFetch = new Date();
    } catch (error) {
      console.error('Error fetching IP whitelist rules:', error);
      this.rules = [];
    }
  }

  /**
   * Check if IP is in range
   */
  private isIPInRange(ip: string, start: string, end: string): boolean {
    const ipNum = this.ipToNumber(ip);
    const startNum = this.ipToNumber(start);
    const endNum = this.ipToNumber(end);

    return ipNum >= startNum && ipNum <= endNum;
  }

  /**
   * Check if IP is in CIDR range
   */
  private isIPInCIDR(ip: string, cidr: string): boolean {
    const [network, bits] = cidr.split('/');
    const mask = ~(Math.pow(2, 32 - parseInt(bits)) - 1);
    
    const ipNum = this.ipToNumber(ip);
    const networkNum = this.ipToNumber(network);
    
    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * Convert IP address to number
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    return parts.reduce((acc, part, index) => {
      return acc + (parseInt(part) << (8 * (3 - index)));
    }, 0);
  }

  /**
   * Convert number to IP address
   */
  private numberToIP(num: number): string {
    return [
      (num >>> 24) & 0xFF,
      (num >>> 16) & 0xFF,
      (num >>> 8) & 0xFF,
      num & 0xFF
    ].join('.');
  }

  /**
   * Add IP to whitelist
   */
  async addIPToWhitelist(data: {
    ip_address?: string;
    ip_range_start?: string;
    ip_range_end?: string;
    cidr?: string;
    description: string;
    tenant_id?: string;
    clinic_id?: string;
    expires_at?: string;
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('ip_whitelist')
        .insert({
          ...data,
          created_by: user?.id,
          is_active: true
        });

      if (error) throw error;

      // Clear cache
      this.lastFetch = null;

      // Log the addition
      await supabase.from('audit_logs').insert({
        action: 'create',
        resource_type: 'ip_whitelist',
        description: `Added IP to whitelist: ${data.description}`,
        metadata: data
      });
    } catch (error) {
      console.error('Error adding IP to whitelist:', error);
      throw error;
    }
  }

  /**
   * Remove IP from whitelist
   */
  async removeIPFromWhitelist(ruleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .update({ is_active: false })
        .eq('id', ruleId);

      if (error) throw error;

      // Clear cache
      this.lastFetch = null;

      // Log the removal
      await supabase.from('audit_logs').insert({
        action: 'delete',
        resource_type: 'ip_whitelist',
        resource_id: ruleId,
        description: 'Removed IP from whitelist'
      });
    } catch (error) {
      console.error('Error removing IP from whitelist:', error);
      throw error;
    }
  }

  /**
   * Get all whitelist rules
   */
  async getWhitelistRules(
    tenantId?: string,
    clinicId?: string
  ): Promise<IPWhitelistRule[]> {
    try {
      let query = supabase
        .from('ip_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching whitelist rules:', error);
      return [];
    }
  }

  /**
   * Validate IP address format
   */
  validateIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Validate CIDR notation
   */
  validateCIDR(cidr: string): boolean {
    const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;
    return cidrRegex.test(cidr);
  }

  /**
   * Get geolocation for IP
   */
  async getIPGeolocation(ip: string): Promise<{
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  }> {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();
      
      return {
        country: data.country_name,
        region: data.region,
        city: data.city,
        timezone: data.timezone
      };
    } catch (error) {
      console.error('Error getting IP geolocation:', error);
      return {};
    }
  }

  /**
   * Check if current request should be blocked
   */
  async checkAccess(
    tenantId?: string,
    clinicId?: string
  ): Promise<{
    allowed: boolean;
    ip: string;
    reason?: string;
  }> {
    try {
      const ip = await this.getClientIP();
      
      if (!ip) {
        return {
          allowed: true,
          ip: '',
          reason: 'Could not determine IP address'
        };
      }

      // Check if whitelisting is enabled for this tenant/clinic
      const { data: settings } = await supabase
        .from('security_settings')
        .select('ip_whitelist_enabled')
        .or(`tenant_id.eq.${tenantId},clinic_id.eq.${clinicId}`)
        .single();

      if (!settings?.ip_whitelist_enabled) {
        return {
          allowed: true,
          ip,
          reason: 'IP whitelisting not enabled'
        };
      }

      const isWhitelisted = await this.isIPWhitelisted(ip, tenantId, clinicId);

      if (!isWhitelisted) {
        // Log blocked attempt
        await supabase.from('security_logs').insert({
          event_type: 'ip_blocked',
          ip_address: ip,
          tenant_id: tenantId,
          clinic_id: clinicId,
          metadata: {
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        });

        return {
          allowed: false,
          ip,
          reason: 'IP address not whitelisted'
        };
      }

      return {
        allowed: true,
        ip
      };
    } catch (error) {
      console.error('Error checking access:', error);
      // Fail open
      return {
        allowed: true,
        ip: '',
        reason: 'Error checking access'
      };
    }
  }
}

// Singleton instance
export const ipWhitelistService = new IPWhitelistService();

// React hook for IP whitelisting
export const useIPWhitelist = () => {
  const checkAccess = async (tenantId?: string, clinicId?: string) => {
    return await ipWhitelistService.checkAccess(tenantId, clinicId);
  };

  const addIP = async (data: any) => {
    return await ipWhitelistService.addIPToWhitelist(data);
  };

  const removeIP = async (ruleId: string) => {
    return await ipWhitelistService.removeIPFromWhitelist(ruleId);
  };

  const getRules = async (tenantId?: string, clinicId?: string) => {
    return await ipWhitelistService.getWhitelistRules(tenantId, clinicId);
  };

  const getClientIP = async () => {
    return await ipWhitelistService.getClientIP();
  };

  const validateIP = (ip: string) => {
    return ipWhitelistService.validateIP(ip);
  };

  const validateCIDR = (cidr: string) => {
    return ipWhitelistService.validateCIDR(cidr);
  };

  return {
    checkAccess,
    addIP,
    removeIP,
    getRules,
    getClientIP,
    validateIP,
    validateCIDR
  };
};