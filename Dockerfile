# Using Node v6 (LTS)
FROM node:6

# Expose HTTP (port 80)
EXPOSE 80

# Use node user, give permissions to /srv
RUN chown -R node:node /srv
WORKDIR /srv
USER node

# Copy in source and install application
COPY package.json .
RUN npm cache clean && npm install
# COPY server server

# Container runs node server
CMD ["npm", "start"]
