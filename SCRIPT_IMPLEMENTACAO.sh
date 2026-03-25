#!/bin/bash

###############################################################################
#                                                                             #
#  SCRIPT DE IMPLEMENTAÇÃO - HANNAH 3.0                                      #
#  Automatiza a instalação de Health Monitor e Backup Manager                #
#                                                                             #
#  COMO USAR:                                                                #
#  1. Coloque este script na raiz do seu projeto Hannah                      #
#  2. Execute: chmod +x SCRIPT_IMPLEMENTACAO.sh                              #
#  3. Execute: ./SCRIPT_IMPLEMENTACAO.sh                                     #
#  4. Siga as instruções                                                     #
#                                                                             #
###############################################################################

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║      SCRIPT DE IMPLEMENTAÇÃO - HANNAH 3.0 - PROTEÇÕES          ║"
echo "║              Health Monitor + Backup Automático                 ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Verificar se está no diretório certo
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ ERRO: Não encontrado server.js${NC}"
    echo "Execute este script na raiz do seu projeto Hannah"
    exit 1
fi

echo -e "${GREEN}✅ Projeto encontrado!${NC}\n"

# PASSO 1: Criar diretórios
echo -e "${YELLOW}[PASSO 1] Criando diretórios...${NC}"

mkdir -p modules
mkdir -p backup
mkdir -p config
mkdir -p logs

echo -e "${GREEN}✅ Diretórios criados${NC}\n"

# PASSO 2: Copiar health-monitor.js
echo -e "${YELLOW}[PASSO 2] Instalando Health Monitor...${NC}"

if [ -f "modules/health-monitor.js" ]; then
    echo -e "${YELLOW}⚠️  Arquivo modules/health-monitor.js já existe${NC}"
    read -p "Sobrescrever? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Pulando..."
    else
        cp modules_health-monitor.js modules/health-monitor.js
        echo -e "${GREEN}✅ Health Monitor instalado${NC}"
    fi
else
    cp modules_health-monitor.js modules/health-monitor.js
    echo -e "${GREEN}✅ Health Monitor instalado${NC}"
fi

echo ""

# PASSO 3: Copiar backup-manager.js
echo -e "${YELLOW}[PASSO 3] Instalando Backup Manager...${NC}"

if [ -f "modules/backup-manager.js" ]; then
    echo -e "${YELLOW}⚠️  Arquivo modules/backup-manager.js já existe${NC}"
    read -p "Sobrescrever? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Pulando..."
    else
        cp modules_backup-manager.js modules/backup-manager.js
        echo -e "${GREEN}✅ Backup Manager instalado${NC}"
    fi
else
    cp modules_backup-manager.js modules/backup-manager.js
    echo -e "${GREEN}✅ Backup Manager instalado${NC}"
fi

echo ""

# PASSO 4: Criar backup inicial
echo -e "${YELLOW}[PASSO 4] Criando primeiro backup...${NC}"

if [ -f "config/leads.json" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M)
    cp config/leads.json backup/leads_${TIMESTAMP}_backup.json
    echo -e "${GREEN}✅ Backup inicial criado: backup/leads_${TIMESTAMP}_backup.json${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo config/leads.json não encontrado (criará ao primeiro uso)${NC}"
fi

echo ""

# PASSO 5: Instruções para editar server.js
echo -e "${YELLOW}[PASSO 5] Próximas instruções${NC}"
echo -e "${BLUE}"
echo "Para completar a instalação, edite seu server.js:"
echo ""
echo "1. Abra: server.js"
echo ""
echo "2. Adicione NO TOPO do arquivo (após requires iniciais):"
echo ""
echo "   const healthMonitor = require('./modules/health-monitor');"
echo "   const backupManager = require('./modules/backup-manager');"
echo ""
echo "3. Após criar/inicializar 'app' (const app = express()), adicione:"
echo ""
echo "   // Iniciar Health Monitor"
echo "   healthMonitor.startMonitoring();"
echo "   healthMonitor.attachToExpress(app);"
echo ""
echo "   // Iniciar Backup Automático"
echo "   backupManager.startAutomaticBackups();"
echo ""
echo "4. Salve o arquivo"
echo ""
echo "5. Faça deploy:"
echo "   git add modules/health-monitor.js modules/backup-manager.js server.js"
echo "   git commit -m 'feat: add health monitor and automatic backups'"
echo "   git push origin main"
echo ""
echo -e "${NC}"

# PASSO 6: Testar
echo -e "${YELLOW}[PASSO 6] Testando após editar server.js...${NC}"
echo -e "${BLUE}"
echo "Depois que fizer deploy:"
echo ""
echo "1. Aguarde o servidor reiniciar (1-2 min)"
echo ""
echo "2. Teste o health check:"
echo "   curl https://sua-url.railway.app/health"
echo ""
echo "3. Verifique os logs:"
echo "   tail -f logs/application.log | grep HEALTH"
echo ""
echo "4. Confirme que backups estão sendo criados:"
echo "   ls -la backup/"
echo ""
echo -e "${NC}"

# RESUMO FINAL
echo -e "${GREEN}"
echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║                ✅ SCRIPT CONCLUÍDO COM SUCESSO                  ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${YELLOW}CHECKLIST DE PRÓXIMOS PASSOS:${NC}"
echo "[ ] 1. Editar server.js com requires (vide instruções acima)"
echo "[ ] 2. Editar server.js com inicialização (vide instruções acima)"
echo "[ ] 3. Salvar server.js"
echo "[ ] 4. Git add / commit / push"
echo "[ ] 5. Aguardar deploy no Railway (1-2 min)"
echo "[ ] 6. Testar /health endpoint"
echo "[ ] 7. Verificar logs"
echo "[ ] 8. Confirmar backups sendo criados"
echo ""
echo -e "${GREEN}Tempo estimado total: 30 minutos${NC}\n"

echo "Para suporte, consulte:"
echo "  • PLANO_ACAO_PRATICO.md"
echo "  • VERIFICACAO_HANNAH_3.0_COMPLETA.md"
echo "  • DASHBOARD_HANNAH_3.0.txt"
echo ""

exit 0
