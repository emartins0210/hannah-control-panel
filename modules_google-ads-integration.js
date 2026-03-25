/**
 * Google Ads API Integration Module
 * Sincroniza dados de campanhas do Google Ads com Hannah 3.0
 * 
 * Responsabilidades:
 * - Conectar com Google Ads API v14
 * - Trazer dados de campanhas, cliques, conversões
 * - Rastrear ROI por campanha
 * - Sincronizar com leads armazenados
 * - Alertar sobre performance
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GoogleAdsIntegration {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    this.clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    this.loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    this.syncInterval = 3600000; // 1 hora
    this.lastSync = null;
    this.campaignsCache = {};
    this.leadsPath = path.join(__dirname, '../config/leads.json');
  }

  /**
   * Inicializar conexão com Google Ads
   */
  async initialize() {
    try {
      if (!this.accessToken) {
        await this.refreshAccessToken();
      }
      console.log('[Google Ads] ✓ Inicializado');
      this.startAutoSync();
    } catch (error) {
      console.error('[Google Ads] ✗ Erro na inicialização:', error.message);
      throw error;
    }
  }

  /**
   * Obter novo access token usando refresh token
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      });

      this.accessToken = response.data.access_token;
      
      // Armazenar token para próxima execução
      fs.writeFileSync(
        path.join(__dirname, '../config/.google-ads-token'),
        JSON.stringify({ accessToken: this.accessToken, timestamp: Date.now() })
      );

      console.log('[Google Ads] ✓ Token renovado');
    } catch (error) {
      console.error('[Google Ads] ✗ Erro ao renovar token:', error.message);
      throw error;
    }
  }

  /**
   * Fazer requisição autenticada para Google Ads API
   */
  async apiRequest(method, endpoint, body = null) {
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Developer-Token': this.developerToken,
      'Google-Ads-API-Version': 'v14',
      'Content-Type': 'application/json',
      'login-customer-id': this.loginCustomerId
    };

    const config = {
      method,
      url: `https://googleads.googleapis.com/v14/${endpoint}`,
      headers,
      data: body
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expirado
        await this.refreshAccessToken();
        return this.apiRequest(method, endpoint, body); // Retry
      }
      throw error;
    }
  }

  /**
   * Obter todas as campanhas do Google Ads
   */
  async getCampaigns() {
    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.start_date,
          campaign.end_date,
          metrics.clicks,
          metrics.impressions,
          metrics.conversions,
          metrics.cost_micros,
          metrics.conversion_value
        FROM campaign
        WHERE campaign.status = 'ENABLED'
        ORDER BY metrics.clicks DESC
      `;

      const response = await this.apiRequest(
        'POST',
        `customers/${this.customerId}/googleAds:search`,
        { query }
      );

      const campaigns = {};
      
      if (response.results) {
        response.results.forEach(row => {
          const campaign = row.campaign;
          const metrics = row.metrics;

          campaigns[campaign.id] = {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            clicks: metrics?.clicks || 0,
            impressions: metrics?.impressions || 0,
            conversions: metrics?.conversions || 0,
            costMicros: metrics?.cost_micros || 0,
            conversionValue: metrics?.conversion_value || 0,
            costUSD: (metrics?.cost_micros || 0) / 1000000,
            cpc: metrics?.clicks > 0 ? (metrics?.cost_micros / metrics?.clicks / 1000000) : 0,
            ctr: metrics?.impressions > 0 ? (metrics?.clicks / metrics?.impressions * 100) : 0,
            conversionRate: metrics?.clicks > 0 ? (metrics?.conversions / metrics?.clicks * 100) : 0,
            costPerConversion: metrics?.conversions > 0 ? ((metrics?.cost_micros / 1000000) / metrics?.conversions) : 0
          };
        });
      }

      this.campaignsCache = campaigns;
      return campaigns;
    } catch (error) {
      console.error('[Google Ads] ✗ Erro ao obter campanhas:', error.message);
      throw error;
    }
  }

  /**
   * Obter conversões dos últimos N dias
   */
  async getConversions(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          conversion_action.name,
          metrics.conversions,
          metrics.conversion_value
        FROM conversion_action
        WHERE segments.date >= '${startDateStr}'
          AND campaign.status = 'ENABLED'
        ORDER BY metrics.conversions DESC
      `;

      const response = await this.apiRequest(
        'POST',
        `customers/${this.customerId}/googleAds:search`,
        { query }
      );

      const conversions = {};
      
      if (response.results) {
        response.results.forEach(row => {
          const key = row.campaign?.id;
          if (!conversions[key]) {
            conversions[key] = {
              campaignId: row.campaign?.id,
              campaignName: row.campaign?.name,
              conversions: 0,
              conversionValue: 0
            };
          }
          conversions[key].conversions += row.metrics?.conversions || 0;
          conversions[key].conversionValue += row.metrics?.conversion_value || 0;
        });
      }

      return conversions;
    } catch (error) {
      console.error('[Google Ads] ✗ Erro ao obter conversões:', error.message);
      throw error;
    }
  }

  /**
   * Sincronizar leads com campanhas do Google Ads
   */
  async syncLeadsWithCampaigns() {
    try {
      const campaigns = await this.getCampaigns();
      
      // Ler leads atuais
      let leads = [];
      if (fs.existsSync(this.leadsPath)) {
        const data = fs.readFileSync(this.leadsPath, 'utf8');
        leads = JSON.parse(data);
      }

      // Para cada campanha, encontrar leads relacionados
      for (const [campaignId, campaign] of Object.entries(campaigns)) {
        const campaignLeads = leads.filter(lead => 
          lead.source === 'google_ads' && 
          lead.campaign_id === campaignId
        );

        if (campaignLeads.length > 0) {
          const conversion_rate = (campaignLeads.filter(l => l.qualified).length / campaignLeads.length) * 100;
          const potential_revenue = campaignLeads.filter(l => l.qualified).length * 2500; // Assumindo $2,500 por cliente

          console.log(`[Google Ads] ${campaign.name}:`);
          console.log(`  📊 Cliques: ${campaign.clicks}`);
          console.log(`  🎯 Leads: ${campaignLeads.length}`);
          console.log(`  ✅ Taxa: ${conversion_rate.toFixed(1)}%`);
          console.log(`  💰 Custo: $${campaign.costUSD.toFixed(2)}`);
          console.log(`  💵 Potencial: $${potential_revenue.toFixed(2)}`);
          console.log(`  📈 ROI: ${(potential_revenue / campaign.costUSD * 100).toFixed(0)}%`);
        }
      }

      this.lastSync = new Date();
      return campaigns;
    } catch (error) {
      console.error('[Google Ads] ✗ Erro ao sincronizar leads:', error.message);
    }
  }

  /**
   * Calcular ROI por campanha
   */
  calculateROI(campaign, leadsCount, conversionRate, avgDealValue = 2500) {
    const costUSD = campaign.costUSD;
    const qualifiedLeads = leadsCount * conversionRate;
    const revenue = qualifiedLeads * avgDealValue;
    const roi = ((revenue - costUSD) / costUSD) * 100;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalSpent: costUSD,
      leadsGenerated: leadsCount,
      leadsQualified: qualifiedLeads,
      potentialRevenue: revenue,
      roi: roi,
      profitMargin: revenue - costUSD,
      cpq: costUSD / (qualifiedLeads || 1) // Cost Per Qualified Lead
    };
  }

  /**
   * Obter relatório de performance
   */
  getPerformanceReport() {
    const campaigns = this.campaignsCache;
    const report = {
      timestamp: new Date().toISOString(),
      totalSpent: 0,
      totalClicks: 0,
      totalConversions: 0,
      campaigns: []
    };

    for (const [_, campaign] of Object.entries(campaigns)) {
      report.totalSpent += campaign.costUSD;
      report.totalClicks += campaign.clicks;
      report.totalConversions += campaign.conversions;
      
      report.campaigns.push({
        id: campaign.id,
        name: campaign.name,
        clicks: campaign.clicks,
        impressions: campaign.impressions,
        conversions: campaign.conversions,
        spend: campaign.costUSD.toFixed(2),
        cpc: campaign.cpc.toFixed(2),
        ctr: campaign.ctr.toFixed(2),
        conversionRate: campaign.conversionRate.toFixed(2),
        costPerConversion: campaign.costPerConversion.toFixed(2)
      });
    }

    report.totalSpent = report.totalSpent.toFixed(2);
    report.averageCPC = (report.totalSpent / (report.totalClicks || 1)).toFixed(2);
    report.averageCTR = report.totalClicks / (report.totalClicks + 1000 || 1); // Simplificado

    return report;
  }

  /**
   * Iniciar sincronização automática
   */
  startAutoSync() {
    setInterval(async () => {
      try {
        console.log('[Google Ads] 🔄 Sincronizando...');
        await this.syncLeadsWithCampaigns();
        console.log('[Google Ads] ✓ Sincronização concluída');
      } catch (error) {
        console.error('[Google Ads] ✗ Erro na sincronização:', error.message);
      }
    }, this.syncInterval);
  }

  /**
   * Parar sincronização automática
   */
  stopAutoSync() {
    clearInterval(this.syncInterval);
    console.log('[Google Ads] ⊘ Sincronização parada');
  }
}

module.exports = GoogleAdsIntegration;
