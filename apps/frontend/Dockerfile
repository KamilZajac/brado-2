# Use a lightweight Node.js image for the Angular app
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY apps/frontend/package*.json ./
RUN npm install

# Copy application files and build
COPY apps/frontend/ .
RUN npm run build

# Use an Nginx image to serve the static Angular app
FROM nginx:alpine
COPY --from=build /app/www /usr/share/nginx/html

# Expose port for the Angular app
EXPOSE 8080

# Default command to start Nginx
CMD ["nginx", "-g", "daemon off;"]
