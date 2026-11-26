# Project kaise chalayein — Frontend Local Demo

Ab website aur ERP frontend ko chalane ke liye backend, PostgreSQL ya API server start karne ki zaroorat nahi hai.

## Sirf ek terminal

VS Code mein Terminal kholiye aur project folder se:

```bash
npm install
npm run dev:web
```

Ready hone ke baad browser mein:
- Website: http://localhost:3000/en
- Admin role selection: http://localhost:3000/admin/login

Admin role selection mein apna demo role choose kariye. Role local browser storage mein save hoga aur usi role ka workspace khulega. Har staff role ko Dashboard aur uske assigned module ka access diya gaya hai.

## Local demo data

- Dashboard aur module data frontend ke local demo adapter se aata hai.
- Create, update aur delete actions browser ke local storage mein save hote hain.
- Koi backend login, API request ya database connection nahi hota.
- Data sirf isi browser/device par rahega. Browser storage clear karne par demo changes reset ho jayenge.

## Checks

```bash
npm run lint -w apps/web
npm run typecheck -w apps/web
npm run build -w apps/web
```

## Important limitations

Yeh frontend-only demo hai. Real payment processing, live video/audio classes, email delivery, server-side file uploads aur multiple devices ke beech shared data available nahi hain. Backend source repository mein reference ke liye reh sakta hai, lekin website usse call nahi karti.
