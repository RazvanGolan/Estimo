"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { useFirestore } from "../../hooks/use-firestore"

export default function HomePage() {
  const [roomId, setRoomId] = useState("")
  const [showUsernameForm, setShowUsernameForm] = useState(false)
  const [actionType, setActionType] = useState<"create" | "join">("create")
  const [playerName, setPlayerName] = useState("")
  const navigate = useNavigate()
  const { add } = useFirestore()

  useEffect(() => {
    const savedPlayerName = localStorage.getItem("estimo_player_name")
    if (savedPlayerName) {
      setPlayerName(savedPlayerName)
    }
  }, [])

  const saveUserData = (name: string) => {
    localStorage.setItem("estimo_player_name", name)
  }

  const clearStoredData = () => {
    if (window.confirm("This will clear your saved name. Are you sure?")) {
      localStorage.removeItem("estimo_player_name")
      setPlayerName("")
      setRoomId("")
    }
  }

  const handleCreateRoom = () => {
    setActionType("create")
    setShowUsernameForm(true)
  }

  const handleJoinRoom = () => {
    if (!roomId.trim()) return
    setActionType("join")
    setShowUsernameForm(true)
  }

  const submitUsername = async () => {
    if (!playerName.trim()) return

    saveUserData(playerName.trim())

    if (actionType === "create") {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      await add('rooms', {
        roomId: newRoomId,
        hostName: playerName,
        createdAt: new Date(),
        isActive: true,
        participants: [playerName]
      })
      saveUserData(playerName.trim())
      navigate(`/room/${newRoomId}?name=${encodeURIComponent(playerName)}&host=true`)
    } else {
      saveUserData(playerName.trim())
      navigate(`/room/${roomId}?name=${encodeURIComponent(playerName)}`)
    }
  }

  if (showUsernameForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">Estimo</h1>
            <p className="text-muted-foreground text-lg">Enter your username</p>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-center">
                {actionType === "create" ? "Create Room" : `Join Room ${roomId}`}
              </CardTitle>
              <CardDescription className="text-center">Choose a username to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-input border-border"
                  onKeyDown={(e) => e.key === "Enter" && submitUsername()}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowUsernameForm(false)}
                  variant="outline"
                  className="flex-1 border-border hover:bg-accent hover:text-accent-foreground bg-transparent"
                >
                  Back
                </Button>
                <Button
                  onClick={submitUsername}
                  disabled={!playerName.trim()}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Estimo</h1>
          <p className="text-muted-foreground text-lg">Story Point Estimation for Agile Teams</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-center">Get Started</CardTitle>
            <CardDescription className="text-center">Join an existing room or create a new one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleCreateRoom}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              Create New Room
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomId">Room ID</Label>
              <Input
                id="roomId"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="bg-input border-border"
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />
            </div>

            <Button
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
              variant="outline"
              className="w-full border-border hover:bg-accent hover:text-accent-foreground bg-transparent"
              size="lg"
            >
              Join Room
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>Planning poker made simple</p>
          {playerName && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearStoredData}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear stored data
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
