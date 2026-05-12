# notio

# Prerequisites

```shell
kubectl create namespace development
kubectl create secret docker-registry reg-hub-secret \
  --docker-server=registry.bibanka.com \
  --docker-username=admin \
  --docker-password=YourStrongPassword \
  -n development
  
# storageClass
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.32/deploy/local-path-storage.yaml
kubectl get storageclass
```

## Helm install

```shell
helm repo update
helm dependency build .

helm install notio-dev . \
  --namespace development \
  --create-namespace \
  --values values.yaml

kubectl get all -n development
```