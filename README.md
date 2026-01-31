# 🚀 Masar Backend - Railway Deployment Guide

Backend API لتطبيق Masar للتوصيل

## 📋 المتطلبات

- Node.js (v14 أو أحدث)
- PostgreSQL Database (Railway)
- Git

## 🔧 الإعداد المحلي

### 1. تثبيت المكتبات

```bash
npm install
```

### 2. إعداد ملف البيئة

انسخ ملف `.env.example` إلى `.env`:

```bash
copy .env.example .env
```

ثم حدّث القيم بالبيانات الصحيحة من Railway.

### 3. تشغيل السيرفر محلياً

```bash
npm start
```

السيرفر سيعمل على: http://localhost:5000

## 🚀 النشر على Railway

### 1. رفع الكود على GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/masar-backend.git
git push -u origin main
```

### 2. نشر من Railway

1. اذهب إلى https://railway.app
2. اختر "New Project" → "Deploy from GitHub"
3. اختر repository `masar-backend`
4. أضف PostgreSQL Database
5. أضف Environment Variables (انظر أدناه)

### 3. Environment Variables المطلوبة

```bash
PORT=5000
NODE_ENV=production
DATABASE_URL=<من Railway PostgreSQL>
JWT_SECRET=masar_secret_key_2026
```

## 📚 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - تسجيل مستخدم جديد
- `POST /login` - تسجيل الدخول

### Orders (`/api/orders`)
- `GET /` - جلب الطلبات
- `POST /` - إنشاء طلب جديد
- `PUT /:id` - تحديث طلب

### Wallet (`/api/wallet`)
- `GET /:userId` - جلب رصيد المحفظة
- `POST /recharge` - شحن المحفظة

### Management (`/api/management`)
- `GET /nearby` - جلب المناديب القريبين
- `POST /toggle-availability` - تبديل حالة التوفر

## 🔍 استكشاف الأخطاء

### "Cannot connect to database"
- تحقق من `DATABASE_URL` في ملف `.env`
- تأكد من أن PostgreSQL يعمل

### "Port already in use"
- غيّر `PORT` في `.env`
- أو أوقف العملية التي تستخدم المنفذ

## 📞 الدعم

للمساعدة، ارجع إلى:
- `RAILWAY_SETUP_GUIDE.md` - دليل شامل
- `QUICK_REFERENCE.md` - مرجع سريع
- `RAILWAY_TASKS.md` - قائمة المهام

---

**Made with ❤️ for Masar Delivery App**
