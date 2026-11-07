---
title: "How I Configure Neovim"
slug: "nvim-config"
pubDate: 2026-10-22
tags: ["Tech"]
---

### From VSCode to Nvim

I've known about Vim for a long time, but its steep learning curve kept me from really using it.
I used VSCode instead.
Before that I started with Visual Studio, which was too big. VSCode felt small and elegant by comparison,
and it worked with many languages. The install went from several GB down to a few hundred MB.
But lately I've found VSCode too bloated, with too much I don't need.
VSCode is Microsoft's fake open source: part of the code is open, and the rest comes with things slipped in,
including AI features I rarely use,
plus a lot of other unrelated features.
So I chose to switch to Vim.


I switched to herdr and Nvim, two terminals.
Nvim handles only manual editing and reading.
herdr runs multiple TUI agents and bash commands at the same time.

### LeanVim

Replace VSCode!

So I built my own Neovim config, LeanVim, with one rule: only what's necessary.
It has a file tree you can use with the mouse (right-click to create, rename, or delete),
one key per feature (Space f for files, Space c for contents, Space g for git changes),
and a single-screen git diff, like VSCode's.
No LSP, no completion, around 370 lines in total.

[LeanVim on GitHub](https://github.com/BV003/LeanVim)


