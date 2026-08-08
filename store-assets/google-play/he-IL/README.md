# Google Play asset package — he-IL

## קבצים להעלאה

| שדה ב־Play Console | קובץ | מפרט |
| --- | --- | --- |
| App icon | `play-icon-512.png` | PNG, ‏512×512, שקיפות, 139 KB |
| Feature graphic | `feature-graphic-1024x500.png` | PNG, ‏1024×500, ללא שקיפות, 728 KB |
| Phone screenshot 1 | `screenshots/01-gameplay-sun-garden.png` | PNG, ‏1080×1920, ללא שקיפות |
| Phone screenshot 2 | `screenshots/02-multiplication-question.png` | PNG, ‏1080×1920, ללא שקיפות |
| Phone screenshot 3 | `screenshots/03-lava-world.png` | PNG, ‏1080×1920, ללא שקיפות |
| Phone screenshot 4 | `screenshots/04-home-screen.png` | PNG, ‏1080×1920, ללא שקיפות |
| Phone screenshot 5 | `screenshots/05-division-question.png` | PNG, ‏1080×1920, ללא שקיפות |
| Phone screenshot 6 | `screenshots/06-boss-battle.png` | PNG, ‏1080×1920, ללא שקיפות |

כל ששת צילומי המסך שומרים את צילום המשחק המקורי בשלמותו. השוליים הצרים הם מילוי מטושטש מאותו צילום בלבד; לא נוספו מצבי משחק או ממשק שאינם קיימים.

## מקור הנכסים

- האייקון בנוי ממקור הדמות הרשמי `assets/generated/bifly-expression-idle.png`, באותה שפה חזותית של אייקון Android.
- חמשת צילומי המשחק מגיעים מצילומי הוכחה של המשחק האמיתי תחת `docs/visual-proof-screenshots/`.
- צילום הבית מגיע מהרצת Android האמיתית ונשמר ב־`sources/home-native-432x936.png`.
- תמונת ה־Feature נוצרה בעזרת מחולל התמונות המובנה, בהסתמך על הפוסטר הרשמי ומקורות הדמויות של כפלול. הלוגו עצמו נוסף לאחר מכן מקובץ המקור הרשמי, כדי לשמור על איות ועיצוב מדויקים.
- מקור תמונת ה־Feature נשמר ב־`feature-graphic-source-v1.png`.

### תקציר הפרומפט הסופי לתמונת ה־Feature

`Google Play feature graphic background; wide cinematic extension of the official Math Maze poster; preserve Bifly, Nabatick and the dark cartoon ghosts; colorful magical multiplication maze; no text, logo, watermark, device frame or UI; center-safe composition with upper-center negative space for the official logo.`

המצב שנבחר במחולל: `ads-marketing`.

## יצירה מחדש ובדיקה

המחולל הדטרמיניסטי נמצא ב־`tools/generate_google_play_assets.py` ודורש Pillow:

```bash
/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tools/generate_google_play_assets.py
```

לפני העלאה יש לוודא שוב שהקבצים שנבחרו זהים לקבצים המפורטים לעיל. אין להעלות את `feature-graphic-source-v1.png` או את תיקיית `sources/` ל־Play Console.

## פריטים שאינם בתיקייה

- Android App Bundle חתום: `android/app/build/outputs/bundle/release/app-release.aab`
- טקסטי החנות והצהרות מוצעות: `store-listing-he.md`
- מדיניות פרטיות: `privacy.html` — פורסמה ב־`https://math-maze-il.vercel.app/privacy.html`.
