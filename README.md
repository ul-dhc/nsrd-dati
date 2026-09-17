# NSRD un Seque ierakstu un personu tīkla vizualizācija

> **Statuss:** izstrādes procesā.

Interaktīvs, viegls NSRD un Seque datu pārlūks ar personu un ierakstu tīkla vizualizācijām. Projekts paredzēts publicēšanai kā GitHub Pages vietne:

`https://ul-dhc.github.io/nsrd-dati/`

## Lokālā izstrāde

```bash
pnpm install
pnpm dev
```

## GitHub Pages būvējums

```bash
GITHUB_PAGES=true pnpm run build:pages
```

Statiskā vietne tiek izveidota mapē `dist/client`. Publicēšanu veic GitHub Actions darbplūsma `.github/workflows/deploy-pages.yml`.

---

## English

> **Status:** in development.

An interactive, lightweight data explorer for NSRD and Seque recordings and their associated people. The site is configured for GitHub Pages at:

`https://ul-dhc.github.io/nsrd-dati/`
