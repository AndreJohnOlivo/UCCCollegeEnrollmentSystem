FROM node:14

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the public directory and other application files
COPY public ./public
COPY app.js ./

# Debugging step to list the directory contents
RUN ls -la /usr/src/app
RUN ls -la /usr/src/app/public

# Expose port 5500 and start the app
EXPOSE 5500
CMD ["node", "app.js"]

