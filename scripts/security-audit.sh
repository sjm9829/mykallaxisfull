#!/bin/bash

echo "🔒 My KALLAX is Full - 보안 감사 스크립트"
echo "=============================================="

# 1. 의존성 취약점 검사
echo "📦 npm audit 실행 중..."
npm audit --audit-level=moderate

# 2. TypeScript 타입 검사
echo "🔍 TypeScript 타입 검사 중..."
npx tsc --noEmit

# 3. ESLint 보안 규칙 검사
echo "⚡ ESLint 보안 검사 중..."
npx eslint . --ext .ts,.tsx --quiet

# 4. 환경변수 검증
echo "🌍 환경변수 검증 중..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  경고: .env.local 파일이 없습니다."
fi

if [ ! -f ".env.example" ]; then
    echo "❌ 오류: .env.example 파일이 없습니다."
fi

# 5. 하드코딩된 시크릿 검사
echo "🔐 하드코딩된 시크릿 검사 중..."
grep -r "sk_live" src/ && echo "❌ Stripe live key 발견!"
grep -r "pk_live" src/ && echo "❌ Stripe public key 발견!"
grep -r "AKIA" src/ && echo "❌ AWS Access Key 발견!"
grep -r "password.*=" src/ && echo "⚠️  password 키워드 발견"

# 6. console.log 검사 (프로덕션용)
echo "📝 console.log 사용 검사 중..."
CONSOLE_COUNT=$(grep -r "console\." src/ --exclude-dir=node_modules | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
    echo "⚠️  $CONSOLE_COUNT 개의 console 문이 발견되었습니다."
    grep -r "console\." src/ --exclude-dir=node_modules | head -5
fi

# 7. 파일 권한 검사
echo "📁 파일 권한 검사 중..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs ls -la | grep -E "^.{4,6}[rwx-]{3}" | grep -v "r--r--r--" && echo "⚠️  의심스러운 파일 권한 발견"

# 8. Git 보안 검사
echo "🔀 Git 보안 검사 중..."
if [ -d ".git" ]; then
    git secrets --scan 2>/dev/null || echo "ℹ️  git-secrets가 설치되지 않았습니다."
    
    # .env 파일이 커밋되었는지 확인
    git log --all --full-history -- .env* && echo "❌ .env 파일이 커밋 히스토리에 있습니다!"
fi

# 9. 번들 크기 분석
echo "📦 번들 크기 분석 중..."
if [ -f "package.json" ]; then
    npx next build
    echo "빌드 완료. .next 폴더 크기:"
    du -sh .next/ 2>/dev/null || echo "빌드 폴더가 없습니다."
fi

echo ""
echo "✅ 보안 감사 완료!"
echo "상세한 보안 가이드라인은 SECURITY.md를 참조하세요."
