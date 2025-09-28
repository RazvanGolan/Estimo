import { useState, useEffect } from 'react';
import { 
  addDocument, 
  getDocument, 
  getDocuments, 
  updateDocument, 
  deleteDocument,
  setDocument,
  subscribeToDocument,
  joinRoomTransaction,
  updatePlayerVoteTransaction,
  removePlayerTransaction
} from '../lib/firestore';
import { QueryConstraint } from 'firebase/firestore';


export const useDocument = (
  collectionName: string, 
  id: string | null,
  realtime: boolean = false
) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      const unsubscribe = subscribeToDocument(
        collectionName,
        id,
        (document) => {
          setData(document);
          setError(null);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      const fetchDocument = async () => {
        setLoading(true);
        const result = await getDocument(collectionName, id);
        
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error);
          setData(null);
        }
        
        setLoading(false);
      };

      fetchDocument();
    }
  }, [collectionName, id, realtime]);

  return { data, loading, error };
};

export const useCollection = (
  collectionName: string, 
  constraints: QueryConstraint[] = []
) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      const result = await getDocuments(collectionName, constraints);
      
      if (result.success) {
        setData(result.data || []);
        setError(null);
      } else {
        setError(result.error);
        setData([]);
      }
      
      setLoading(false);
    };

    fetchDocuments();
  }, [collectionName, JSON.stringify(constraints)]);

  const refresh = async () => {
    const result = await getDocuments(collectionName, constraints);
    if (result.success) {
      setData(result.data || []);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  return { data, loading, error, refresh };
};

export const useFirestore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const add = async (collectionName: string, data: any) => {
    setLoading(true);
    setError(null);
    
    const result = await addDocument(collectionName, data);
    
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
    
    return result;
  };

  const set = async (collectionName: string, id: string, data: any) => {
    setLoading(true);
    setError(null);
    
    const result = await setDocument(collectionName, id, data);
    
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
    
    return result;
  };

  const update = async (collectionName: string, id: string, data: any) => {
    setLoading(true);
    setError(null);
    
    const result = await updateDocument(collectionName, id, data);
    
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
    
    return result;
  };

  const remove = async (collectionName: string, id: string) => {
    setLoading(true);
    setError(null);
    
    const result = await deleteDocument(collectionName, id);
    
    setLoading(false);
    if (!result.success) {
      setError(result.error);
    }
    
    return result;
  };

  return { add, set, update, remove, loading, error };
};

export const useRoom = (roomId: string | undefined, playerName: string, isHost: boolean) => {
  const { update } = useFirestore();
  const { data: roomData, loading } = useDocument('rooms', roomId || null, true);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lastVoteTime, setLastVoteTime] = useState(0);

  const joinRoom = async () => {
    if (!roomId || !playerName || hasJoined || isJoining) return;
    
    setIsJoining(true);
    
    const randomDelay = Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, randomDelay));

    const participant = {
      name: playerName,
      isHost,
      joinedAt: new Date(),
      vote: null,
      hasVoted: false
    };

    try {
      console.log('Attempting to join room:', roomId, 'as:', playerName);
      
      const joinPromise = joinRoomTransaction(roomId, participant);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Join timeout')), 10000)
      );
      
      const result = await Promise.race([joinPromise, timeoutPromise]) as any;
      
      if (result && result.success) {
        console.log('Successfully joined room:', result);
        setHasJoined(true);
      } else {
        console.warn('Join failed, retrying...', result);
        setTimeout(() => {
          setIsJoining(false);
          joinRoom();
        }, 1000 + Math.random() * 1000);
      }
    } catch (error) {
      console.error('Join error:', error);
      setTimeout(() => {
        setIsJoining(false);
        joinRoom();
      }, 2000 + Math.random() * 1000);
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (roomId && playerName && !loading && !hasJoined && !isJoining) {
      const timeout = setTimeout(joinRoom, Math.random() * 200);
      return () => clearTimeout(timeout);
    }
  }, [roomId, playerName, loading, hasJoined, isJoining]);

  const vote = async (points: number | string) => {
    if (!roomId || !playerName) return;

    const now = Date.now();
    if (now - lastVoteTime < 500) return;
    setLastVoteTime(now);

    try {
      await updatePlayerVoteTransaction(roomId, playerName, points, true);
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const revealVotes = async () => {
    if (!roomId) return;
    await update('rooms', roomId, { votesRevealed: true });
  };

  const startNewRound = async () => {
    if (!roomId || !roomData) return;

    const participants = roomData.participants || [];
    const resetParticipants = participants.map((p: any) => ({
      ...p,
      vote: null,
      hasVoted: false
    }));

    await update('rooms', roomId, {
      participants: resetParticipants,
      votesRevealed: false
    });
  };

  const removePlayer = async (playerToRemove: string) => {
    if (!roomId) return;

    try {
      await removePlayerTransaction(roomId, playerToRemove);
    } catch (error) {
      console.error('Remove player error:', error);
    }
  };

  return {
    room: roomData,
    loading,
    hasJoined,
    isJoining,
    joinRoom,
    vote,
    revealVotes,
    startNewRound,
    removePlayer
  };
};
