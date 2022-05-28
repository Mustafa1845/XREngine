#!/bin/bash
set -e
set -x

STAGE=$1
LABEL=$2
PRIVATE_ECR=$3
REGION=$4

echo "====================== all good build_docker_builder 1 ===================="


if [ $PRIVATE_ECR == "true" ]
then
echo "====================== all good build_docker_builder 2 ===================="

  aws ecr get-login-password --region $REGION | docker login -u AWS --password-stdin $ECR_URL
else
echo "====================== all good build_docker_builder 3 ===================="

  aws ecr-public get-login-password --region us-east-1 | docker login -u AWS --password-stdin $ECR_URL
fi

echo "====================== all good build_docker_builder 4 ===================="


DOCKER_BUILDKIT=1 docker build --cache-from $ECR_URL/$REPO_NAME-builder:latest_$STAGE --build-arg BUILDKIT_INLINE_CACHE=1 --tag $LABEL -f dockerfiles/builder/Dockerfile-builder .
echo "====================== all good build_docker_builder 69 ===================="
