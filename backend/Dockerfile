# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json) first
# This leverages Docker cache layers
COPY package*.json ./

# Install app dependencies
RUN npm install --production
# If you have build steps that require dev dependencies, install all deps first,
# build, then prune dev dependencies:
# COPY . .
# RUN npm install
# RUN npm run build
# RUN npm prune --production

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define environment variables (defaults, can be overridden)
# ENV NODE_ENV=production
# ENV PORT=5000
# ENV MONGO_URI=mongodb://mongo:27017/familymatters
# ENV REDIS_URL=redis://redis:6379
# ENV JWT_SECRET=your_production_secret # IMPORTANT: Set this securely

# Run the app when the container launches
CMD [ "npm", "start" ] 