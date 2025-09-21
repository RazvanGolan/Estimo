import { useState, useEffect, useRef } from "react"
import { useParams, useLocation } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Users, Eye, EyeOff, RotateCcw, Copy, Check, QrCode } from "lucide-react"
import { useToast } from "../hooks/use-toast"
import { useCollection, useFirestore } from "../../hooks/use-firestore"
import { createWhereConstraint } from "../../lib/firestore"

const STORY_POINTS = [1, 2, 3, 5, 8, 13]

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const location = useLocation()
  const { toast } = useToast()

  const searchParams = new URLSearchParams(location.search)
  const playerName = searchParams.get("name") || "Anonymous"
  const isHost = searchParams.get("host") === "true"

  const { data: participants } = useCollection('participants', 
    roomId ? [createWhereConstraint('roomId', '==', roomId)] : []
  )
  const { data: votes, refresh: refreshVotes } = useCollection('votes',
    roomId ? [createWhereConstraint('roomId', '==', roomId)] : []
  )
  const { add, update } = useFirestore()

  const [currentPlayerVote, setCurrentPlayerVote] = useState<number | null>(null)
  const [votesRevealed, setVotesRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const hasJoinedRef = useRef(false)

  useEffect(() => {
    if (roomId && playerName && !hasJoinedRef.current) {
      hasJoinedRef.current = true
      
      const storageKey = `participant_${roomId}_${playerName}`
      const existingParticipantId = localStorage.getItem(storageKey)
      
      if (existingParticipantId) {
        return
      }

      add('participants', {
        roomId,
        name: playerName,
        isHost,
        joinedAt: new Date()
      }).then((result) => {
        if (result.success && result.id) {
          localStorage.setItem(storageKey, result.id)
        }
      })
    }
  }, [roomId, playerName, isHost, add])

  useEffect(() => {
    if (roomId && playerName) {
      const voteStorageKey = `vote_${roomId}_${playerName}`
      const savedVote = localStorage.getItem(voteStorageKey)
      
      if (savedVote) {
        setCurrentPlayerVote(parseInt(savedVote))
      } else {
        const myVote = votes?.find(v => v.participantName === playerName && v.roomId === roomId)
        if (myVote) {
          setCurrentPlayerVote(myVote.vote)
          localStorage.setItem(voteStorageKey, myVote.vote.toString())
        }
      }
    }
  }, [votes, playerName, roomId])

  const players = participants?.map(p => {
    const playerVote = votes?.find(v => v.participantName === p.name)
    return {
      id: p.id,
      name: p.name,
      vote: playerVote?.vote || null,
      hasVoted: !!playerVote
    }
  }) || []

  const allPlayersVoted = players.length > 0 && players.every((p) => p.hasVoted)
  const votedPlayers = players.filter((p) => p.hasVoted)

  const handleVote = async (points: number) => {
    setCurrentPlayerVote(points)
    const voteStorageKey = `vote_${roomId}_${playerName}`
    localStorage.setItem(voteStorageKey, points.toString())
    
    const existingVote = votes?.find(v => v.participantName === playerName && v.roomId === roomId)
    
    if (existingVote) {
      await update('votes', existingVote.id, { vote: points })
    } else {
      await add('votes', {
        roomId,
        participantName: playerName,
        vote: points,
        votedAt: new Date()
      })
    }
    refreshVotes()
  }

  const revealVotes = () => {
    setVotesRevealed(true)
  }

  const startNewRound = async () => {
    setVotesRevealed(false)
    setCurrentPlayerVote(null)
    
    const voteStorageKey = `vote_${roomId}_${playerName}`
    localStorage.removeItem(voteStorageKey)
    
    if (votes) {
      for (const vote of votes) {
        await update('votes', vote.id, { vote: null })
      }
      refreshVotes()
    }
  }

  const copyRoomLink = async () => {
    const url = `${window.location.origin}/room/${roomId}?name=`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast({
      title: "Room link copied!",
      description: "Share this link with your team members.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const generateQRCode = () => {
    const roomUrl = `${window.location.origin}/room/${roomId}?name=`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(roomUrl)}`
  }

  const getAverage = () => {
    const votes = players.filter((p) => p.vote !== null).map((p) => p.vote!)
    return votes.length > 0 ? (votes.reduce((a, b) => a + b, 0) / votes.length).toFixed(1) : "0"
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Room {roomId}</h1>
            <p className="text-muted-foreground">{isHost ? "You are the host" : `Joined as ${playerName}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-accent hover:text-accent-foreground bg-transparent"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Room via QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-4 rounded-lg">
                    <img src={generateQRCode() || "/placeholder.svg"} alt="Room QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">Scan this QR code to join room {roomId}</p>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={copyRoomLink}
              variant="outline"
              size="sm"
              className="border-border hover:bg-accent hover:text-accent-foreground bg-transparent"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Share Room"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {players.length} player{players.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1">
            {votesRevealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {votesRevealed ? "Votes revealed" : "Votes hidden"}
          </div>
          <div>
            {votedPlayers.length}/{players.length} voted
          </div>
        </div>

        {/* Voting Cards */}
        {!votesRevealed && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Select Your Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {STORY_POINTS.map((points) => (
                  <Button
                    key={points}
                    onClick={() => handleVote(points)}
                    variant={currentPlayerVote === points ? "default" : "outline"}
                    className={`h-16 text-lg font-bold ${
                      currentPlayerVote === points
                        ? "bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {points}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map((player) => (
            <Card key={player.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-card-foreground">{player.name}</h3>
                  {player.name === playerName && (
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                      You
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-center h-20">
                  {player.hasVoted ? (
                    <div
                      className={`w-16 h-20 rounded-lg border-2 flex items-center justify-center text-xl font-bold ${
                        votesRevealed
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-card-foreground"
                      }`}
                    >
                      {votesRevealed ? player.vote : "?"}
                    </div>
                  ) : (
                    <div className="w-16 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                      <span className="text-sm">No vote</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Results Summary */}
        {votesRevealed && votedPlayers.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{getAverage()}</p>
                  <p className="text-sm text-muted-foreground">Average</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.min(...players.filter((p) => p.vote !== null).map((p) => p.vote!))}
                  </p>
                  <p className="text-sm text-muted-foreground">Minimum</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.max(...players.filter((p) => p.vote !== null).map((p) => p.vote!))}
                  </p>
                  <p className="text-sm text-muted-foreground">Maximum</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{votedPlayers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Votes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Host Controls */}
        {isHost && (
          <div className="flex gap-3 justify-center">
            <Button
              onClick={revealVotes}
              disabled={!allPlayersVoted || votesRevealed}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Eye className="h-4 w-4 mr-2" />
              Reveal Votes
            </Button>
            <Button
              onClick={startNewRound}
              disabled={!votesRevealed}
              variant="outline"
              className="border-border hover:bg-accent hover:text-accent-foreground bg-transparent"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              New Round
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
