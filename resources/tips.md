# Practical Tips

---

## Using Cursor Effectively

**Use Composer with a fast model.** Composer 2 is recommended — fast, cheap, and great for most tasks. Save the slower, more expensive models for when you're genuinely stuck on something complex.

**Plan before you build.** Vague prompts produce vague code. Specific prompts produce working code. Spend 20 minutes sketching out what you want before you open Composer.

**Describe the person and their situation when prompting, not just the feature.** "Build a form" produces something generic. "Build a form for a home carer who needs to log medication times for three different people, on a phone, while doing something else" produces something useful.

---

## Scoping Your Project

**Keep scope ruthlessly small.**

One thing that works completely beats five things that almost work. Ask yourself: what is the one moment in this person's day we're making better? Build that only.

---

## Deploying

**Deploy to Vercel early — don't leave it to the last hour.**

The starter folder in this repo is a zero-config Vercel deploy. Fork the repo, import to [vercel.com](https://vercel.com), set root directory to `starter/`, deploy.

**Judges will open your URL.** If it's not live, your project doesn't exist.

**Submission deadline is 16:00** Hard cutoff. No exceptions.

---

## On the Day

- Talk to your person before you write a single line of code — even 15 minutes on the phone changes everything
- Timebox everything: 30 min planning, 3–4 hours building, 1 hour cleanup and pitch prep
- If something isn't working after 30 minutes, cut it — don't let one feature sink the whole project
- **Pitch format:** Round 1 is 2 minutes, no Q&A. Get to the point: who is this person, what is their hard day, what does your tool do, show it working

---

## Starter Project

The `starter/` folder in this repo is a minimal HTML/CSS site with zero dependencies, ready to deploy on Vercel.

It's a foundation, not a constraint. You can replace it entirely, build on top of it, or ignore it and use whatever stack you prefer.
