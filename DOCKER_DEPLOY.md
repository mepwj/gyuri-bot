# 규리봇 배포 가이드 (Mac mini + Tailscale)

## 개요
- 배포 호스트: Apple Silicon Mac mini
- 접속 경로: Tailscale (`macmini.tail03dabf.ts.net` / `100.97.1.31`)
- 자동 배포: `main` 푸시 시 GitHub Actions가 tailnet에 임시 가입 후 SSH로 배포

## Mac mini 1회 셋업

### 1. Tailscale
```bash
brew install tailscale
sudo brew services start tailscale
sudo tailscale up
```
관리 콘솔 → ACL에 `tag:ci`가 이 머신에 SSH(22) 가능하도록 설정.

### 2. 원격 로그인 활성
시스템 설정 → 일반 → 공유 → **원격 로그인** ON, 사용자 `mepwj` 허용.

### 3. Docker (colima 권장 — Apple Silicon 네이티브)
```bash
brew install colima docker docker-compose docker-buildx
colima start --cpu 2 --memory 4 --arch aarch64

# 부팅 시 자동 시작
brew services start colima
```

### 4. SSH 키
배포용 키페어를 로컬에서 생성한 뒤 공개키를 Mac mini에 등록:
```bash
ssh-keygen -t ed25519 -C "github-actions-gyuri-bot" -f ~/.ssh/gyuri_deploy
ssh-copy-id -i ~/.ssh/gyuri_deploy.pub mepwj@macmini.tail03dabf.ts.net
```
개인키 `~/.ssh/gyuri_deploy` 내용을 GitHub Secret `SSH_KEY`에 등록.

### 5. 프로젝트 클론 (최초 1회)
```bash
git clone https://github.com/mepwj/gyuri-bot.git ~/gyuri-bot
```
이후 워크플로가 `git pull`로 갱신.

## GitHub Secrets

| 이름 | 값 |
|---|---|
| `HOST` | `macmini.tail03dabf.ts.net` (또는 `100.97.1.31`) |
| `USERNAME` | `mepwj` |
| `SSH_KEY` | `~/.ssh/gyuri_deploy` 개인키 전체 |
| `PORT` | `22` |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID |
| `TS_OAUTH_SECRET` | Tailscale OAuth secret |
| `DISCORD_TOKEN` | Discord 봇 토큰 |
| `CLIENT_ID` | Discord 애플리케이션 Client ID |
| `GUILD_ID` | 슬래시 명령 등록할 길드 ID |
| `OPENAI_API_KEY` | OpenAI API 키 |

### Tailscale OAuth 발급
Tailscale admin → Settings → **OAuth clients** → New client
- Scopes: `auth_keys` (write)
- Tags: `tag:ci`
- 생성된 Client ID / Secret을 위 Secret에 등록

## 수동 배포 (긴급 시)
```bash
ssh mepwj@macmini.tail03dabf.ts.net
cd ~/gyuri-bot && git pull origin main
docker compose build
docker compose run --rm --no-deps gyuri-bot npm run deploy
docker compose up -d --remove-orphans
docker compose logs -f
```

## 운영 명령
```bash
docker compose ps
docker compose logs --tail=200 -f
docker compose restart
docker compose down
```

## 주의사항
- `.env`는 워크플로가 매 배포마다 Secrets로부터 새로 작성하므로 수동 편집 불필요
- colima가 종료되어 있으면 배포가 실패하므로 `brew services` 등록 권장
- Tailscale ACL에 `tag:ci` 권한이 빠지면 GitHub Actions가 Mac mini에 도달하지 못함
