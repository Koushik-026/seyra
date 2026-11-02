FROM node:24-bookworm-slim AS node-runtime
FROM eclipse-temurin:21-jdk-jammy AS build
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY dependencies.lock.json package.json ./
COPY scripts/ ./scripts/
COPY backend/ ./backend/
RUN node scripts/download-libraries.mjs && node scripts/build.mjs

FROM eclipse-temurin:21-jre-jammy
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/lib ./lib
COPY package.json ./
COPY scripts/ ./scripts/
COPY web/ ./web/
COPY database/ ./database/
RUN mkdir -p data tmp && chown -R 10001:10001 /app
USER 10001:10001
ENV NODE_ENV=production PLANNER_PUBLIC_DEMO=1 JAVA_TOOL_OPTIONS="-Xmx256m" PORT=10000
EXPOSE 10000
CMD ["node", "scripts/start.mjs", "--no-build"]
