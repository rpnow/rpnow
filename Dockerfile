# Using Node v6 (LTS)
FROM node:6

# Use node user, give permissions to /srv
RUN chown -R node:node /srv
WORKDIR /srv
USER node

# Copy in source and install application
COPY package.json .
RUN npm cache clean && npm install
# COPY src src

# Expose HTTP over port 8080
EXPOSE 8080
ENV PORT=8080

# Container runs node server
CMD ["npm", "start"]
