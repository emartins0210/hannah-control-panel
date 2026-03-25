/**
 * Facebook Ads API Integration Module
 * Sincroniza dados de campanhas do Facebook/Meta Ads com Hannah 3.0
 * 
 * Responsabilidades:
 * - Conectar com Facebook Ads API (Meta Graph API)
 * - Trazer dados de campanhas, gastos, conversões
 * - Rastrear ROI por campanha
 * - Sincronizar com leads armazenados
 * - Alertar sobre performance
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class FacebookAdsIntegration {
  constructor() {
    this.accessToken = process.env.FACEBOOK_ADS_ACCESS_TOKEN;
    this.businessAccountId = process.env.FACEBOOK_BUSINESS_ACCOUNT_ID;
    this.adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    this.apiVersion = 'v18.0';
    this.graphUrl = `https://graph.instagram.com/${this.apiVersion}`;
    this.syncInterval = 3600000; // 1 hora
    this.lastSync = null;
    this.campaignsCache = {};
    this.leadsPath = path.join(__dirname, '../config/leads.json');
  }

  /**
   * Inicializar conexão com Facebook Ads API
   */
  async initialize() {
    try {
      await this.verifyAccessToken();
      console.log('[Facebook Ads] ✓ Inicializado');
      this.startAutoSync();
    } catch (error) {
      console.error('[Facebook Ads] ✗ Erro na inicialização:', error.message);
      throw error;
    }
  }

  /**
   * Verificar se o token de acesso é válido
   */
  async verifyAccessToken() {
    try {
      const response = await axios.get(`${this.graphUrl}/me`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,email'
        }
      });

      if (response.data.id) {
        console.log('[Facebook Ads] ✓ Token válido');
        return true;
      }
    } catch (error) {
      throw new Error('Token de acesso inválido: ' + error.message);
    }
  }

  /**
   * Fazer requisição à API do Facebook
   */
  async apiRequest(endpoint, params = {}) {
    try {
      params.access_token = this.accessToken;
      
      const response = await axios.get(`${this.graphUrl}${endpoint}`, { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(`Erro na requisição: ${error.response.data.error?.message}`);
      }
      throw error;
    }
  }

  /**
   * Obter todas as campanhas do Facebook Ads
   */
  async getCampaigns() {
    try {
      const params = {
        fields: [
          'id',
          'name',
          'status',
          'objective',
          'created_time',
          'updated_time',
          'daily_budget',
          'lifetime_budget'
        ].join(',')
      };

      const response = await this.apiRequest(`/${this.adAccountId}/campaigns`, params);
      
      const campaigns = {};

      if (response.data) {
        for (const campaign of response.data) {
          campaigns[campaign.id] = {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            dailyBudget: campaign.daily_budget ? campaign.daily_budget / 100 : 0,
            lifetimeBudget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : 0,
            createdAt: campaign.created_time
          };

          // Obter insights (métricas) da campanha
          const insights = await this.getCampaignInsights(campaign.id);
          campaigns[campaign.id] = { ...campaigns[campaign.id], ...insights };
        }
      }

      this.campaignsCache = campaigns;
      return campaigns;
    } catch (error) {
      console.error('[Facebook Ads] ✗ Erro ao obter campanhas:', error.message);
      throw error;
    }
  }

  /**
   * Obter insights/métricas de uma campanha específica
   */
  async getCampaignInsights(campaignId) {
    try {
      const params = {
        fields: [
          'spend',
          'impressions',
          'clicks',
          'actions',
          'action_values',
          'cost_per_action_type',
          'ctr',
          'cpc'
        ].join(','),
        date_preset: 'last_30d'
      };

      const response = await this.apiRequest(`/${campaignId}/insights`, params);

      if (response.data && response.data.length > 0) {
        const data = response.data[0];
        
        return {
          spend: data.spend ? parseFloat(data.spend) : 0,
          impressions: data.impressions ? parseInt(data.impressions) : 0,
          clicks: data.clicks ? parseInt(data.clicks) : 0,
          ctr: data.ctr ? parseFloat(data.ctr) : 0,
          cpc: data.cpc ? parseFloat(data.cpc) : 0,
          conversions: this.parseActions(data.actions),
          conversionValue: this.parseActionValues(data.action_values),
          costPerAction: this.parseCostPerAction(data.cost_per_action_type)
        };
      }

      return {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        conversionValue: 0
      };
    } catch (error) {
      console.error(`[Facebook Ads] ✗ Erro ao obter insights de ${campaignId}:`, error.message);
      return {};
    }
  }

  /**
   * Parse de ações/conversões
   */
  parseActions(actions) {
    if (!actions || !Array.isArray(actions)) return 0;
    
    let total = 0;
    for (const action of actions) {
      if (action.action_type === 'landing_page_view' || action.action_type === 'lead') {
        total += parseInt(action.value) || 0;
      }
    }
    return total;
  }

  /**
   * Parse de valores de ações
   */
  parseActionValues(actionValues) {
    if (!actionValues || !Array.isArray(actionValues)) return 0;
    
    let total = 0;
    for (const av of actionValues) {
      if (av.action_type === 'lead' || av.action_type === 'offsite_conversion.fb_pixel_lead') {
        total += parseFloat(av.value) || 0;
      }
    }
    return total;
  }

  /**
   * Parse de custo por ação
   */
  parseCostPerAction(costPerActionType) {
    const result = {};
    if (!costPerActionType || !Array.isArray(costPerActionType)) return result;
    
    for (const cpa of costPerActionType) {
      result[cpa.action_type] = parseFloat(cpa.value) || 0;
    }
    return result;
  }

  /**
   * Obter conversões dos últimos N dias
   */
  async getConversions(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const campaigns = this.campaignsCache;
      const conversions = {};

      for (const [campaignId, campaign] of Object.entries(campaigns)) {
        conversions[campaignId] = {
          campaignId: campaignId,
          campaignName: campaign.name,
          conversions: campaign.conversions || 0,
          conversionValue: campaign.conversionValue || 0,
          days: days
        };
      }

      return conversions;
    } catch (error) {
      console.error('[Facebook Ads] ✗ Erro ao obter conversões:', error.message);
      throw error;
    }
  }

  /**
   * Sincronizar leads com campanhas do Facebook Ads
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
          lead.source === 'facebook_ads' && 
          lead.campaign_id === campaignId
        );

        if (campaignLeads.length > 0) {
          const conversion_rate = (campaignLeads.filter(l => l.qualified).length / campaignLeads.length) * 100;
          const potential_revenue = campaignLeads.filter(l => l.qualified).length * 2500;

          console.log(`[Facebook Ads] ${campaign.name}:`);
          console.log(`  💰 Gasto: $${campaign.spend.toFixed(2)}`);
          console.log(`  👁️ Impressões: ${campaign.impressions}`);
          console.log(`  🖱️ Cliques: ${campaign.clicks}`);
          console.log(`  🎯 Leads: ${campaignLeads.length}`);
          console.log(`  ✅ Taxa: ${conversion_rate.toFixed(1)}%`);
          console.log(`  💵 Potencial: $${potential_revenue.toFixed(2)}`);
          
          const roi = campaign.spend > 0 ? (potential_revenue / campaign.spend * 100) : 0;
          console.log(`  📈 ROI: ${roi.toFixed(0)}%`);
        }
      }

      this.lastSync = new Date();
      return campaigns;
    } catch (error) {
      console.error('[Facebook Ads] ✗ Erro ao sincronizar leads:', error.message);
    }
  }

  /**
   * Calcular ROI por campanha
   */
  calculateROI(campaign, leadsCount, conversionRate, avgDealValue = 2500) {
    const spend = campaign.spend;
    const qualifiedLeads = leadsCount * conversionRate;
    const revenue = qualifiedLeads * avgDealValue;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalSpent: spend,
      leadsGenerated: leadsCount,
      leadsQualified: qualifiedLeads,
      potentialRevenue: revenue,
      roi: roi,
      profitMargin: revenue - spend,
      cpl: spend / (leadsCount || 1) // Cost Per Lead
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
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      campaigns: []
    };

    for (const [_, campaign] of Object.entries(campaigns)) {
      report.totalSpent += campaign.spend || 0;
      report.totalImpressions += campaign.impressions || 0;
      report.totalClicks += campaign.clicks || 0;
      report.totalConversions += campaign.conversions || 0;
      
      report.campaigns.push({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        spend: (campaign.spend || 0).toFixed(2),
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        ctr: (campaign.ctr || 0).toFixed(2),
        cpc: (campaign.cpc || 0).toFixed(2),
        conversions: campaign.conversions || 0,
        conversionValue: (campaign.conversionValue || 0).toFixed(2)
      });
    }

    report.totalSpent = report.totalSpent.toFixed(2);
    report.averageCPC = (parseFloat(report.totalSpent) / (report.totalClicks || 1)).toFixed(2);
    report.averageCPL = (parseFloat(report.totalSpent) / (report.totalConversions || 1)).toFixed(2);

    return report;
  }

  /**
   * Iniciar sincronização automática
   */
  startAutoSync() {
    setInterval(async () => {
      try {
        console.log('[Facebook Ads] 🔄 Sincronizando...');
        await this.syncLeadsWithCampaigns();
        console.log('[Facebook Ads] ✓ Sincronização concluída');
      } catch (error) {
        console.error('[Facebook Ads] ✗ Erro na sincronização:', error.message);
      }
    }, this.syncInterval);
  }

  /**
   * Parar sincronização automática
   */
  stopAutoSync() {
    clearInterval(this.syncInterval);
    console.log('[Facebook Ads] ⊘ Sincronização parada');
  }
}

module.exports = FacebookAdsIntegration;
