# Workshop Secure Kubernetes
* [OWASP Kubernetes Top Ten](https://owasp.org/www-project-kubernetes-top-ten/)

## 1. Deploy with better security
Least Privilege Principle in Kubernetes to deployment with better security
* RunAsNonRoot: true
* allowPrivilegeEscalation: false
* readOnlyRootFilesystem: true
* capabilities.drop: ALL
* seccompProfile: RuntimeDefault
* automountServiceAccountToken: false
* Image tag pinned (not :latest)
* Resource requests and limits set
* Liveness and readiness probes defined

```
$kubectl apply -f better.yml
$POD=$(kubectl get pod -l app=nginx -o jsonpath='{.items[0].metadata.name}')
$echo $POD
```

## 2. Check :: Insecure Workload Configurations
```
# Inspect the full securityContext (pod + container)
$kubectl get pod $POD -o jsonpath='{.spec.securityContext}{"\n"}'
$kubectl get pod $POD -o jsonpath='{.spec.containers[0].securityContext}{"\n"}'

# Quick boolean checks
$kubectl get pod $POD -o jsonpath='runAsNonRoot={.spec.securityContext.runAsNonRoot}{"\n"}'
$kubectl get pod $POD -o jsonpath='privEsc={.spec.containers[0].securityContext.allowPrivilegeEscalation}{"\n"}'
$kubectl get pod $POD -o jsonpath='readOnlyRootFs={.spec.containers[0].securityContext.readOnlyRootFilesystem}{"\n"}'
$kubectl get pod $POD -o jsonpath='caps={.spec.containers[0].securityContext.capabilities.drop}{"\n"}'
$kubectl get pod $POD -o jsonpath='seccomp={.spec.securityContext.seccompProfile.type}{"\n"}'

# Runtime proof: should NOT be root (uid=101), root filesystem should be read-only
$kubectl exec $POD -- id
$kubectl exec $POD -- touch /test.txt   # expect: "Read-only file system"
```

## 3. Check :: Overly Permissive RBAC / Service Account Token
```
# Confirm the SA token is NOT auto-mounted
$kubectl get pod $POD -o jsonpath='automount={.spec.automountServiceAccountToken}{"\n"}'

# Runtime proof: token path should not exist
$kubectl exec $POD -- ls /var/run/secrets/kubernetes.io/serviceaccount 2>&1 || echo "No token mounted (good)"

# Review what the SA is actually allowed to do
$kubectl auth can-i --list --as=system:serviceaccount:default:default
```

## 4. Image / Supply Chain
```
# Confirm a pinned image tag (not :latest)
$kubectl get pod $POD -o jsonpath='image={.spec.containers[0].image}{"\n"}'
$kubectl get pod $POD -o jsonpath='pullPolicy={.spec.containers[0].imagePullPolicy}{"\n"}'

# Verify the actual running digest
$kubectl get pod $POD -o jsonpath='{.status.containerStatuses[0].imageID}{"\n"}'
```

## 5. Resource Limits (DoS protection)
```
# Check requests and limits are set
$kubectl get pod $POD -o jsonpath='{.spec.containers[0].resources}{"\n"}'

# Human-readable view
$kubectl describe pod $POD | grep -A6 -E "Limits|Requests"
```

Probes & Health (reliability)
```
$kubectl get pod $POD -o jsonpath='liveness={.spec.containers[0].livenessProbe}{"\n"}'
$kubectl get pod $POD -o jsonpath='readiness={.spec.containers[0].readinessProbe}{"\n"}'

$kubectl get pod $POD   # READY column should show 1/1
```

## 6. Try to audit all
```
# Dump the full effective spec for manual review
$kubectl get pod $POD -o yaml | less

# See events/warnings (admission rejections, image pull errors, OOMKills)
$kubectl describe pod $POD
$kubectl get events --field-selector involvedObject.name=$POD
```

## 7. Automated scanners manifest files
```
$trivy config bad.yml
$trivy config better.yml

$trivy k8s minikube --report summary pod/$POD
```

## 8. Network Policies !!
* [minikube with Calico](https://docs.tigera.io/calico/latest/getting-started/kubernetes/minikube) (a CNI that enforces NetworkPolicy)
* `default-deny-all` — denies all ingress/egress as the secure baseline.
* `nginx-allow-ingress` — only role=frontend pods can reach nginx on port 8080.
* `nginx-allow-dns` — only DNS egress to kube-dns is allowed.

```
# 1. Cluster with a policy-enforcing CNI (already running)
$minikube delete

$minikube start --cni=calico
$kubectl get pods -n kube-system -l k8s-app=calico-node   # calico-node Running

# 2. Deploy app + service
$kubectl apply -f better.yml
$kubectl apply -f service.yml

$kubectl get pod
$kubectl get svc
$kubectl get endpoints nginx                              # shows podIP:8080

# 3. Apply policies
$kubectl apply -f k04-networkpolicy.yml
$kubectl get networkpolicy

# 4. Prove enforcement
$kubectl run test-blocked --rm -i --image=curlimages/curl --restart=Never \
  --labels="role=attacker" -- curl -s -m5 -o /dev/null -w "HTTP %{http_code}\n" http://nginx:8080   # 000
  
$kubectl run test-allowed --rm -i --image=curlimages/curl --restart=Never \
  --labels="role=frontend" -- curl -s -m5 -o /dev/null -w "HTTP %{http_code}\n" http://nginx:8080   # 200
```

## 9. Pod Security Admission (PSA)
* Namespace-level Pod Security Admission set to restricted
```
kubectl apply -f k08-pod-security-admission.yml

# Verify the PSA labels are present
$kubectl get ns default -o jsonpath='{.metadata.labels}' | tr ',' '\n'
$kubectl get ns secure-apps -o jsonpath='{.metadata.labels}' | tr ',' '\n'

# Or label the existing namespace imperatively
$kubectl label --overwrite ns default \
  pod-security.kubernetes.io/enforce=restricted

# Proof it works: an insecure pod should be REJECTED
$kubectl apply -f bad.yml      # expect: error "violates PodSecurity restricted"

# Proof better.yml passes
$kubectl apply -f better.yml   # expect: created successfully
```