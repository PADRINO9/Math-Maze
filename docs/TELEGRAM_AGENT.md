# Kaflul Telegram Agent

מטרת הכלי: לשלוח אליך APK חדש לטלגרם בכל פעם שנבנה קובץ בדיקה חדש.

הפתרון חינמי: הוא משתמש ב-Telegram Bot API הרשמי ובמחשב המקומי בלבד. אין כאן שירות hosting או מנוי בתשלום.

## הגדרה ראשונה

1. פתח Telegram וחפש את `@BotFather`.
2. שלח לו `/newbot`.
3. בחר שם לבוט, למשל `Kaflul Builds`.
4. בחר username שמסתיים ב-`bot`, למשל `kaflul_builds_bot`.
5. העתק את ה-token שקיבלת.
6. צור בקובץ `.env` בשורש הפרויקט:

```bash
TELEGRAM_BOT_TOKEN=put_token_here
TELEGRAM_CHAT_ID=
```

7. פתח את הבוט החדש בטלגרם ושלח לו הודעה כלשהי, למשל `hi`.
8. הרץ:

```bash
npm run telegram:chat-id
```

9. העתק את ה-chat id שהפקודה מדפיסה לתוך `.env`:

```bash
TELEGRAM_BOT_TOKEN=put_token_here
TELEGRAM_CHAT_ID=put_chat_id_here
```

10. בדוק שהחיבור עובד:

```bash
npm run telegram:check
```

## שליחת APK

שליחת ה-APK האחרון שנמצא תחת `dist/` או תחת build של Android:

```bash
npm run telegram:send-apk
```

שליחת קובץ ספציפי:

```bash
npm run telegram:send -- dist/kaflul-test-android-visual-polish-20260701.apk --caption "Kaflul build לבדיקה"
```

שליחת הודעת טקסט:

```bash
npm run telegram:notify -- --message "APK חדש מוכן לבדיקה"
```

קריאת הודעות חדשות שהגיעו לבוט:

```bash
npm run telegram:inbox
```

קריאת כל ההודעות הזמינות, גם כאלה שכבר נקראו בכלי:

```bash
npm run telegram:inbox -- --all
```

## מגבלות

- Telegram Bot API בענן מאפשר לבוט לשלוח קבצים עד 50MB. ה-APK הנוכחי קטן מזה.
- ה-token נשאר רק בקובץ `.env`, שכבר מוחרג מגיט.
- כדי לקבל הודעות מהבוט, המשתמש חייב לפתוח את הבוט בטלגרם ולשלוח לו הודעה ראשונה.
- הכלי לא רץ כשרת קבוע. כשצריך לשלוח APK או לקרוא הודעות, מריצים את הפקודה המתאימה מהמחשב.
