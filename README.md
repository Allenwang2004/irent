<p align="center">
  <img src="docs/logo.svg" alt="iRent+ Smart Vehicle Condition Manager" width="420">
</p>

# iRent+ Smart Vehicle Condition Manager

Our entry for the iRent challenge at the 2026 Hotai AI Hackathon. It uses AI to check the photos taken at pickup and return. Blurry or dark photos are rejected on the phone the moment they are taken. After submission, a vision-language model (VLM) compares the photos for new damage, judges how clean the interior is, and checks the fuel and parking cards. When it finds a problem, it opens alerts and work orders for the operations team.

## Architecture

Three layers, each with a different latency need:

| Layer | Where it runs | What it does | Response time |
|---|---|---|---|
| Real-time | On the phone | Checks sharpness, brightness and overexposure right after each photo; a failed photo must be retaken | Under 1 second |
| Analysis | Worker on a lab GPU server | Uses a VLM to compare pickup and return photos, judge interior cleanliness and left-behind items, and check the cards | Within a few minutes of submission |
| Operations | Supabase and the operations dashboard | Opens alerts and work orders from the results; cars that need cleaning or repair are taken off rental automatically | Immediate |

```
Phone app (mobile/)
  Takes photos, real-time quality check (src/lib/quality.ts)
  Uploads photos directly with signed URLs
        |
        v
Supabase (supabase/)
  Postgres: vehicles, rentals, inspections, photos, analyses, alerts, work orders
  Storage: pickup and return photos (private bucket)
        ^                                   |
        | claims jobs, writes results       | alerts, work orders, vehicle status
        |                                   v
VLM worker (worker/)                   Operations dashboard (web/)
  vLLM + Qwen/Qwen3.5-9B               Alerts, work orders, inspections,
  3 readings per photo, majority vote  vehicle management, customer reviews
```

Database keys stay on the server; neither the phone app nor the dashboard gives the client direct database access.

## Features

### Pickup and return (phone)

- The screens follow the iRent app's pickup, in-use and return pages, and the photo order is the same: card holder, front seats, rear seats, front left, front right, rear left, rear right
- The camera opens inside the app, with alignment guides and a translucent overlay of the last photo from the same angle; it warns about darkness or blur before the shutter is pressed
- On the four corner shots, the phone reads the licence plate live to confirm it is the rented car and that the angle matches the previous photo
- Photo quality is checked on the phone as soon as a photo is taken (thresholds calibrated on 1,200 real return photos); a failed photo can only be retaken
- Return: billing stops when 開始還車 (Start return) is pressed. The user then has 5 minutes to photograph the interior and lock the car; after that the return is cancelled and billing continues. Locking does not wait for uploads to finish, so a return still works with poor signal in an underground car park
- After locking, the user photographs the four corners outside and records where the car is parked (a photo and a note), so the next user can find it
- Users can photograph known damage and anything else they notice, to protect themselves; after submission they can see the AI's preliminary pickup and return report

### AI analysis (worker)

| Photos | Check | Alerts it can open |
|---|---|---|
| 4 exterior corners | Compares against the baseline for new damage (return against pickup, pickup against the previous record) | New damage, differences already present at pickup, cannot compare (sent for manual review) |
| Front and rear seats | Cleanliness and left-behind items | Dirty interior, left-behind items |
| Card holder | Whether the fuel card and parking card are both there | Missing card |
| Damage photographed by the user | Describes the visible damage and checks it against the comparison | User-reported damage |

New-damage detection was evaluated on the organiser's 144 pickup and return photo pairs. The evaluation script and the live worker share the same prompts and majority-vote rules; see `eval/README.md` for the method.

### Operations dashboard

- Alerts: sorted by severity, with alerts from the same inspection grouped into one case. Confirmed damage can be recorded as known damage, and the next user is asked to photograph it at pickup
- Work orders: dirty interiors open a cleaning order, serious damage a repair order, and missing cards or left-behind items a request to contact the user. Open cleaning and repair orders keep the car off rental
- Inspection records and vehicle management (add vehicles, register baseline photos, known damage)
- Customer reviews: iRent return-related reviews collected by the scraper, which can be categorised and marked with importance and status

## Repository layout

| Directory | Contents |
|---|---|
| `mobile/` | Phone app for pickup and return; see `mobile/README.md` |
| `web/` | Operations dashboard; see `web/README.md` |
| `supabase/` | SQL for tables, storage and triggers |
| `worker/` | The VLM analysis service that runs on the GPU server; see `worker/README.md` |
| `eval/` | Evaluation scripts for new-damage detection; see `eval/README.md` |
| `scraper/` | Return-review scrapers and data for PTT, Dcard, Google Play and the App Store; see `scraper/README.md` |
| `plan/` | Problem analysis, architecture, feature design, model strategy, POC and evaluation, deck planning |
| `video/` | Remotion project and narration for the video; see `video/README.md` |

The organiser's photo dataset (`datasets/`) is not public and is not in the repo.
