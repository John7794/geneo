/**
 * GeneoAutoSync.gs
 * Google Apps Script для автоматизації роботи з таблицями бази даних Geneo (31 вкладка).
 * 
 * ФУНКЦІОНАЛ:
 * 1. Меню «🧬 Geneo» у верхній панелі Google Таблиць.
 * 2. 🔄 Автоматичне оновлення реляційних зв'язків (Families & Children):
 *    - Сканує вкладки basic, names, families, familyChildren.
 *    - Якщо особі додано батьків або подружжя, скрипт автоматично створює/знаходить сім'ю у 'families'
 *      та прив'язує дитину у 'familyChildren' без ручного заповнення зв'язків.
 * 3. 🔍 Повний аудит цілісності даних (Audit & Duplicates):
 *    - Виявляє дублікати осіб (схожі/однакові імена, прізвища, роки).
 *    - Виявляє аномалії віку батьків (вік матері < 13 або > 53, батька < 13 або > 85).
 *    - Виявляє народження після смерті матері або через > 1 рік після смерті батька.
 *    - Виявляє хронологічні помилки (смерть раніше за народження, вік > 115 років, живий у віці > 120 років).
 *    - Створює наочний звіт у вкладці '_Audit_Geneo' з кольоровим підсвічуванням.
 * 4. 🆔 Автогенерація ID:
 *    - Присвоює унікальні послідовні ідентифікатори новим рядкам (I0001, F0001 тощо).
 */

/**
 * Додавання кастомного меню при відкритті Google Таблиці
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🧬 Geneo')
    .addItem('🔄 Автооновлення зв\'язків (Families & Children)', 'syncGeneoFamiliesAndChildren')
    .addItem('🔍 Повний аудит дерева (Дублікати та помилки)', 'runFullTreeAudit')
    .addItem('🆔 Автогенерація відсутніх ID для нових рядків', 'generateMissingRowIds')
    .addSeparator()
    .addItem('ℹ️ Довідка та інструкція щодо структури Geneo', 'showGeneoHelp')
    .addToUi();
}

/**
 * 1. АВТОМАТИЧНЕ ОНОВЛЕННЯ ЗВ'ЯЗКІВ (Families & Children)
 */
