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
```
$docker image build -t demo:bad -f Dockerfile.bad .
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

```
$docker image build -t demo:secure -f Dockerfile.secure .
```

* Check size of the image
```
$docker image ls demo:secure
```

Try scan again !!
```
$trivy image demo:secure
$docker scout cves demo:secure
```

## 5. Checklists for building secure NodeJS Docker images in production
* Use a specific NodeJS version
* Use a non-root user
* Use a `.dockerignore` file to exclude unnecessary files and secrets
* Use distroless base image
* Scan your image for vulnerabilities
* Use multi-stage builds to keep the final image small and secure