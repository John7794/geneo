import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

old_normalize = """        const normalizeSurname = (surname, gender) => {
            let s = surname.replace(/[\?0-9]/g, '').trim();
            if (s.endsWith("ська")) return s.slice(0, -4) + "ський";
            if (s.endsWith("цька")) return s.slice(0, -4) + "цький";
            if (s.endsWith("зька")) return s.slice(0, -4) + "зький";
            if (gender === 'f' || gender === 'ж') {
                if (s.endsWith("ова")) return s.slice(0, -3) + "ов";
                if (s.endsWith("єва")) return s.slice(0, -3) + "єв";
                if (s.endsWith("ева")) return s.slice(0, -3) + "ев";
                if (s.endsWith("іна")) return s.slice(0, -3) + "ін";
                if (s.endsWith("їна")) return s.slice(0, -3) + "їн";
                if (s.endsWith("ина")) return s.slice(0, -3) + "ин";
                if (s.endsWith("ая")) return s.slice(0, -2) + "ий";
                if (s.endsWith("яя")) return s.slice(0, -2) + "ій";
            }
            return s;
        };"""

new_normalize = """        const normalizeSurname = (surname) => {
            let s = surname.replace(/[\?0-9]/g, '').trim();
            if (s.endsWith("ська")) return s.slice(0, -4) + "ський";
            if (s.endsWith("цька")) return s.slice(0, -4) + "цький";
            if (s.endsWith("зька")) return s.slice(0, -4) + "зький";
            
            if (s.endsWith("ова")) return s.slice(0, -3) + "ов";
            if (s.endsWith("єва")) return s.slice(0, -3) + "єв";
            if (s.endsWith("ева")) return s.slice(0, -3) + "ев";
            if (s.endsWith("іна")) return s.slice(0, -3) + "ін";
            if (s.endsWith("їна")) return s.slice(0, -3) + "їн";
            if (s.endsWith("ина")) return s.slice(0, -3) + "ин";
            if (s.endsWith("ая")) return s.slice(0, -2) + "ий";
            if (s.endsWith("яя")) return s.slice(0, -2) + "ій";
            
            return s;
        };"""

js = js.replace(old_normalize, new_normalize)

js = js.replace("normalizeSurname(String(s), g)", "normalizeSurname(String(s))")

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
