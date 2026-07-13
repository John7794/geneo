const normalizeSurname = (surname) => {
    let s = surname.replace(/[\?0-9]/g, '').trim();
    const boundary = "(?![А-Яа-яЄєІіЇїҐґa-zA-Z])";
    s = s.replace(new RegExp("ська" + boundary, "g"), "ський");
    s = s.replace(new RegExp("цька" + boundary, "g"), "цький");
    s = s.replace(new RegExp("зька" + boundary, "g"), "зький");
    s = s.replace(new RegExp("ова" + boundary, "g"), "ов");
    s = s.replace(new RegExp("єва" + boundary, "g"), "єв");
    s = s.replace(new RegExp("ева" + boundary, "g"), "ев");
    s = s.replace(new RegExp("іна" + boundary, "g"), "ін");
    s = s.replace(new RegExp("їна" + boundary, "g"), "їн");
    s = s.replace(new RegExp("ина" + boundary, "g"), "ин");
    s = s.replace(new RegExp("ая" + boundary, "g"), "ий");
    s = s.replace(new RegExp("яя" + boundary, "g"), "ій");
    return s;
};
console.log(normalizeSurname("Сопєховська / Сепіховський"));
console.log(normalizeSurname("Лавшовська Шаловський"));
console.log(normalizeSurname("Бачманова"));
