# Play store listing copy (4 languages)

One JSON file per Play locale. Check limits with `python scripts/check_store_listing.py`.
Facts used (checked against the code 2026-10-01): 538 questions, all illustrated; 12 categories
(4 Premium: Arts & Culture, Philosophy, Regional, Space); 5 campaign eras, only The Ancient World
free; 28 achievements; leaderboard boards Today / Week / All time; Daily = 8 questions; Survival = 3 lives;
Endless = Premium; timeline 1000 BCE to today; up to 1,000 points per question.

## English (en-US) — `en-US.json`
- Title: Date Guesser: History Quiz
- Short: History quiz & trivia game: slide the timeline and guess the year of 538 events

## Portuguese, Brazil (pt-BR) — `pt-BR.json`
- Title: Quiz de História: Que Ano Foi?
- Short: Quiz de história: adivinhe o ano de 538 fatos históricos na linha do tempo

## Spanish, Latin America (es-419) — `es-419.json`
- Title: Quiz de Historia: ¿Qué Año?
- Short: Trivia de historia: desliza la línea de tiempo y adivina el año de 538 hechos

## Japanese (ja-JP) — `ja-JP.json`
- Title: Date Guesser 歴史クイズ・年号当て
- Short: 年表で年号を当てる歴史クイズ。世界史の有名な出来事538問、選択肢なしで挑戦！

## Where each field goes in Play Console

Grow users → Store presence → Main store listing. English (en-US) is the default language.
For the others: Manage translations → Add your own translation → tick Portuguese (Brazil) – pt-BR,
Spanish (Latin America) – es-419 and Japanese – ja-JP, then switch language at the top of the page.

| JSON field | Play Console field |
|---|---|
| `title` | App name (30) |
| `short_description` | Short description (80) |
| `full_description` | Full description (4000) |
| `screenshots.*` | Captions drawn onto that language's phone screenshots (upload under Graphics → Phone screenshots for each language) |
| `feature-graphic/<locale>.png` | Graphics → Feature graphic (1024x500) for that language; app name + first line of `full_description`. Rebuild with `cd scripts && python retitle_feature_graphic.py` |
| `video.*` | On-screen text of that language's promo video render |
| `youtube.title` / `youtube.description` | The YouTube upload; paste its URL into Graphics → Video for that language |

The YouTube description must keep the English music credit at the end (from `promo/MUSIC-CREDIT.txt`).
