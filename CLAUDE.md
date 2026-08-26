# 오속 타로 프로젝트 — Claude 전용 메모

## 프로젝트 개요
- **타로 사이트**: https://www.osok.kr
- **사주 사이트**: https://www.osok.kr/saju.html
- **호스팅**: Vercel (GitHub 연동 — GitHub에서 파일 드래그앤드롭하면 자동 배포)
- **도메인**: osok.kr (가비아에서 구매, Vercel 연결)
- **이메일 발송**: Resend (resend.com) — 도메인 인증 필요 (osok.kr)
- **DNS 관리**: 가비아 (my.gabia.com)
- **타로 메인 파일**: `index.html` / **사주 파일**: `saju.html`
- **서버리스 API**: `/api/` 폴더 (Vercel serverless functions)
- **DB**: Upstash Redis (주문번호/토큰 저장)
- **인스타**: @osok.mystic

## 결제 구조
- **결제 플랫폼**: 카카오페이 (독립몰 가맹점)
- **타로 상품 3종**:
  1. 오속타로 심층리딩 (기본)
  2. 오속타로 추가질문 (팔로우업 3회 추가)
  3. 오속타로 심층리딩 세트 (심층리딩 + 추가질문 포함, '세트' 키워드로 감지)
- **사주 상품 2종**:
  1. 내 질문 하나 집중 리딩 (4,900원)
  2. 프리미엄 종합 풀이 (14,900원)
- **결제 후 이메일 자동 발송**: Resend 사용 (`saju-email.js`)
- **그로블(Groble) 사용 안 함** (webhook.js 삭제 완료)

## 기능 현황
- 무료 카드 1일 1회 (localStorage로 날짜 체크)
- 주문번호 입력 → 리딩 시작
- 같은 주문번호 재입력 시 → 이전 리딩 복원 (localStorage)
- 추가질문 카운터: 기본 3회 / 세트 6회 (동적 계산)
- 이미지 저장 (html2canvas) / PDF 저장
- 카카오 채널 문의: http://pf.kakao.com/_bSudX/chat
- 리뷰 섹션 스크롤 (max-height: 420px)

## AI 리딩 설정
- **모델**: Claude API 사용 (claude-haiku 계열 추정)
- 카드 해석은 PDF 4권 내용 기반
- 항상 따뜻하고 공감적인 말투
- 카드가 안 좋아도 "전환점"으로 제시

## 사용자 정보
- 이름: 박지현 (운영자)
- 이메일: shypjh@gmail.com
- 카카오 웰컴프로그램 지원금 30만원 신청 완료

## 자주 쓰는 용어
- 심층리딩 = 메인 타로 리딩
- 추가질문 = 팔로우업 질문
- 세트 = 심층리딩 + 추가질문 묶음 상품
- 그로블 = 결제 플랫폼

## GitHub 업로드 방법
1. github.com 접속 → 본인 레포 들어가기
2. index.html 파일을 페이지에 드래그앤드롭
3. "Commit changes" 클릭
4. 2-3분 후 Vercel 자동 배포 완료
