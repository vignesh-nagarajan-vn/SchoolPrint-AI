# Compost-AI Smart Bin — Web App

The iPad-facing front end of the smart compost bin. Fullscreen camera → capture →
classify → Grad-CAM explainability → confirm or correct (the bin "learns" from
corrections). Built with Next.js 14 (App Router), Tailwind, shadcn/ui, and
Courier New throughout. Deploys to Vercel.

It talks **only** to its own `/api/*` routes, which proxy to the inference
backend (the Hugging Face Space in `../inference`). Vercel never runs the model.

## Architecture

```
Browser (camera + UI)  ──►  /api/predict  ──►  HF Space /predict
                       ◄──  result JSON   ◄──  (class, pathway, confidence, Grad-CAM)
       mark "Wrong" → pick correct item
                       ──►  /api/feedback ──►  HF Space /feedback  (correction memory)
```

## Setup

```bash
cd Compost-AI/web
npm install
cp .env.example .env.local          # set HF_SPACE_URL to your Space (or localhost)
npm run dev                          # http://localhost:3000
```

Run the inference backend (`../inference`) too, or point `HF_SPACE_URL` at a
deployed Space.

> **Camera needs HTTPS or localhost.** It works on the deployed Vercel URL and on
> `localhost` in dev, but not over a plain-HTTP LAN IP. To test on the iPad before
> deploying, deploy to Vercel first.

## Deploy to Vercel

1. Import this `web/` directory as the project root.
2. Set the env var **`HF_SPACE_URL`** (e.g. `https://<user>-compost-ai-inference.hf.space`).
   Add `HF_TOKEN` only if the Space is private.
3. Deploy, open the URL on the iPad in Safari, allow camera access.

## iPad kiosk mode

Settings → Accessibility → **Guided Access** on; set auto-lock to **Never**; lock
Safari to this URL so it can't drift to the home screen during use.

## Key files

| Path | Role |
|------|------|
| `app/page.tsx` | flow state machine: camera → loading → result/error |
| `components/camera-view.tsx` | fullscreen `getUserMedia`, flip, square capture |
| `components/result-view.tsx` | photo/Grad-CAM toggle, verdict, confirm/correct |
| `components/correction-dialog.tsx` | grouped picker for the correct item |
| `app/api/predict/route.ts`, `app/api/feedback/route.ts` | server-side proxy to the Space |
| `lib/labels.ts` | 30 classes + disposal map (mirror of the backend) |
