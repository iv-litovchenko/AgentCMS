# Landing orbit / заставка — варианты

## `classic` (активен в production)

Полная заставка: пульсирующий hub, анимированные SVG-линии (штрих + opacity), кружки с дрейфом, звёзды и метеоры на фоне.

Источник: коммит `c3133d9` (до оптимизации производительности).

## `new` (архив)

Облегчённый вариант для слабых машин:

- статичные линии (без rAF и без CSS-анимации линий)
- без пульса hub
- `translate3d` + `will-change` на кружках
- на заставке отключены мерцание звёзд и метеоры
- без `filter: grayscale` на неактивных агентах

Файлы архива:

- `documentation/landing-orbit-variant-new.css`
- `documentation/landing-orbit-variant-new.js`

Чтобы вернуть `new`, перенесите фрагменты из этих файлов в `public/styles.css` и `public/main.js` (секция orbit / screensaver).
