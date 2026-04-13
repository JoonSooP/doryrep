#!/bin/bash
# Vercel 빌드 시 자동 실행되는 스크립트
# PostgreSQL 스키마로 전환 → prisma generate → next build
set -e

echo "=== Vercel Build ==="

# PostgreSQL 스키마로 전환
cp prisma/schema.postgres.prisma prisma/schema.prisma
echo "✓ PostgreSQL 스키마 적용"

# Prisma 클라이언트 생성
npx prisma generate
echo "✓ Prisma 클라이언트 생성"

# Next.js 빌드
next build
echo "✓ 빌드 완료"
