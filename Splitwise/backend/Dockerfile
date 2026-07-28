# Multi-stage build: compile with Maven (no wrapper committed, see CLAUDE.md), run on a slim JRE.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Render sets $PORT at runtime; application.yml's server.port already reads it.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
