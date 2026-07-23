pipeline {
    agent any
    environment {
        AWS_REGION = 'eu-west-2'
        AWS_ACCOUNT_ID = '541341196909'
        ECR_REPO_BACKEND = 'task-manager-backend'
        ECR_REPO_FRONTEND = 'task-manager-frontend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        PROD_EC2_IP = '18.169.244.130'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Build Backend') {
            steps {
                sh "docker build -t ${ECR_REPO_BACKEND}:${IMAGE_TAG} -f backend/Dockerfile ."
            }
        }
        stage('Build Frontend') {
            steps {
                sh "docker build -t ${ECR_REPO_FRONTEND}:${IMAGE_TAG} -f frontend/Dockerfile ."
            }
        }
        stage('Login to ECR') {
            steps {
                withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', credentialsId: 'aws-credentials', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh 'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com'
                }
            }
        }
        stage('Push to ECR') {
            steps {
                withCredentials([aws(accessKeyVariable: 'AWS_ACCESS_KEY_ID', credentialsId: 'aws-credentials', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh '''
                        aws ecr describe-repositories --repository-names ${ECR_REPO_BACKEND} || aws ecr create-repository --repository-name ${ECR_REPO_BACKEND}
                        aws ecr describe-repositories --repository-names ${ECR_REPO_FRONTEND} || aws ecr create-repository --repository-name ${ECR_REPO_FRONTEND}
                    '''
                    sh "docker tag ${ECR_REPO_BACKEND}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_BACKEND}:${IMAGE_TAG}"
                    sh "docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_BACKEND}:${IMAGE_TAG}"
                    
                    sh "docker tag ${ECR_REPO_FRONTEND}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_FRONTEND}:${IMAGE_TAG}"
                    sh "docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_FRONTEND}:${IMAGE_TAG}"
                }
            }
        }
        stage('Deploy to Prod') {
            steps {
                sshagent(['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ubuntu@${PROD_EC2_IP} "
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                            docker pull ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_BACKEND}:${IMAGE_TAG}
                            docker pull ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_FRONTEND}:${IMAGE_TAG}
                            cd /home/ubuntu/task-manager
                            IMAGE_TAG=${IMAGE_TAG} docker compose up -d --force-recreate
                        "
                    '''
                }
            }
        }
    }
}
