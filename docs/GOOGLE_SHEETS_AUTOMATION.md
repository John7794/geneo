# Автоматизація оновлень із Google Таблиць

У проєкті налаштовано два способи автоматизації:

---

## Спосіб 1: GitHub Actions (Автоматично за розкладом, Рекомендовано)

Файл `.github/workflows/sync-sheets.yml` вже створено.
Він запускається:
- **Кожні 4 години** автоматично.
- Або вручну: перейдіть у свій репозиторій на GitHub -> вкладка **Actions** -> **Auto Sync Google Sheets** -> **Run workflow**.

Він сам:
1. Завантажує всі 29 CSV з Google Sheets.
2. Перераховує `kinship.json`.
3. Якщо є зміни — робить комміт у `main`, що запускає оновлення на Vercel.

---

## Спосіб 2: Миттєвий вебхук прямо з Google Sheets (При зміні даних)

Якщо ви хочете, щоб сайт оновлювався одразу після редагування таблиці:

1. У панелі **Vercel**:
   - Відкрийте проєкт `geneo` -> **Settings** -> **Git** -> **Deploy Hooks**.
   - Створіть новий хук, наприклад назвіть `Google Sheets Sync`, гілка `main`.
   - Скопіюйте отриманий URL (наприклад, `https://api.vercel.com/v1/integrations/deploy/prj_.../hook_...`).

2. У вашій **Google Таблиці**:
   - Відкрийте меню **Розширення (Extensions)** -> **Apps Script**.
   - Вставте наступний код:

```javascript
// URL вашого Deploy Hook з Vercel
const VERCEL_DEPLOY_HOOK_URL = "ВСТАВТЕ_ВАШ_VERCEL_DEPLOY_HOOK_URL_ТУТ";

// Функція для ручного запуску з меню або за тригером
function triggerVercelDeploy() {
  const options = {
    method: "post",
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(VERCEL_DEPLOY_HOOK_URL, options);
  Logger.log("Vercel Deploy Response: " + response.getContentText());
}

// Додає зручне меню у верхню панель Google Таблиці
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Генеалогія')
    .addItem('🚀 Опублікувати зміни на сайті', 'triggerVercelDeploy')
    .addToUi();
}
```

3. Збережіть проєкт (`Ctrl + S`).
4. Тепер прямо в Google Таблиці з'явиться меню **Генеалогія -> 🚀 Опублікувати зміни на сайті**, і Vercel автоматично перебудує та оновить сайт за 1–2 хвилини!
