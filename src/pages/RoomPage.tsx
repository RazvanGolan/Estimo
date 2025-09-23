import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useParams, useLocation } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Users, Eye, EyeOff, RotateCcw, Copy, Check, QrCode, Trash2, LogOut, Github } from "lucide-react"
import { useToast } from "../hooks/use-toast"
import { useRoom } from "../../hooks/use-firestore"

const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21, 34, '?', '∞', '☕', '🥷']

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const location = useLocation()
  const { toast } = useToast()

  const searchParams = new URLSearchParams(location.search)
  const urlPlayerName = searchParams.get("name")
  const isHost = searchParams.get("host") === "true"

  const [playerName, setPlayerName] = useState<string>(() => {
    const storedName = localStorage.getItem("estimo_player_name")
    if (storedName) {
      return storedName
    }
    if (urlPlayerName) {
      return urlPlayerName
    }
    return ""
  })

  const [showNameModal, setShowNameModal] = useState<boolean>(() => {
    return !urlPlayerName && !localStorage.getItem("estimo_player_name")
  })

  const [tempName, setTempName] = useState("")

  const { room, loading, hasJoined, vote: roomVote, revealVotes, startNewRound, removePlayer } = useRoom(
    roomId, 
    playerName, 
    isHost
  )

  const [currentPlayerVote, setCurrentPlayerVote] = useState<number | string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  const prevParticipantsRef = useRef<any[]>([])
  const prevVotesRevealedRef = useRef(false)

  const participants = useMemo(() => room?.participants || [], [room?.participants])
  
  const { anyPlayerVoted, votedPlayers } = useMemo(() => {
    const voted = participants.filter((p: any) => p.hasVoted)
    return {
      anyPlayerVoted: voted.length > 0,
      votedPlayers: voted
    }
  }, [participants])

  const handleVote = useCallback(async (points: number | string) => {
    setCurrentPlayerVote(points)
    await roomVote(points)
  }, [roomVote])

  const handleNameSubmit = useCallback(() => {
    if (!tempName.trim()) return
    
    const finalName = tempName.trim()
    setPlayerName(finalName)
    localStorage.setItem("estimo_player_name", finalName)
    setShowNameModal(false)
    
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set("name", finalName)
    window.history.replaceState({}, "", newUrl.toString())
  }, [tempName])

  useEffect(() => {
    if (playerName) {
      localStorage.setItem("estimo_player_name", playerName)
    }
  }, [playerName])

  useEffect(() => {
    if (room?.participants) {
      const currentPlayer = room.participants.find((p: any) => p.name === playerName)
      if (currentPlayer) {
        setCurrentPlayerVote(currentPlayer.vote)
      }
    }
  }, [room?.participants, playerName])

  useEffect(() => {
    if (room?.participants && prevParticipantsRef.current.length > 0) {
      const newParticipants = room.participants.filter((p: any) => 
        !prevParticipantsRef.current.some((prev: any) => prev.name === p.name)
      )

      newParticipants.forEach((p: any) => {
        if (p.name !== playerName) {
          toast({
            title: "Player joined",
            description: `${p.name} joined the room`,
          })
        }
      })
    }
    prevParticipantsRef.current = room?.participants || []
  }, [room?.participants, playerName, toast])

  // Check if current user has been removed from the room
  useEffect(() => {
    if (room && !loading && room.participants && playerName && hasJoined) {
      const currentPlayer = room.participants.find((p: any) => p.name === playerName)
      
      if (!currentPlayer) {
        
        toast({
          title: "You were removed from the room",
          description: "Redirecting to home page...",
        })
        
        window.location.href = "/"
      }
    }
  }, [room, loading, playerName, hasJoined, toast])

  useEffect(() => {
    if (room?.votesRevealed && !prevVotesRevealedRef.current && room.participants?.length > 0) {
      toast({
        title: "Votes revealed!",
        description: "All votes are now visible to everyone",
      })
    }
    prevVotesRevealedRef.current = room?.votesRevealed || false
  }, [room?.votesRevealed, room?.participants, toast])

  const handleRemovePlayer = useCallback(async (playerToRemove: string) => {
    if (playerToRemove === playerName) {
      if (window.confirm("Are you sure you want to leave the room?")) {
        await removePlayer(playerToRemove)
        window.location.href = "/"
      }
    } else if (isHost) {
      if (window.confirm(`Are you sure you want to remove ${playerToRemove} from the room?`)) {
        await removePlayer(playerToRemove)
        toast({
          title: "Player removed",
          description: `${playerToRemove} has been removed from the room`,
        })
      }
    }
  }, [playerName, isHost, removePlayer, toast])

  const copyRoomLink = useCallback(async () => {
    const url = `${window.location.origin}/room/${roomId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast({
      title: "Room link copied!",
      description: "Share this link with your team members.",
    })
    setTimeout(() => setCopied(false), 2000)
  }, [roomId, toast])

  const generateQRCode = useCallback(() => {
    const roomUrl = `${window.location.origin}/room/${roomId}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(roomUrl)}`
  }, [roomId])

  const getAverage = useCallback(() => {
    const numericVotes = participants
      .filter((p: any) => p.vote !== null && typeof p.vote === 'number')
      .map((p: any) => p.vote!)
    return numericVotes.length > 0 ? (numericVotes.reduce((a: number, b: number) => a + b, 0) / numericVotes.length).toFixed(1) : "0"
  }, [participants])

  const showNameDialog = !playerName
  const showLoading = !showNameDialog && loading

  const votesRevealed = room?.votesRevealed || false

  return (
    <div className="min-h-screen bg-background p-4">
      {showNameDialog && (
        <Dialog open={showNameModal} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Join Room {roomId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleNameSubmit}
                disabled={!tempName.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Join Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {showLoading && (
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg">Loading room...</div>
          </div>
        </div>
      )}
      {!showNameDialog && !showLoading && (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Room {roomId}</h1>
            <p className="text-muted-foreground">{isHost ? "You are the host" : `Joined as ${playerName}`}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-accent hover:text-accent-foreground bg-transparent"
                >
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">QR Code</span>
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
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share Room"}</span>
            </Button>
            <Button
              onClick={() => handleRemovePlayer(playerName)}
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Leave Room</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {participants.length} player{participants.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1">
            {votesRevealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{votesRevealed ? "Votes revealed" : "Votes hidden"}</span>
            <span className="sm:hidden">{votesRevealed ? "Revealed" : "Hidden"}</span>
          </div>
          <div>
            {votedPlayers.length}/{participants.length} voted
          </div>
        </div>

        {/* Voting Cards */}
        {!votesRevealed && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Select Your Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 sm:gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {participants.map((player: any) => (
            <Card key={player.name} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-card-foreground">{player.name}</h3>
                    {player.name === playerName && (
                      <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                        You
                      </Badge>
                    )}
                  </div>
                  {(isHost && player.name !== playerName) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePlayer(player.name)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      title={player.name === playerName ? "Leave room" : "Remove player"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{getAverage()}</p>
                  <p className="text-sm text-muted-foreground">Average</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {(() => {
                      const numericVotes = participants.filter((p: any) => p.vote !== null && typeof p.vote === 'number').map((p: any) => p.vote!);
                      return numericVotes.length > 0 ? Math.min(...numericVotes) : 'N/A';
                    })()}
                  </p>
                  <p className="text-sm text-muted-foreground">Minimum</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {(() => {
                      const numericVotes = participants.filter((p: any) => p.vote !== null && typeof p.vote === 'number').map((p: any) => p.vote!);
                      return numericVotes.length > 0 ? Math.max(...numericVotes) : 'N/A';
                    })()}
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
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={revealVotes}
              disabled={!anyPlayerVoted || votesRevealed}
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

        {/* Footer */}
        <div className="flex justify-center pt-8">
          <Button
            onClick={() => window.open("https://github.com/RazvanGolan/Estimo", "_blank")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Github className="h-4 w-4 mr-2" />
            View on GitHub
          </Button>
        </div>
      </div>
  )}
    </div>
  )
}
