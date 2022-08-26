#!/bin/bash
set -e
set -x

STAGE=$1
TAG=$2
LABEL=$3
PRIVATE_ECR=$4
REGION=$5

if [ $PRIVATE_ECR == "true" ]
then
  aws ecr get-login-password --region $REGION | docker login -u AWS --password-stdin $ECR_URL
  aws ecr describe-repositories --repository-names $REPO_NAME-builder --region $REGION || aws ecr create-repository --repository-name $REPO_NAME-builder --region $REGION
  aws ecr describe-repositories --repository-names $REPO_NAME-api --region $REGION || aws ecr create-repository --repository-name $API_REPO_NAME-builder --region $REGION
  aws ecr describe-repositories --repository-names $REPO_NAME-analytics --region $REGION || aws ecr create-repository --repository-name $ANA_REPO_NAME-builder --region $REGION
  aws ecr describe-repositories --repository-names $REPO_NAME-client --region $REGION || aws ecr create-repository --repository-name $CLIENT_REPO_NAME-builder --region $REGION
  aws ecr describe-repositories --repository-names $REPO_NAME-instanceserver --region $REGION || aws ecr create-repository --repository-name $INSTANCE_REPO_NAME-builder --region $REGION
  node ./scripts/prune_ecr_images.js --repoName $REPO_NAME-builder --region $REGION
  node ./scripts/prune_ecr_images.js --repoName $REPO_NAME-api --region $REGION
  node ./scripts/prune_ecr_images.js --repoName $REPO_NAME-analytics --region $REGION
  node ./scripts/prune_ecr_images.js --repoName $REPO_NAME-client --region $REGION
  node ./scripts/prune_ecr_images.js --repoName $REPO_NAME-instanceserver --region $REGION
else
  aws ecr-public get-login-password --region us-east-1 | docker login -u AWS --password-stdin $ECR_URL
  aws ecr-public describe-repositories --repository-names $REPO_NAME-builder --region us-east-1 || aws ecr-public create-repository --repository-name $REPO_NAME-builder --region us-east-1
  node ./scripts/prune_ecr_images.js --repoName $REPO_NAME-builder --region us-east-1 --public
fi

docker tag $LABEL $ECR_URL/$REPO_NAME-builder:$TAG
docker tag $LABEL $ECR_URL/$REPO_NAME-builder:latest_$STAGE
docker tag $LABEL $ECR_URL/$REPO_NAME-api:$TAG
docker tag $LABEL $ECR_URL/$REPO_NAME-api:latest_$STAGE
docker tag $LABEL $ECR_URL/$REPO_NAME-analytics:$TAG
docker tag $LABEL $ECR_URL/$REPO_NAME-analytics:latest_$STAGE
docker tag $LABEL $ECR_URL/$REPO_NAME-client:$TAG
docker tag $LABEL $ECR_URL/$REPO_NAME-client:latest_$STAGE
docker tag $LABEL $ECR_URL/$REPO_NAME-instanceserver:$TAG
docker tag $LABEL $ECR_URL/$REPO_NAME-instanceserver:latest_$STAGE
docker push $ECR_URL/$REPO_NAME-builder:$TAG
docker push $ECR_URL/$REPO_NAME-builder:latest_$STAGE
docker push $ECR_URL/$REPO_NAME-api:$TAG
docker push $ECR_URL/$REPO_NAME-api:latest_$STAGE
docker push $ECR_URL/$REPO_NAME-analytics:$TAG
docker push $ECR_URL/$REPO_NAME-analytics:latest_$STAGE
docker push $ECR_URL/$REPO_NAME-client:$TAG
docker push $ECR_URL/$REPO_NAME-client:latest_$STAGE
docker push $ECR_URL/$REPO_NAME-instanceserver:$TAG
docker push $ECR_URL/$REPO_NAME-instanceserver:latest_$STAGE
