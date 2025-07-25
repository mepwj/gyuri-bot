# Docker로 규리봇 배포하기

## 빌드 및 실행 방법

### 1. Docker 이미지 빌드
```bash
docker build -t gyuri-bot .
```

### 2. Docker 컨테이너 실행
```bash
docker run -d \
  --name gyuri-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=your_discord_token_here \
  -e CLIENT_ID=your_client_id_here \
  gyuri-bot
```

### 3. Docker Compose 사용 (권장)
```bash
# .env 파일에 환경변수 설정 후
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

## 서버 배포 절차

1. 서버에 Docker와 Docker Compose 설치
2. 프로젝트 파일을 서버로 복사
3. `.env` 파일 생성 및 환경변수 설정
4. `docker-compose up -d` 실행

## 주의사항
- `.env` 파일은 절대 git에 커밋하지 마세요
- 컨테이너는 자동으로 재시작되도록 설정되어 있습니다
- 로그는 `./logs` 디렉토리에 저장됩니다