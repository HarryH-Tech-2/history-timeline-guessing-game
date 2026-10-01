# Play store listing copy (4 languages)

One JSON file per Play locale. Check limits with `python scripts/check_store_listing.py`.
Facts used (checked against the code 2026-10-01): 538 questions, all illustrated; 12 categories
(4 Premium: Arts & Culture, Philosophy, Regional, Space); 5 campaign eras, only The Ancient World
free; 28 achievements; leaderboard boards Today / Week / All time; Daily = 8 questions; Survival = 3 lives;
Endless = Premium; timeline 1000 BCE to today; up to 1,000 points per question.

## English (en-US) — `en-US.json`
- Title: History Date Guesser: Quiz
- Short: Slide the timeline, guess the year. 538 moments in history, no multiple choice.

## Portuguese, Brazil (pt-BR) — `pt-BR.json`
- Title: Quiz de História: Que Ano Foi?
- Short: Deslize a linha do tempo e acerte o ano de 538 momentos da história.

## Spanish, Latin America (es-419) — `es-419.json`
- Title: Quiz de Historia: ¿Qué Año?
- Short: Desliza la línea de tiempo y adivina el año de 538 momentos de la historia.

## Japanese (ja-JP) — `ja-JP.json`
- Title: History Date Guesser 歴史年代クイズ
- Short: 年表をスライドして「何年？」を当てよう。選択肢なしの歴史クイズ、全538問。

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
| `video.*` | On-screen text of that language's promo video render |
| `youtube.title` / `youtube.description` | The YouTube upload; paste its URL into Graphics → Video for that language |

The YouTube description must keep the English music credit at the end (from `promo/MUSIC-CREDIT.txt`).
