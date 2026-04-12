#!/bin/bash
# Vercel 배포 스크립트
# 사전 조건: Vercel CLI 설치 (npm i -g vercel), PostgreSQL DB 준비
#
# 사용법:
#   1. 최초 배포: bash scripts/deploy-vercel.sh setup
#   2. 이후 배포: bash scripts/deploy-vercel.sh deploy
#   3. 프로덕션:  bash scripts/deploy-vercel.sh production

set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

case "${1:-help}" in

  setup)
    echo "=== Vercel 초기 설정 ==="
    echo ""
    echo "1. PostgreSQL DB를 준비하세요 (Vercel Postgres, Neon, Supabase 등)"
    echo "2. DATABASE_URL을 확인하세요"
    echo ""
    read -p "DATABASE_URL 입력: " DB_URL
    echo ""

    # PostgreSQL 스키마로 전환
    cp prisma/schema.prisma prisma/schema.sqlite.prisma.bak
    cp prisma/schema.postgres.prisma prisma/schema.prisma
    echo "✓ PostgreSQL 스키마 적용"

    # .env 생성
    echo "DATABASE_URL=\"$DB_URL\"" > .env
    echo "✓ .env 파일 생성"

    # DB 마이그레이션
    npx prisma db push
    echo "✓ DB 테이블 생성 완료"

    # Admin 시드
    echo ""
    echo "Admin 계정을 생성하려면 서버를 시작한 후 POST /api/auth/seed 를 호출하세요"
    echo ""

    # Vercel 프로젝트 연결
    vercel link
    echo ""

    # 환경변수 설정
    echo "$DB_URL" | vercel env add DATABASE_URL production
    echo "$DB_URL" | vercel env add DATABASE_URL preview
    echo "✓ Vercel 환경변수 설정 완료"

    # SQLite 스키마 복원 (로컬용)
    cp prisma/schema.sqlite.prisma.bak prisma/schema.prisma
    rm prisma/schema.sqlite.prisma.bak
    echo "✓ 로컬 SQLite 스키마 복원"

    echo ""
    echo "=== 설정 완료 ==="
    echo "배포: bash scripts/deploy-vercel.sh deploy"
    ;;

  deploy)
    echo "=== Vercel 미리보기 배포 ==="
    # PostgreSQL 스키마로 전환 후 배포
    cp prisma/schema.prisma prisma/schema.sqlite.bak
    cp prisma/schema.postgres.prisma prisma/schema.prisma

    vercel

    # 로컬 스키마 복원
    cp prisma/schema.sqlite.bak prisma/schema.prisma
    rm prisma/schema.sqlite.bak
    echo "✓ 로컬 SQLite 스키마 복원"
    ;;

  production)
    echo "=== Vercel 프로덕션 배포 ==="
    cp prisma/schema.prisma prisma/schema.sqlite.bak
    cp prisma/schema.postgres.prisma prisma/schema.prisma

    vercel --prod

    cp prisma/schema.sqlite.bak prisma/schema.prisma
    rm prisma/schema.sqlite.bak
    echo "✓ 로컬 SQLite 스키마 복원"
    ;;

  help|*)
    echo "Vercel 배포 스크립트"
    echo ""
    echo "사용법:"
    echo "  bash scripts/deploy-vercel.sh setup       # 최초 설정 (DB 연결, Vercel 연동)"
    echo "  bash scripts/deploy-vercel.sh deploy       # 미리보기 배포"
    echo "  bash scripts/deploy-vercel.sh production   # 프로덕션 배포"
    echo ""
    echo "사전 조건:"
    echo "  1. npm i -g vercel"
    echo "  2. PostgreSQL DB 준비 (Vercel Postgres / Neon / Supabase)"
    echo "     - Neon (무료): https://neon.tech"
    echo "     - Supabase (무료): https://supabase.com"
    echo "     - Vercel Postgres: Vercel 대시보드 > Storage"
    ;;

esac
