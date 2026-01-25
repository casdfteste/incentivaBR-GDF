FROM node:18-alpine

WORKDIR /app

# Copiar arquivos do backend
COPY backend/package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o resto do código do backend
COPY backend/ ./

# Copiar frontend para /frontend (onde o server.js espera: ../frontend)
COPY frontend/ /frontend/

# Expor porta
EXPOSE 3000

# Iniciar
CMD ["node", "server.js"]
