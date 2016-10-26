# Using Node v4 (LTS)
FROM node:4

# Copy in source and install application
WORKDIR /srv
COPY package.json .
RUN npm install
COPY . .

# Create service user
RUN groupadd -r rpnow && useradd -r -g rpnow rpnow
USER rpnow

# Expose HTTP (port 80)
EXPOSE 80

# Container runs node server
CMD npm start
