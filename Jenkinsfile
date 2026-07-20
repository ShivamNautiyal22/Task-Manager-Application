pipeline {
    agent any
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO_BACKEND = 'task-manager-backend'
        ECR_REPO_FRONTEND = 'task-manager-frontend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Build & Push Backend') {
            steps {
                script {
                    sh "docker build -t ${ECR_REPO_BACKEND}:${IMAGE_TAG} -f backend/Dockerfile ."
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com"
                    sh "docker tag ${ECR_REPO_BACKEND}:${IMAGE_TAG} \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com/${ECR_REPO_BACKEND}:${IMAGE_TAG}"
                    sh "docker push \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com/${ECR_REPO_BACKEND}:${IMAGE_TAG}"
                }
            }
        }
        stage('Build & Push Frontend') {
            steps {
                script {
                    sh "docker build -t ${ECR_REPO_FRONTEND}:${IMAGE_TAG} -f frontend/Dockerfile ."
                    sh "docker tag ${ECR_REPO_FRONTEND}:${IMAGE_TAG} \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com/${ECR_REPO_FRONTEND}:${IMAGE_TAG}"
                    sh "docker push \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com/${ECR_REPO_FRONTEND}:${IMAGE_TAG}"
                }
            }
        }
        stage('Deploy') {
            steps {
                sshagent(['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ubuntu@YOUR_PROD_EC2_IP "
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com
                            docker pull \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com/${ECR_REPO_BACKEND}:${IMAGE_TAG}
                            docker pull \${AWS_ACCOUNT_ID}.dkr.ecr.\${AWS_REGION}.amazonaws.com/${ECR_REPO_FRONTEND}:${IMAGE_TAG}
                            cd /home/ubuntu/task-manager
                            IMAGE_TAG=${IMAGE_TAG} docker-compose up -d --force-recreate
                        "
                    '''
                }
            }
        }
    }
}