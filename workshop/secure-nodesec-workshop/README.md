# Workshop with NodeJS and Docker

## 1. Build and start the application

```
$npm install
$npm start
```

Access to http://localhost:3000/


## 2. Build and start the application with Docker
Bad practice to write a Dockerfile
* node:latest
* Running as root user
* Leaking Development Secrets
  * `COPY . .`
  * without a `.dockerignore`

Build and run the bad image
```
$docker image build -t demo:bad -f Dockerfile.bad .

$docker container run -d -p 3000:3000 --name demo-bad demo:bad
```

Check size of the image
```
$docker image ls demo:bad
```

Access to container
```
$docker exec -it demo-bad sh
```

## 3. Scan the image 

with [Trivy](https://trivy.dev/)
```
$trivy image demo:bad
```

with [Docker scout](https://github.com/docker/scout-cli)
```
$docker scout cves demo:bad
```

* Check size of the image
```
$docker image ls demo:bad
```


## 4. Build and start the application with a secure Dockerfile
* [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/)
* Use [multi-stage build](https://docs.docker.com/build/building/multi-stage/)
* Use a specific NodeJS version
* Use a non-root user
* Use a `.dockerignore` file to exclude unnecessary files and secrets
* Use [distroless base image](https://github.com/googlecontainertools/distroless) for the final stage

Build and run the secure image
```
$docker image build -t demo:secure -f Dockerfile.secure .

$docker container run -d -p 3000:3000 --name demo-secure demo:secure
```

Check size of the image
```
$docker image ls demo:secure
```

Access to container 
```
$docker exec -it demo-secure sh
```




Try scan again !!
```
$trivy image demo:secure
$docker scout cves demo:secure
```

## 5. Checklists for building secure NodeJS Docker images in production
* Use a specific NodeJS version
* Least Privilege: Run the application as a non-root user
* Use a `.dockerignore` file to exclude unnecessary files and secrets
* Use distroless base image
* Scan your image for vulnerabilities
* Use multi-stage builds to keep the final image small and secure


## 6. Working with [Docker Compose](https://docs.docker.com/reference/compose-file/)
* Create a `docker-compose.yml` file to define the services, networks, and volumes for your application
* Use the `docker compose` command to build and start the application

* List of features in `docker-compose.yml`:
  * Build the image from the Dockerfile
  * Define the service and its dependencies
  * Map ports
  * Set environment variables
  * Use volumes for data persistence
  * Resource limits (CPU, Memory, process limits)
  * Runtime Security Privileges

```
$docker compose build
$docker compose up -d
$docker compose ps
$docker compose down
```

Check resource limits and runtime security privileges
```
$docker stats production-api-secure --no-stream

$docker compose exec app sh -c "cat /proc/1/limits"
$docker compose exec app sh -c "cat /proc/1/status | grep Cap"
$docker container exec --user root production-api-secure touch /usr/app/malicious.js
```