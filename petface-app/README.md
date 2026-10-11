# 펫페이스 (PetFace)

강아지·고양이 얼굴 사진 한 장으로 **기분 추정 · 건강 이상 신호 관찰 · 케어 팁 · 상품 추천**을 제공하는 앱입니다.
수익 모델: 프리미엄 구독(RevenueCat) + 광고(AdMob) + 내 쇼핑몰·제휴 상품 추천.

## 문서 (먼저 읽어 주세요)
| 문서 | 내용 |
|---|---|
| [docs/01_출시_가이드.md](docs/01_출시_가이드.md) | 계정 만들기부터 앱스토어 심사 제출까지 단계별 안내 |
| [docs/02_비용_수익_분석.md](docs/02_비용_수익_분석.md) | AI 분석 1회당 비용, 모델별 손익, 권장 설정 |
| [docs/03_개인정보처리방침_초안.md](docs/03_개인정보처리방침_초안.md) | 개인정보처리방침 초안(국외 이전 포함) |
| [docs/04_이용약관_초안.md](docs/04_이용약관_초안.md) | 이용약관 초안 |
| [docs/05_스토어_등록문구.md](docs/05_스토어_등록문구.md) | 앱 이름·설명·키워드(한·영·일), 스크린샷 구성 |
| [docs/06_추천상품_등록방법.md](docs/06_추천상품_등록방법.md) | 쇼핑몰·쿠팡파트너스 상품 연결 방법 |

## 구성
```
petface-app/
├─ src/app/            화면(Expo Router)
│  ├─ (tabs)/          홈 · 기록 · 추천템 · 설정
│  ├─ onboarding.tsx   시작 안내 + 유의사항 동의 + 반려동물 등록
│  ├─ analyze.tsx      분석 진행
│  ├─ result/[id].tsx  결과(기분·단서·건강 신호·고양이 통증 표정·케어 팁·추천 상품·공유)
│  └─ paywall.tsx      프리미엄 구독
├─ src/config/products.ts   추천 상품 목록 ← 쇼핑몰 링크는 여기서 관리
├─ src/locales/        한국어·영어·일본어 문구
├─ src/lib/            서버 통신, 결제, 광고, 저장, 상태 관리
├─ server/             AI 분석 서버(Cloudflare Workers + Claude API)
│  ├─ src/prompt.ts    AI 분석 지시문 ← 고치고 배포하면 앱 업데이트 없이 반영
│  └─ wrangler.toml    무료 횟수·한도·AI 모델 설정
└─ docs/               운영 문서
```

## 개발자용 빠른 실행
```bash
npm install
npx tsc --noEmit                 # 타입 검사
cd server && npm install && npm test   # 서버 단위 테스트
```
- 결제·광고 모듈이 들어 있어 **Expo Go 앱에서는 실행되지 않습니다.** 개발용 빌드(`eas build --profile development`)를 사용하세요.
- `.env`의 `EXPO_PUBLIC_API_URL`이 비어 있는 개발용 빌드는 **데모 모드**로 예시 결과를 보여 줍니다(AI 비용 없음).

## 데이터 처리 요약
- 사진은 분석 요청 때만 서버를 거쳐 Claude API(Anthropic)로 전송되며, 펫페이스 서버에는 저장하지 않습니다.
- 기록·사진·반려동물 정보는 사용자 기기에만 저장됩니다.
- 서버는 기기별 무료 횟수만 최대 48시간 동안 보관합니다.
