 Use a lightweight Node image
    FROM node:18-alpine
    Set working directory
    WORKDIR /app
    Copy project files
    COPY . .
    (Optional) If you had a build command like npm run build, run it here
    RUN npm run build
    For now, we just verify files exist
    CMD ["ls", "-l"]