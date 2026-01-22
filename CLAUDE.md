# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**INCENTIVABR** is a proprietary web application (MVP/demonstration version) for Brazilian public sector employees to allocate up to 6% of their income tax to social causes. The project is a pure frontend SPA with no build system or backend - all functionality runs client-side.

**Language**: Portuguese (Brazilian)
**Status**: Demo version with simulated integrations (Gov.br auth, email sending)
**License**: Proprietary - INPI registered software (BR512025000647-0) and trademarks

## Tech Stack

- **HTML5/CSS3/JavaScript** (Vanilla - no frameworks)
- **External CDNs**: FontAwesome 6.4.0, Google Fonts (Inter), EmailJS v4, jsPDF 2.5.1
- **Storage**: sessionStorage for user data persistence
- **Architecture**: Mobile-first responsive SPA

## Running the Application

No build process required. Simply open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge).

**Demo Flow**:
```
index.html (landing) → login-govbr.html (simulated auth) → dashboard.html (main app)
```

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Landing page with hero, features, testimonials |
| `login-govbr.html` | Simulated Gov.br authentication interface |
| `dashboard.html` | Main application (3,700+ lines) - IR calculator, fund selection, TINA AI assistant, compliance, upload |

## Key Features

- **IR Calculator**: Two modes (simple/automatic) based on 2024 IR tax tables
- **Fund Selection**: FDI/DF (Elderly) and FDCA/DF (Children) with pre-populated BRB bank accounts
- **TINA Assistant**: Context-aware simulated AI assistant (not real LLM)
- **Compliance**: Art. 6º email generation, PDF receipts, 60-day deadline tracking
- **Upload**: Drag & drop proof documents (PDF/JPG/PNG up to 5MB)

## Bank Account Data (Official)

```
FDI/DF:  BRB (070) | Ag: 0100 | CC: 062024-4 | CNPJ: 35.186.643/0001-56
FDCA/DF: BRB (070) | Ag: 100  | CC: 044149-8 | CNPJ: 15.558.339/0001-85
```

## Development Notes

- All JavaScript is embedded inline within HTML files (no external .js files)
- CSS is embedded in `<style>` tags within each HTML file
- Session data uses `sessionStorage` for user persistence between pages
- EmailJS integration requires valid service/template IDs for actual email sending
- TINA responses are hardcoded patterns, not connected to any AI service
