FROM node:18-alpine

WORKDIR /app

# Copiar arquivos do backend
COPY backend/package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o resto do código
COPY backend/ ./

# Copiar frontend para servir estático
COPY frontend/ ./public/

# Expor porta
EXPOSE 3000

# Iniciar
CMD ["node", "server.js"]
