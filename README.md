This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Google Maps 통합

이 프로젝트는 Google Maps API가 통합되어 있습니다.

### 환경 설정

1. `.env.local` 파일을 프로젝트 루트에 생성하세요:
```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_KEY=your_google_maps_api_key_here
```

2. Google Cloud Console에서 API 키를 발급받아 위 파일에 설정하세요.

### 사용 가능한 페이지

- `/` - 메인 페이지 (인덱스)
- `/map` - 위성지도 + 스트리트뷰 결합 페이지 (주석 처리됨)
- `/map2` - 위성지도 + 스트리트뷰 결합 페이지 (새로 구현)
- `/about` - 정보 페이지

### 주요 구성 요소

1. **GoogleMap 컴포넌트** (`components/GoogleMap.js`)
   - 재사용 가능한 Google Maps React 컴포넌트
   - 마커, 줌, 중심점 등 커스터마이징 가능
   - 로딩 상태 및 에러 처리 포함

2. **useGoogleMaps 훅** (`components/hooks/useGoogleMaps.js`)
   - Google Maps 기능을 쉽게 사용할 수 있는 커스텀 훅
   - 마커 추가/제거, 지도 이동, 정보창 등의 기능 제공

### 기능

- 지도 표시 및 확대/축소
- 마커 추가 및 제거
- 정보창 (InfoWindow) 표시
- 지도 위치 이동 (panTo)
- 서울 주요 관광지 빠른 이동
- 사용자 정의 마커 추가

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
