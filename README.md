# 🍊 규리봇 (Gyuri Bot)

Discord.js v14 기반의 귀엽고 다재다능한 Discord 봇입니다!

![규리봇 로고](assets/images/gyuri.png)

## 📋 목차

- [소개](#-소개)
- [주요 기능](#-주요-기능)
- [설치 방법](#-설치-방법)
- [환경 설정](#-환경-설정)
- [명령어 목록](#-명령어-목록)
- [프로젝트 구조](#-프로젝트-구조)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)
- [이미지 출처](#-이미지-출처)

## 🎯 소개

규리봇은 Discord 서버에 재미와 유용함을 더해주는 다목적 봇입니다. 인사, 운세, 메뉴 추천, 동기부여 메시지 등 다양한 기능을 제공하여 서버 멤버들과 즐거운 시간을 보낼 수 있도록 도와줍니다.

### ✨ 특징

- **Discord.js v14** 최신 버전 사용
- **슬래시 명령어** 및 **텍스트 명령어** 모두 지원
- **모듈화된 구조**로 쉬운 기능 확장
- **인터랙티브 UI** (버튼, 선택 메뉴 등)
- **쿨다운 시스템**으로 스팸 방지
- **로깅 시스템**으로 디버깅 용이

## 🚀 주요 기능

### 📌 기본 명령어
- **인사**: 시간대별 맞춤 인사 메시지
- **운세**: 일반/개발/연애/학업/건강 운세 제공
- **메뉴 추천**: 점심/저녁/야식/디저트 추천

### 🎮 엔터테인먼트
- **동기부여**: 상황별 응원 메시지
- **명언**: 다양한 카테고리의 명언 제공
- **농담**: 재미있는 농담과 아재개그
- **퀴즈**: 다양한 난이도의 퀴즈 게임

### 🛠️ 유틸리티
- **추천**: 활동/취미 추천
- **팁**: 일상/생산성/개발 팁 제공

## 📦 설치 방법

### 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn
- Discord 봇 토큰
- Docker & Docker Compose (서버 배포시)

### GitHub Actions 자동 배포 설정
GitHub Actions를 통한 자동 배포를 위해 다음 Secrets를 설정해야 합니다:

1. **GitHub 저장소 Settings > Secrets and variables > Actions**
2. **다음 Secrets 추가:**
   - `HOST`: 서버 IP 주소
   - `USERNAME`: SSH 사용자명
   - `PASSWORD`: SSH 비밀번호
   - `PORT`: SSH 포트 (기본: 22)
   - `DISCORD_TOKEN`: Discord 봇 토큰
   - `CLIENT_ID`: Discord 애플리케이션 Client ID

### 설치 단계

1. **저장소 클론**
```bash
git clone https://github.com/yourusername/gyuri-bot.git
cd gyuri-bot
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
```bash
cp .env.example .env
```

4. **.env 파일 편집**
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_test_guild_id_here
```

5. **슬래시 명령어 배포**
```bash
npm run deploy
```

6. **봇 실행**
```bash
npm start
```

개발 모드로 실행하려면:
```bash
npm run dev
```

## ⚙️ 환경 설정

### Discord 봇 토큰 얻기
1. [Discord Developer Portal](https://discord.com/developers/applications)에 접속
2. "New Application" 클릭하여 애플리케이션 생성
3. 좌측 메뉴에서 "Bot" 클릭
4. "Reset Token" 클릭하여 토큰 생성 (한 번만 표시되므로 안전하게 보관)
5. "General Information"에서 CLIENT_ID 확인

### .env 파일 설정
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_test_guild_id_here

# Bot Settings
PREFIX=!
EMBED_COLOR=#FFA500

# OpenAI API (Optional - for LLM features)
OPENAI_API_KEY=your_openai_api_key_here

# Environment
NODE_ENV=development
```

### 서버 배포시 환경변수 설정
Docker Compose를 사용하는 경우, 서버에 `.env` 파일을 생성해야 합니다:

1. **서버에 .env 파일 생성**
```bash
cd ~/gyuri-bot
cp .env.example .env
nano .env  # 또는 선호하는 에디터 사용
```

2. **필수 환경변수 입력**
```env
DISCORD_TOKEN=실제_봇_토큰_입력
CLIENT_ID=실제_클라이언트_ID_입력
```

3. **Docker Compose 재시작**
```bash
docker compose down
docker compose up -d
```

⚠️ **중요**: `.env` 파일은 절대 Git에 커밋하지 마세요!

### config.json 커스터마이징
`config/config.json` 파일에서 봇의 다양한 설정을 변경할 수 있습니다.

### 봇 초대 링크 생성
봇을 서버에 초대하려면 다음 URL 형식을 사용하세요:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025524736&scope=bot%20applications.commands
```

또는 다음 명령으로 초대 링크를 생성할 수 있습니다:
```bash
node -e "console.log('https://discord.com/api/oauth2/authorize?client_id=' + process.env.CLIENT_ID + '&permissions=277025524736&scope=bot%20applications.commands')"
```

## 📖 명령어 목록

### 텍스트 명령어 (Prefix: !)

| 명령어 | 별칭 | 설명 |
|--------|------|------|
| !안녕 | !규리야, !hello, !hi | 규리가 인사해요! |
| !운세 | !fortune, !오늘운세, !개발운세 | 오늘의 운세를 알려드려요! |
| !메뉴 | !점심, !저녁, !야식, !뭐먹지 | 메뉴를 추천해드려요! |
| !파이팅 | !힘내, !화이팅, !응원 | 응원 메시지를 보내요! |
| !명언 | !quote, !좋은말 | 영감을 주는 명언을 알려드려요! |
| !추천 | !뭐할까, !recommend | 활동을 추천해드려요! |
| !팁 | !tip, !꿀팁 | 유용한 팁을 알려드려요! |
| !농담 | !joke, !아재개그 | 재미있는 농담을 들려드려요! |
| !퀴즈 | !quiz, !문제 | 퀴즈를 풀어보세요! |

### 슬래시 명령어

모든 텍스트 명령어는 슬래시 명령어(`/`)로도 사용 가능합니다.

## 📁 프로젝트 구조

```
gyuri-bot/
├── src/
│   ├── commands/           # 명령어 파일들
│   ├── events/            # 이벤트 핸들러
│   ├── handlers/          # 핸들러 시스템
│   ├── data/              # JSON 데이터 파일
│   ├── utils/             # 유틸리티 함수
│   └── index.js           # 메인 엔트리 포인트
├── config/
│   ├── config.json        # 봇 설정
│   └── deploy-commands.js # 슬래시 명령어 배포
├── assets/
│   └── images/           # 이미지 파일
├── logs/                  # 로그 파일 (자동 생성)
├── .env                   # 환경 변수
├── package.json
└── README.md
```

## 🤝 기여하기

기여는 언제나 환영합니다! 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🎨 이미지 출처

### 규리 캐릭터 이미지
- **출처**: https://ko.ac-illust.com/clip-art/22114601
- **라이선스**: 개인 및 상업적 사용을 위한 무료 일러스트
- **저작자 표시**: 필요하지 않음

이 프로젝트에서 사용된 규리 캐릭터 이미지는 AC illustAC에서 제공하는 무료 일러스트로, 개인 및 상업적 용도로 자유롭게 사용할 수 있으며 저작자 표시가 필요하지 않습니다.

## 💬 문의

질문이나 제안사항이 있으시면 이슈를 열어주세요!

---

Made with ❤️ by Gyuri Bot Team