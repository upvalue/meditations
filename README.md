# tekne

Tekne is a freestyle productivity app in the shape of an outline editor.

You can go ahead and use the demo @ [demo.tekne.app](https://demo.tekne.app)

Tekne is heavily alpha software. I'm using it every day now (as of 8/24/25) but it's still missing
lots of features, is often broken in odd ways and does not have a stable database schema

## Motivation

Its interface is an outline editor like Logseq (everything in a document is part of a line). But
it's actually descended from a Trello board I used which grew into a standalone application called
Meditations. The application would track repeated habitual tasks (like exercise) across months and
years.

Having my progress on these over time spread out on the screen by default was very useful to me, but
it was not very flexible and being the first substantial frontend project I ever wrote (it used
jquery, then Riot, then React) was showing its age. I since spent a lot of time using Obsidian and
felt that a more open ended editor was the right way forward.

A couple of other inspirations:

- [Log driven programming](https://antirez.com/news/51)
- [The bullet journal method](https://bulletjournal.com/pages/book)
- [How to do things](https://davidcain.gumroad.com/l/howtodothings/2024isover)

## Apologia

Here's a few flaws (or design decisions) elaborated on.

### It's probably not a great outline editor

I've never actually used an outline editor for more than a few minutes, although I did make a real
attempt at org-mode many many years ago.

While the interface and keybindings behave like outline editors, it's only my Plato's cave
reproduction of one.

### and definitely not a note taking app

I use [Obsidian](https://obsidian.md/) for taking notes. Tekne will have some Markdown features for
formatting text nicely, but in general as soon as I find myself writing more than a sentence on a
line I try to get out of it and into Obsidian.

### It doesn't store pure text

I like Obsidian's Markdown and filesystem-first nature, but because Tekne's core feature is storing
and analyzing data that's floating around near text, it didn't seem right. It would certainly be
possible to store the data as text, but I figure I'd end up putting JSON all over everything anyway
and at that point a lot of the benefits are gone.

Markdown export will be added at some point.

### You can only edit text on a per-line basis

Due to skill issues on my part, several initial experiments with a single document editor (instead
of a per-line editor) didn't pan out. That may eventually be changed. 

