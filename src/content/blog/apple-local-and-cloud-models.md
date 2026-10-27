---
title: "How Apple Uses Local Models and Cloud Models"
slug: "apple-local-and-cloud-models"
pubDate: 2026-10-27
tags: ["Tech"]
---

### The big idea

Most AI apps send everything to the cloud. Apple does the opposite.
It tries to run AI on your phone first.
It only uses the cloud when the phone can't do the job.

There are three places a request can go.

### 1. The model on your phone

- A small model, about 3 billion parameters.
- It runs on the chip inside your iPhone, iPad, or Mac.
- It is made very small so it fits in the phone's memory.
- One base model, plus small add-ons for each job (summarize, proofread, reply to mail). Apple swaps the add-ons in when needed.
- Good at short, simple jobs: summarize, rewrite, sort, pull out key info.
- Not good at hard questions or long thinking.
- It works offline, it is free, and your data never leaves the device.

### 2. Apple's cloud (Private Cloud Compute)

If the job is too hard for the phone, it goes to a bigger model on Apple's own servers.

- The phone only sends what this one request needs. Your messages, photos, and calendar stay on the phone.
- The server forgets your data after it answers. Nothing is saved.
- Apple engineers can't log in and look at your data.
- Your IP address is hidden by a relay run by another company.
- Apple publishes the server software. Before sending anything, your phone checks that the server is running that exact software.

So the phone doesn't just trust the cloud. It checks it first.

### 3. Outside models like ChatGPT

- For open questions that need world knowledge, Siri can ask ChatGPT.
- You must say yes first, every time.

### How the phone decides

1. You ask for something.
2. The phone finds the personal info it needs, on the phone.
3. Can the phone's model do it?
   - Yes → run it on the phone.
   - No → send it to Apple's cloud.
4. Need world knowledge? → ask you, then send it to ChatGPT.

The rule is simple: **use the most private and cheapest option that can do the job.**

### What I learned

1. Local-first is about choosing **where** to run, not just about the model.
2. A small model can be useful if it only does small, clear jobs.
3. On a phone, memory is the main limit.
4. Cloud privacy can be built and checked, not just promised.
