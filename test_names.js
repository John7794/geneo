const names = ["Сигізмунд II", "Іван1", "Марія?", "Петро 3", "Олександр?"];
const normalizeName = (name) => {
    return name.replace(/[\?0-9]/g, '').trim().split(" ")[0];
};
console.log(names.map(normalizeName));
