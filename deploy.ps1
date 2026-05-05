# ═══════════════════════════════════════
# SCRIPT DEPLOY NHANH - THẢNH THƠI FARM
# ═══════════════════════════════════════

Write-Host "--- Bắt đầu quy trình triển khai Thảnh Thơi Farm ---" -ForegroundColor Cyan

# 1. Kiểm tra môi trường
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Vui lòng cài đặt Node.js trước khi chạy script này."
    exit
}

# 2. Cài đặt Backend
Write-Host "`n[1/3] Đang cài đặt dependencies cho Backend..." -ForegroundColor Yellow
cd backend
npm install

# 3. Chuẩn bị Database (Prisma)
Write-Host "`n[2/3] Đang khởi tạo Database & Prisma..." -ForegroundColor Yellow
npx prisma generate
# npx prisma migrate deploy # Chỉ chạy lệnh này khi dùng DB thật (PostgreSQL/MySQL)

# 4. Kiểm tra file .env
if (-not (Test-Path .env)) {
    Write-Host "[!] CẢNH BÁO: Không tìm thấy file .env. Đang tạo từ file mẫu..." -ForegroundColor Red
    Copy-Item .env.example .env
}

# 5. Khởi động server
Write-Host "`n[3/3] Sẵn sàng khởi động!" -ForegroundColor Green
Write-Host "Mẹo: Để chạy background lâu dài, hãy dùng: pm2 start server.js --name thanh-thoi-farm" -ForegroundColor Gray
npm start
