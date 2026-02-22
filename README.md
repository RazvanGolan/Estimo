# Estimo 🃏

Real-time story point estimation for agile teams. No accounts, no setup, no nonsense. Create a room, share the link, and start estimating.

![Estimo demo](https://github.com/user-attachments/assets/62dc1741-130c-424b-abae-56371e2a1c8f)

## Features

- Create or join rooms instantly, no account required
- Hidden voting with a Fibonacci deck to prevent anchoring bias
- Host controls: reveal votes, start new rounds, transfer host, remove players
- Live results with statistics and charts
- Real-time sync across all clients via Firestore
- Share rooms via link or QR code

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 with TypeScript |
| Build tool | Vite |
| Routing | React Router |
| Backend / Database | Firebase Firestore (serverless, real-time) |
| Styling | Tailwind CSS v4 |
| Component library | shadcn/ui (Radix UI primitives) |
| Charts | Recharts |
| Icons | Lucide React |
| Deployment | Vercel |

## Architecture Notes

The app is fully serverless. Firebase Firestore handles all persistence and real-time synchronization via snapshot listeners. All write operations that involve participant state (joining, voting, removing players, transferring host) use Firestore transactions with automatic retry on contention, preventing race conditions when multiple clients write simultaneously.

Host assignment is managed entirely through Firestore. The first participant to join a new room is set as host. If the host leaves, the longest-standing remaining participant is promoted automatically.
