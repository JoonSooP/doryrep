#!/bin/bash
# DB 복원 스크립트
# 사용법: bash scripts/restore-db.sh [백업파일명]
# 파일명 없이 실행하면 백업 목록 표시

DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$DIR/backups"
DB_FILE="$DIR/prisma/dev.db"

if [ -z "$1" ]; then
  echo "=== 백업 목록 ==="
  ls -lth "$BACKUP_DIR"/dev_*.db 2>/dev/null | awk '{print NR". "$NF, $5, $6, $7, $8}'
  if [ $? -ne 0 ] || [ ! "$(ls "$BACKUP_DIR"/dev_*.db 2>/dev/null)" ]; then
    echo "백업 파일이 없습니다."
  fi
  echo ""
  echo "사용법: bash scripts/restore-db.sh backups/dev_YYYYMMDD_HHMMSS_라벨.db"
  exit 0
fi

BACKUP_FILE="$1"
if [[ "$BACKUP_FILE" != /* ]]; then
  BACKUP_FILE="$DIR/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "백업 파일을 찾을 수 없습니다: $BACKUP_FILE"
  exit 1
fi

# 현재 DB를 먼저 백업
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
cp "$DB_FILE" "$BACKUP_DIR/dev_${TIMESTAMP}_before-restore.db" 2>/dev/null

# 복원
cp "$BACKUP_FILE" "$DB_FILE"
echo "복원 완료: $BACKUP_FILE → $DB_FILE"
echo "서버를 재시작해 주세요."
