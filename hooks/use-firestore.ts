import { useState, useEffect } from 'react';
import { 
  addDocument, 
  getDocument, 
  getDocuments, 
  updateDocument, 
  deleteDocument,
  setDocument,
  subscribeToDocument
} from '../lib/firestore';
import { QueryConstraint } from 'firebase/firestore';

const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

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
  const { set, update } = useFirestore();
  const { data: roomData, loading } = useDocument('rooms', roomId || null, true);
  const [hasJoined, setHasJoined] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<any>(null);

  const debouncedUpdates = useDebounce(pendingUpdates, 300);

  useEffect(() => {
    if (debouncedUpdates && roomId) {
      update('rooms', roomId, debouncedUpdates);
      setPendingUpdates(null);
    }
  }, [debouncedUpdates, roomId, update]);

  const batchUpdate = (updates: any) => {
    setPendingUpdates((prev: any) => ({
      ...prev,
      ...updates,
      lastUpdated: new Date()
    }));
  };

  const joinRoom = async () => {
    if (!roomId || !playerName || hasJoined) return;

    const participant = {
      name: playerName,
      isHost,
      joinedAt: new Date(),
      vote: null,
      hasVoted: false
    };

    try {
      if (roomData) {
        const existingParticipants = roomData.participants || [];
        const participantExists = existingParticipants.some((p: any) => p.name === playerName);
        
        if (!participantExists) {
          const updatedParticipants = [...existingParticipants, participant];
          await update('rooms', roomId, {
            participants: updatedParticipants
          });
        } else {
          const updatedParticipants = existingParticipants.map((p: any) => 
            p.name === playerName ? { ...p, isHost, joinedAt: new Date() } : p
          );
          await update('rooms', roomId, {
            participants: updatedParticipants
          });
        }
      } else if (roomData === null) {
        await set('rooms', roomId, {
          createdAt: new Date(),
          votesRevealed: false,
          participants: [participant]
        });
      }
      
      setHasJoined(true);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  useEffect(() => {
    if (roomId && playerName && !loading && roomData !== undefined && !hasJoined) {
      joinRoom();
    }
  }, [roomId, playerName, loading, roomData, hasJoined]);

  const vote = async (points: number | string) => {
    if (!roomId || !playerName || !roomData) return;

    const participants = roomData.participants || [];
    const updatedParticipants = participants.map((p: any) => 
      p.name === playerName 
        ? { ...p, vote: points, hasVoted: true }
        : p
    );

    batchUpdate({
      participants: updatedParticipants
    });
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

  const removePlayer = async (playerName: string) => {
    if (!roomId || !roomData) return;

    const participants = roomData.participants || [];
    const updatedParticipants = participants.filter((p: any) => p.name !== playerName);

    await update('rooms', roomId, {
      participants: updatedParticipants
    });
  };

  return {
    room: roomData,
    loading,
    hasJoined,
    joinRoom,
    vote,
    revealVotes,
    startNewRound,
    removePlayer
  };
};
