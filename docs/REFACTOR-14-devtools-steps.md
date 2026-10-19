# Refactor 14 — DevTools (фаза 0, ~5 мин)

1. `npm start` или `npm run start:https` → открыть `https://127.0.0.1:3002/0-ws-core`.
2. **Performance:** DevTools → Performance → ⚙️ Disable cache → Record → hard reload (Cmd+Shift+R).
3. Stop → Main thread → сумма **Scripting** и **Parse script** (или колонка Parse/Compile в summary).
4. Повторить для `/` и `/0-ws-core?editorBuilt=1`.
5. **Coverage:** Cmd+Shift+P → «Coverage» → reload workspace → % unused для `main.js`; повтор для `/`.

Записать в [REFACTOR-14-baseline.md](./REFACTOR-14-baseline.md) (строки Scripting / Parse / Coverage).

Автопроверка boot (не заменяет Performance):  
`npm run check:editor-boot -- https://127.0.0.1:3002`
