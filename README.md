# fut0r — personal site

Source for [fut0r.arabdev.site](https://fut0r.arabdev.site), the portfolio of Zyad Mohamed.

A small static site: plain HTML, CSS, and JavaScript. No build step, no framework.

## What's inside

| File | Purpose |
| --- | --- |
| `index.html` | English page |
| `arabic.html` | Arabic (RTL) page |
| `styles.css` | All styling, including light/dark themes and RTL rules |
| `script.js` | GitHub projects list, theme toggle, language menu, header behaviour |
| `404.html` | Not-found page served by GitHub Pages |
| `site.webmanifest`, `icon-*.png` | App icons and install metadata |
| `sitemap.xml`, `robots.txt` | Search engine hints |

## Features

- Light and dark themes (follows the system setting, with a manual toggle that is remembered)
- English and Arabic versions with proper right-to-left layout
- Latest GitHub repositories loaded live, with language, stars, and last update (cached for 30 minutes to stay under the API rate limit)
- Sticky header that highlights the section you're reading
- Keyboard friendly: skip link, visible focus rings, Escape closes menus
- Respects `prefers-reduced-motion`

## Run locally

Any static server works:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
