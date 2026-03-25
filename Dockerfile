# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Production stage
FROM node:18-alpine

WORKDIR /app

# Instalar dumb-init para melhor handling de sinais
RUN apk add --no-cache dumb-init

# Copiar dependências do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar aplicação
COPY . .

# Criar diretório para dados
RUN mkdir -p dados-clientes && chmod 755 dados-clientes

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar owner dos arquivos
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)});"

# Usar dumb-init como entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Rodar aplicação
CMD ["node", "server.js"]
