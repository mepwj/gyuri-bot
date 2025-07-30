# GitHub Actions 자동 배포 설정 가이드

## 1. GitHub Secrets 설정

GitHub 저장소에서 다음 Secrets를 설정해야 합니다:

1. 저장소 페이지에서 **Settings** → **Secrets and variables** → **Actions** 이동
2. **New repository secret** 클릭
3. 다음 Secrets 추가:

   - `HOST`: 우분투 서버 IP 주소 (예: 192.168.1.100)
   - `USERNAME`: SSH 사용자명
   - `PASSWORD`: SSH 비밀번호
   - `PORT`: SSH 포트 (기본값: 22)
   - `DISCORD_TOKEN`: Discord 봇 토큰
   - `CLIENT_ID`: Discord 애플리케이션 ID
   - `OPENAI_API_KEY`: OpenAI API 키 (선택사항, AI 대화 기능용)

## 2. 서버 초기 설정

우분투 서버에 SSH로 접속 후:

```bash
# 설정 스크립트 다운로드 및 실행
wget https://raw.githubusercontent.com/YOUR_USERNAME/gyuri-bot/main/scripts/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

또는 수동으로:

```bash
# 1. Docker & Docker Compose 설치
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER

# 2. 프로젝트 클론
cd ~
git clone https://github.com/YOUR_USERNAME/gyuri-bot.git
cd gyuri-bot

# 3. .env 파일 생성
nano .env
# 다음 내용 추가:
# DISCORD_TOKEN=your_discord_token_here
# CLIENT_ID=your_client_id_here
# OPENAI_API_KEY=your_openai_api_key_here (선택사항)

# 4. 첫 실행
docker-compose up -d
```

## 3. 배포 프로세스

1. 코드를 main 브랜치에 push
2. GitHub Actions가 자동으로 실행
3. 서버에 SSH 연결
4. 최신 코드 pull
5. Docker 이미지 재빌드
6. 컨테이너 재시작

## 4. 문제 해결

### SSH 연결 실패
- 서버 방화벽에서 SSH 포트(22) 허용 확인
- `sudo ufw allow 22`

### Docker 권한 오류
- 로그아웃 후 다시 로그인
- 또는 `newgrp docker` 실행

### 배포 후 봇이 실행되지 않음
- 서버에서 로그 확인: `docker-compose logs -f`
- .env 파일 설정 확인

## 5. 보안 권장사항

1. SSH 키 인증 사용 (비밀번호 대신)
2. fail2ban 설치로 무차별 대입 공격 방지
3. SSH 포트 변경 고려
4. 정기적인 시스템 업데이트