function syncGeneoFamiliesAndChildren() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var basicSheet = ss.getSheetByName('basic');
  var familiesSheet = ss.getSheetByName('families');
  var familyChildrenSheet = ss.getSheetByName('familyChildren');

  if (!basicSheet) {
    SpreadsheetApp.getUi().alert('Помилка', 'Вкладку "basic" не знайдено в поточній таблиці.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Створюємо вкладки families / familyChildren, якщо їх немає
  if (!familiesSheet) {
    familiesSheet = ss.insertSheet('families');
    familiesSheet.appendRow(['id', 'husband_id', 'wife_id', 'marriage_date', 'marriage_place_id', 'notes']);
    familiesSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f1f5f9');
  }

  if (!familyChildrenSheet) {
    familyChildrenSheet = ss.insertSheet('familyChildren');
    familyChildrenSheet.appendRow(['id', 'family_id', 'child_id']);
    familyChildrenSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f1f5f9');
  }

  var basicData = getSheetRowsAsObjects(basicSheet);
  var familiesData = getSheetRowsAsObjects(familiesSheet);
  var childrenData = getSheetRowsAsObjects(familyChildrenSheet);

  // Словник існуючих сімей: "husband_id|wife_id" -> famObj
  var familyMap = {};
  var maxFamNum = 0;
  familiesData.forEach(function(fam) {
    var h = String(fam.husband_id || '').trim();
    var w = String(fam.wife_id || '').trim();
    var famId = String(fam.id || '').trim();
    var key = h + '|' + w;
    familyMap[key] = fam;

    var numMatch = famId.match(/\d+/);
    if (numMatch) {
      var num = parseInt(numMatch[0], 10);
      if (num > maxFamNum) maxFamNum = num;
    }
  });

  // Набір існуючих зв'язків: "family_id|child_id"
  var existingLinks = {};
  var maxChildLinkId = 0;
  childrenData.forEach(function(row) {
    var fId = String(row.family_id || '').trim();
    var cId = String(row.child_id || '').trim();
    existingLinks[fId + '|' + cId] = true;

    var idNum = parseInt(String(row.id || '').replace(/\D/g, ''), 10);
    if (!isNaN(idNum) && idNum > maxChildLinkId) maxChildLinkId = idNum;
  });

  var newFamilies = [];
  var newChildren = [];

  basicData.forEach(function(person) {
    var pId = String(person.id || '').trim();
    if (!pId) return;

    var fId = String(person.father_id || person.fatherId || '').trim();
    var mId = String(person.mother_id || person.motherId || '').trim();

    if (fId || mId) {
      var famKey = fId + '|' + mId;
      var currentFam = familyMap[famKey];

      if (!currentFam) {
        maxFamNum++;
        var newFamId = 'FAM_' + padZero(maxFamNum, 4);
        currentFam = {
          id: newFamId,
          husband_id: fId,
          wife_id: mId,
          marriage_date: '',
          marriage_place_id: '',
          notes: 'Автоматично згенеровано GeneoAutoSync'
        };
        familyMap[famKey] = currentFam;
        newFamilies.push([newFamId, fId, mId, '', '', 'Автоматично згенеровано GeneoAutoSync']);
      }

      var linkKey = currentFam.id + '|' + pId;
      if (!existingLinks[linkKey]) {
        maxChildLinkId++;
        newChildren.push(['FC_' + padZero(maxChildLinkId, 4), currentFam.id, pId]);
        existingLinks[linkKey] = true;
      }
    }
  });

  // Запис нових родин
  if (newFamilies.length > 0) {
    var famStartRow = familiesSheet.getLastRow() + 1;
    familiesSheet.getRange(famStartRow, 1, newFamilies.length, 6).setValues(newFamilies);
  }

  // Запис нових дітей
  if (newChildren.length > 0) {
    var childStartRow = familyChildrenSheet.getLastRow() + 1;
    familyChildrenSheet.getRange(childStartRow, 1, newChildren.length, 3).setValues(newChildren);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Оновлено: ' + newFamilies.length + ' нових родин, ' + newChildren.length + ' нових зв\'язків дітей.',
    'Синхронізація Geneo завершена',
    6
  );
}

/**
 * 2. ПОВНИЙ АУДИТ ДЕРЕВА (Дублікати, вік батьків, тривалість життя)
 */
function runFullTreeAudit() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var basicSheet = ss.getSheetByName('basic');
  var namesSheet = ss.getSheetByName('names');

  if (!basicSheet) {
    SpreadsheetApp.getUi().alert('Вкладку "basic" не знайдено.');
    return;
  }

  var basicRows = getSheetRowsAsObjects(basicSheet);
  var namesRows = namesSheet ? getSheetRowsAsObjects(namesSheet) : [];

  var nameMap = {};
  namesRows.forEach(function(n) {
    var pId = String(n.person_id || n.id || '').trim();
    if (pId) {
      nameMap[pId] = {
        firstName: n.first_name || n.name || '',
        lastName: n.last_name || n.surname || '',
        patronymic: n.patronymic || ''
      };
    }
  });

  // Об'єднуємо дані
  var people = basicRows.map(function(b) {
    var id = String(b.id || '').trim();
    var n = nameMap[id] || {};
    var fn = (b.name || n.firstName || '').trim();
    var ln = (b.surname || n.lastName || '').trim();
    var pat = (b.patronymic || n.patronymic || '').trim();
    var fullName = [ln, fn, pat].filter(Boolean).join(' ') || ('Особа ' + id);

    var bYear = extractYear(b.birth_date || b.birth_year || b.dates_birth || b.fam_year);
    var dYear = extractYear(b.death_date || b.death_year || b.dates_death);

    return {
      id: id,
      fullName: fullName,
      firstName: fn,
      lastName: ln,
      patronymic: pat,
      birthYear: bYear,
      deathYear: dYear,
      fatherId: String(b.father_id || b.fatherId || '').trim(),
      motherId: String(b.mother_id || b.motherId || '').trim(),
      gender: String(b.gender || '').toLowerCase(),
      isAlive: !dYear && (b.is_alive === 'true' || b.is_alive === true || b.status !== 'dead')
    };
  });

  var peopleById = {};
  people.forEach(function(p) { peopleById[p.id] = p; });

  var issues = [];

  // 1. Пошук дублікатів
  for (var i = 0; i < people.length; i++) {
    for (var j = i + 1; j < people.length; j++) {
      var p1 = people[i];
      var p2 = people[j];
      var dupCheck = checkPotentialDuplicate(p1, p2);
      if (dupCheck.isMatch) {
        issues.push({
          type: 'Дублікат',
          severity: 'Попередження',
          personId: p1.id,
          personName: p1.fullName,
          details: 'Можливий дублікат з ' + p2.fullName + ' (ID: ' + p2.id + '). ' + dupCheck.reason,
          recommendation: 'Перевірте та об\'єднайте спільні записи'
        });
      }
    }
  }

  // 2. Хронологія та вік батьків
  var currentYear = new Date().getFullYear();

  people.forEach(function(p) {
    // 2.1 Смерть раніше народження
    if (p.birthYear && p.deathYear && p.deathYear < p.birthYear) {
      issues.push({
        type: 'Хронологія',
        severity: 'Помилка',
        personId: p.id,
        personName: p.fullName,
        details: 'Рік смерті (' + p.deathYear + ') раніше за рік народження (' + p.birthYear + ').',
        recommendation: 'Виправте дати народження або смерті'
      });
    }

    // 2.2 Надто довге життя
    if (p.birthYear && p.deathYear && (p.deathYear - p.birthYear > 115)) {
      issues.push({
        type: 'Довголіття',
        severity: 'Попередження',
        personId: p.id,
        personName: p.fullName,
        details: 'Вік життя становить ' + (p.deathYear - p.birthYear) + ' років (' + p.birthYear + '–' + p.deathYear + ').',
        recommendation: 'Перевірте метричні книги та джерела'
      });
    }

    // 2.3 Живий у віці > 120 років
    if (p.birthYear && !p.deathYear && (currentYear - p.birthYear > 120)) {
      issues.push({
        type: 'Статус життя',
        severity: 'Попередження',
        personId: p.id,
        personName: p.fullName,
        details: 'Особі ' + (currentYear - p.birthYear) + ' років, проте не вказано дату смерті.',
        recommendation: 'Вкажіть рік смерті або статус'
      });
    }

    // 2.4 Вік батька
    if (p.fatherId && peopleById[p.fatherId]) {
      var dad = peopleById[p.fatherId];
      if (p.birthYear && dad.birthYear) {
        var dadAge = p.birthYear - dad.birthYear;
        if (dadAge < 13) {
          issues.push({
            type: 'Вік батька',
            severity: 'Помилка',
            personId: p.id,
            personName: p.fullName,
            details: 'Батько ' + dad.fullName + ' мав вік ' + dadAge + ' років на момент народження дитини.',
            recommendation: 'Перевірте дату народження дитини або батька'
          });
        } else if (dadAge > 85) {
          issues.push({
            type: 'Вік батька',
            severity: 'Попередження',
            personId: p.id,
            personName: p.fullName,
            details: 'Поважний вік батька: ' + dadAge + ' років на момент народження дитини.',
            recommendation: 'Перевірте першоджерела'
          });
        }
      }

      if (p.birthYear && dad.deathYear && (p.birthYear - dad.deathYear > 1)) {
        issues.push({
          type: 'Хронологія батьків',
          severity: 'Помилка',
          personId: p.id,
          personName: p.fullName,
          details: 'Дитина народилася у ' + p.birthYear + ' р., тоді як батько помер у ' + dad.deathYear + ' р.',
          recommendation: 'Перевірте роки або спорідненість'
        });
      }
    }

    // 2.5 Вік матері
    if (p.motherId && peopleById[p.motherId]) {
      var mom = peopleById[p.motherId];
      if (p.birthYear && mom.birthYear) {
        var momAge = p.birthYear - mom.birthYear;
        if (momAge < 13) {
          issues.push({
            type: 'Вік матері',
            severity: 'Помилка',
            personId: p.id,
            personName: p.fullName,
            details: 'Мати ' + mom.fullName + ' народила дитину у віці ' + momAge + ' років.',
            recommendation: 'Перевірте рік народження матері чи дитини'
          });
        } else if (momAge > 53) {
          issues.push({
            type: 'Вік матері',
            severity: 'Попередження',
            personId: p.id,
            personName: p.fullName,
            details: 'Незвично поважний вік матері: ' + momAge + ' років при народженні дитини.',
            recommendation: 'Перевірте записи метричної книги'
          });
        }
      }

      if (p.birthYear && mom.deathYear && p.birthYear > mom.deathYear) {
        issues.push({
          type: 'Хронологія батьків',
          severity: 'Помилка',
          personId: p.id,
          personName: p.fullName,
          details: 'Дитина народилася у ' + p.birthYear + ' р., після смерті матері (' + mom.deathYear + ' р.).',
          recommendation: 'Критична помилка хронології'
        });
      }
    }
  });

  // Запис звіту у вкладку _Audit_Geneo
  var auditSheetName = '_Audit_Geneo';
  var auditSheet = ss.getSheetByName(auditSheetName);
  if (auditSheet) {
    auditSheet.clear();
  } else {
    auditSheet = ss.insertSheet(auditSheetName);
  }

  var headers = ['Рівень', 'Категорія', 'ID особи', 'ПІБ особи', 'Опис зауваження', 'Рекомендація'];
  auditSheet.appendRow(headers);
  auditSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

  if (issues.length === 0) {
    auditSheet.appendRow(['Чудово', 'Успіх', '-', '-', 'Жодних дублікатів чи аномалій не виявлено! Дерево цілісне.', 'Все гаразд']);
    auditSheet.getRange(2, 1, 1, 6).setBackground('#dcfce7').setFontColor('#166534');
  } else {
    var outputRows = issues.map(function(iss) {
      return [iss.severity, iss.type, iss.personId, iss.personName, iss.details, iss.recommendation];
    });

    auditSheet.getRange(2, 1, outputRows.length, 6).setValues(outputRows);

    // Кольорове підсвічування
    for (var r = 0; r < issues.length; r++) {
      var rowNum = r + 2;
      var sev = issues[r].severity;
      var cell = auditSheet.getRange(rowNum, 1);
      if (sev === 'Помилка') {
        cell.setBackground('#fee2e2').setFontColor('#991b1b').setFontWeight('bold');
      } else {
        cell.setBackground('#fef3c7').setFontColor('#92400e').setFontWeight('bold');
      }
    }
  }

  auditSheet.autoResizeColumns(1, 6);
  ss.setActiveSheet(auditSheet);

  SpreadsheetApp.getUi().alert(
    'Аудит Geneo завершено',
    'Виявлено ' + issues.length + ' зауважень. Результати оформлено у вкладці "' + auditSheetName + '".',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 3. АВТОГЕНЕРАЦІЯ ВІДСУТНІХ ID
 */
function generateMissingRowIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToProcess = [
    { name: 'basic', prefix: 'I' },
    { name: 'names', prefix: 'N' },
    { name: 'families', prefix: 'FAM_' },
    { name: 'familyChildren', prefix: 'FC_' },
    { name: 'birth', prefix: 'B' },
    { name: 'death', prefix: 'D' },
    { name: 'events', prefix: 'EV_' },
    { name: 'places', prefix: 'PL_' }
  ];

  var totalGenerated = 0;

  sheetsToProcess.forEach(function(item) {
    var sheet = ss.getSheetByName(item.name);
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    var maxId = 0;
    for (var r = 1; r < data.length; r++) {
      var val = String(data[r][0] || '').trim();
      var num = parseInt(val.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }

    var updated = false;
    for (var r = 1; r < data.length; r++) {
      var val = String(data[r][0] || '').trim();
      // Перевіряємо чи рядок не повністю порожній
      var hasData = data[r].some(function(cell, idx) { return idx > 0 && String(cell).trim() !== ''; });

      if (!val && hasData) {
        maxId++;
        data[r][0] = item.prefix + padZero(maxId, 4);
        sheet.getRange(r + 1, 1).setValue(data[r][0]);
        totalGenerated++;
        updated = true;
      }
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Згенеровано ' + totalGenerated + ' нових ID у таблицях.',
    'Автогенерація ID',
    5
  );
}

/**
 * 4. ДОВІДКА ТА ІНСТРУКЦІЯ
 */
function showGeneoHelp() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b; padding: 10px;">' +
    '<h3 style="color: #2563eb; margin-top:0;">🧬 Робота з таблицями Geneo (31 вкладка)</h3>' +
    '<p>У Geneo вся реляційна структура оптимізована для швидкої роботи та синхронізації:</p>' +
    '<ul>' +
    '<li><strong>Внесення нових осіб:</strong> додавайте родича у вкладку <code>basic</code> (та <code>names</code>). Зазначте <code>father_id</code> та <code>mother_id</code>.</li>' +
    '<li><strong>Оновлення зв\'язків:</strong> натисніть <em>Geneo ➔ 🔄 Автооновлення зв\'язків</em> — скрипт сам створить сім\'ю в <code>families</code> та зв\'яже дитину в <code>familyChildren</code>.</li>' +
    '<li><strong>Перевірка помилок:</strong> меню <em>Geneo ➔ 🔍 Повний аудит дерева</em> знайде всі дублікати, невідповідності віку батьків та хронологічні помилки.</li>' +
    '</ul>' +
    '<p style="font-size: 12px; color: #64748b;">Geneo System &bull; Bring Your Own Storage &bull; 2026</p>' +
    '</div>'
  ).setWidth(480).setHeight(360);

  SpreadsheetApp.getUi().showModalDialog(html, 'Інструкція Geneo Auto-Sync');
}

// ---------------- ДОПОМІЖНІ ФУНКЦІЇ ----------------

function getSheetRowsAsObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var r = 1; r < data.length; r++) {
    var rowObj = {};
    var hasContent = false;
    for (var c = 0; c < headers.length; c++) {
      var val = data[r][c];
      rowObj[headers[c]] = val;
      if (val !== null && val !== undefined && String(val).trim() !== '') hasContent = true;
    }
    if (hasContent) rows.push(rowObj);
  }
  return rows;
}

function extractYear(val) {
  if (!val) return null;
  var match = String(val).match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match ? parseInt(match[0], 10) : null;
}

function padZero(num, size) {
  var s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

function normalizeStr(s) {
  return String(s || '').toLowerCase()
    .replace(/['’ʼ`"]/g, '')
    .replace(/і/g, 'и')
    .replace(/є/g, 'е')
    .trim();
}

function checkPotentialDuplicate(p1, p2) {
  var s1 = normalizeStr(p1.lastName);
  var s2 = normalizeStr(p2.lastName);
  var n1 = normalizeStr(p1.firstName);
  var n2 = normalizeStr(p2.firstName);

  if (s1 && s2 && s1 === s2 && n1 && n2 && n1 === n2) {
    if (p1.birthYear && p2.birthYear) {
      if (Math.abs(p1.birthYear - p2.birthYear) <= 2) {
        return { isMatch: true, reason: 'Однаковий ПІБ та близький рік народження (' + p1.birthYear + ' та ' + p2.birthYear + ').' };
      }
    } else {
      return { isMatch: true, reason: 'Однаковий ПІБ (рік народження у одного або обох не зазначено).' };
    }
  }

  return { isMatch: false };
}
