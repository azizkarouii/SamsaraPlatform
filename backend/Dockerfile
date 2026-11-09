# API Spring Boot. Build: docker build -t samsara-backend backend
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Dependencies first: they stay cached while only the code changes
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S samsara && adduser -S samsara -G samsara \
    && mkdir -p /data/uploads && chown samsara:samsara /data/uploads
COPY --from=build /app/target/*.jar app.jar
USER samsara
ENV STORAGE_LOCAL_DIR=/data/uploads
EXPOSE 3001
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
