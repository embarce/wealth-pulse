# 使用官方 Maven 镜像作为基础镜像
FROM maven:3.8.4-openjdk-17-slim AS build

# 设置工作目录
WORKDIR /app
# 复制整个项目到容器中
COPY . .

ARG PROFILE=pro

# 编译项目
RUN mvn clean package -Dmaven.test.skip=true -P ${PROFILE}

# 使用一个更轻量级的基础镜像来运行应用
FROM openjdk:17.0.2-oracle

ENV TZ Asia/Shanghai

RUN mkdir -p /root/ai/logs

# 复制构建产物（使用通配符避免版本号固定问题）
COPY --from=build /app/target/wealth-pulse-api-*.jar /root/server.jar

EXPOSE 9090
# 设置容器启动命令
ENTRYPOINT ["java", "-jar", "/root/server.jar"]
