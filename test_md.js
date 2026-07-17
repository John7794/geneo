let text = `* **Дата народження:** 15 вересня 1913
* **Місце:** село Лелечі
* [посилання](https://drive.google.com/file)`;
let formattedText = text;
formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
formattedText = formattedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" style="text-decoration: underline; color: var(--color-primary);">$1</a>');
formattedText = formattedText.replace(/^([\*\-])\s+(.*)$/gm, '&bull; $2');
formattedText = formattedText.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
console.log(formattedText);
