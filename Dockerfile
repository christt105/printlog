FROM node:22-alpine
ENV NODE_ENV=production PRINTS_DIR=/prints NOTES_DIR=/notes MODELS_DIR=/models DATA_DIR=/data
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
USER node
CMD ["node", "--disable-warning=ExperimentalWarning", "src/index.ts"]
