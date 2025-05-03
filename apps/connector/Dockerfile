# Use a lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY apps/connector/package*.json ./

# Install dependencies for NodeJS service
RUN npm install --omit=dev

# Copy the entire code into the working directory
COPY apps/connector/ .
RUN npm run build


# Expose the server port
EXPOSE 4000

# Run the NodeJS application
CMD ["node", "dist/index.js"]
