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

## 7. Sign Container Images with Cosign
* [Cosign](https://github.com/sigstore/cosign)

### Image signing solves critical supply chain problems:
* Provenance: Prove an image came from your CI/CD system
* Integrity: Detect if an image was modified after signing
* Policy enforcement: Block unsigned images from deployment
* Compliance: Meet regulatory requirements for software supply chain security
* Non-repudiation: Audit trail of who signed what and when

Install [Cosign](https://github.com/sigstore/cosign/releases)
```
# macOS with Homebrew
$brew install cosign

# Linux (download from GitHub)
$wget https://github.com/sigstore/cosign/releases/download/v3.0.6/cosign-linux-amd64
$chmod +x cosign-linux-amd64
$sudo mv cosign-linux-amd64 /usr/local/bin/cosign

# Verify installation
$cosign version

 ______   ______        _______. __    _______ .__   __.
 /      | /  __  \      /       ||  |  /  _____||  \ |  |
|  ,----'|  |  |  |    |   (----`|  | |  |  __  |   \|  |
|  |     |  |  |  |     \   \    |  | |  | |_ | |  . `  |
|  `----.|  `--'  | .----)   |   |  | |  |__| | |  |\   |
 \______| \______/  |_______/    |__|  \______| |__| \__|
cosign: A tool for Container Signing, Verification and Storage in an OCI registry.

GitVersion:    v3.1.0
GitCommit:     d253adffe00042d99e7bd7cdcd1d6d2abc3d750d
GitTreeState:  "clean"
BuildDate:     2026-06-05T22:19:50Z
GoVersion:     go1.26.4
Compiler:      gc
Platform:      darwin/arm64
```

### 7.1 Example with sign by key pair
```
# Generate a key pair
$cosign generate-key-pair

# Sign the image
$docker image tag demo:secure localhost:5001/demo:secure
$cosign sign --key cosign.key localhost:5001/demo:secure

# Push image to registry v2
$docker push localhost:5001/demo:secure
...
secure: digest: sha256:80a45109bc39b23a3edcaa89ee5c76ece85987d0a220ffe7782768ecc846c147 size: 5952

# Check the image in the registry
$curl -X GET http://localhost:5001/v2/_catalog

# Verify the signature
$cosign verify --key cosign.pub localhost:5001/demo:secure
```

### 7.2 Example with sign with OIDC/keyless
```
# Sign the image with OIDC/keyless
$cosign sign  localhost:5001/demo:secure

# Verify the signature
$cosign verify  localhost:5001/demo:secure
``` 

## 8. Generate and Ingest SBOM with CycloneDX and Dependency-Track
* [CycloneDX](https://cyclonedx.org/) - A lightweight SBOM standard
* [Dependency-Track](https://dependencytrack.org/) - A Software Composition Analysis (SCA) platform for managing vulnerabilities in third-party components


### 8.1 Generate Application-Level SBOM (npm) 
* package-lock.json -> cyclonedx-npm
```
$npx @cyclonedx/cyclonedx-npm --output-file bom-app.json
```

### 8.2 Generate Image-Level SBOM (Docker)
* docker image -> [syft](https://github.com/anchore/syft)
```
$syft docker:demo:secure -o cyclonedx-json > bom-image.json
```

### 8.3 Publish SBOM into Dependency-Track
* user=admin
* password=admin

Generate an API Key
* In the Dependency-Track UI, navigate to Administration > Access Management > Teams
* Select the Automation team (or create a new one)
* Copy or generate an API Key

Publish the SBOM using the API
```
$curl -X "POST" "http://152.42.196.27:8080/api/v1/bom" \
     -H 'Content-Type: multipart/form-data' \
     -H "X-Api-Key: odt_Gzcjoae7_1Erh1J0MhNdkmAnfa4BfwmuYeIxBnad0" \
     -F "autoCreate=false" \
     -F "projectName=nodejs" \
     -F "bom=@bom-app.json"
```

## Conclusion
* Developer Write Code
* Multi-Stage Docker Build
  * Drops Build-Tools & DevDependencies
* Distroless Runtime Stage
  * Removes OS Utilities & Shells
* CycloneDX Generation
  * Extracts Complete Component Inventory
* Dependency-Track Ingestion
  * Continuous Daily Threat Matching