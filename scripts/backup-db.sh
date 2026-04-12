#!/bin/bash
# DB 백업 스크립트
# 사용법: bash scripts/backup-db.sh [라벨]
# 예: bash scripts/backup-db.sh before-migration

DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$DIR/backups"
DB_FILE="$DIR/prisma/dev.db"
LABEL="${1:-auto}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/dev_${TIMESTAMP}_${LABEL}.db"

if [ ! -f "$DB_FILE" ]; then
  echo "DB 파일이 없습니다: $DB_FILE"
  exit 1
fi

cp "$DB_FILE" "$BACKUP_FILE"
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "백업 완료: $BACKUP_FILE ($SIZE)"

# 최근 20개만 유지, 나머지 삭제
cd "$BACKUP_DIR"
ls -t dev_*.db 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null
COUNT=$(ls dev_*.db 2>/dev/null | wc -l | tr -d ' ')
echo "현재 백업 수: ${COUNT}개 (최대 20개 유지)"
