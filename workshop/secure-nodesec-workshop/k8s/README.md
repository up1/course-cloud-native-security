# Working with Kubernetes


## 1. Install and start [Minikube](https://minikube.sigs.k8s.io/docs/start/)
```
$minikube version                                          
minikube version: v1.38.1

$minikube start
$minikube status
```

## 2. Deploy the application to Kubernetes
```
$kubectl apply -f k8s/deployment.yaml
$kubectl apply -f k8s/service.yaml
```

List the pods and services
```
$kubectl get pods
$kubectl get services
```

## 3. Security mapping from docker-compose to Kubernetes

| Docker-compose |	Kubernetes |
|----------------|-----------------------| 
|cpus: '0.50' |	limits.cpu: 500m
|memory: 256M |	limits.memory: 256Mi
|read_only: true |	readOnlyRootFilesystem: true
|tmpfs: /tmp |	emptyDir (medium: Memory) mounted at tmp
|cap_drop: ALL |	capabilities.drop: [ALL]
|no-new-privileges:true |	allowPrivilegeEscalation: false
|restart: always |	default restartPolicy: Always
|distroless nonroot |	runAsNonRoot: true, runAsUser/Group: 65532


