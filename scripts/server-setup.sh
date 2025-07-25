#!/bin/bash

# 우분투 서버 초기 설정 스크립트

echo "🚀 규리봇 서버 설정을 시작합니다..."

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "📦 Docker 설치 중..."
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
fi

# Docker Compose 설치 확인
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Docker Compose 설치 중..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Git 설치 확인
if ! command -v git &> /dev/null; then
    echo "📦 Git 설치 중..."
    sudo apt-get install -y git
fi

# 프로젝트 클론
if [ ! -d "$HOME/gyuri-bot" ]; then
    echo "📥 프로젝트 클론 중..."
    cd $HOME
    git clone https://github.com/YOUR_USERNAME/gyuri-bot.git
    cd gyuri-bot
else
    echo "📥 프로젝트 업데이트 중..."
    cd $HOME/gyuri-bot
    git pull origin main
fi

# .env 파일 생성
if [ ! -f ".env" ]; then
    echo "⚙️ .env 파일을 생성해주세요:"
    echo "DISCORD_TOKEN=your_discord_token"
    echo "CLIENT_ID=your_client_id"
fi

echo "✅ 서버 설정이 완료되었습니다!"
echo "📝 .env 파일을 설정한 후 docker-compose up -d 명령을 실행하세요."