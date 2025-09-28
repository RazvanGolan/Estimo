import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  QueryConstraint,
  Unsubscribe,
  arrayUnion,
  arrayRemove,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export const addDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding document:', error);
    return { success: false, error };
  }
};

export const setDocument = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data);
    return { success: true, id };
  } catch (error) {
    console.error('Error setting document:', error);
    return { success: false, error };
  }
};

export const getDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Document not found' };
    }
  } catch (error) {
    console.error('Error getting document:', error);
    return { success: false, error };
  }
};

export const getDocuments = async (
  collectionName: string, 
  constraints: QueryConstraint[] = []
) => {
  try {
    const collectionRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
    const querySnapshot = await getDocs(q);
    
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data: documents };
  } catch (error) {
    console.error('Error getting documents:', error);
    return { success: false, error };
  }
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (error) {
    console.error('Error updating document:', error);
    return { success: false, error };
  }
};

export const deleteDocument = async (collectionName: string, id: string) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { success: false, error };
  }
};

export const createWhereConstraint = (field: string, operator: any, value: any) => 
  where(field, operator, value);

export const createOrderByConstraint = (field: string, direction: 'asc' | 'desc' = 'asc') => 
  orderBy(field, direction);

export const createLimitConstraint = (limitCount: number) => 
  limit(limitCount);

export const subscribeToDocument = (
  collectionName: string,
  id: string,
  callback: (data: any | null) => void,
  errorCallback?: (error: any) => void
): Unsubscribe => {
  try {
    const docRef = doc(db, collectionName, id);
    
    return onSnapshot(docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error in document snapshot:', error);
        if (errorCallback) {
          errorCallback(error);
        }
      }
    );
  } catch (error) {
    console.error('Error setting up document listener:', error);
    if (errorCallback) {
      errorCallback(error);
    }
    return () => {}; // Return empty unsubscribe function
  }
};

export const addToArray = async (collectionName: string, id: string, field: string, value: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      [field]: arrayUnion(value)
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const removeFromArray = async (collectionName: string, id: string, field: string, value: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      [field]: arrayRemove(value)
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const joinRoomTransaction = async (roomId: string, participant: any) => {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const roomDoc = await transaction.get(roomRef);
        
        if (!roomDoc.exists()) {
          transaction.set(roomRef, {
            createdAt: new Date(),
            votesRevealed: false,
            participants: [participant]
          });
          return { success: true, created: true };
        } else {
          const roomData = roomDoc.data();
          const existingParticipants = roomData.participants || [];
          
          const participantExists = existingParticipants.some((p: any) => 
            p.name === participant.name
          );
          
          if (participantExists) {
            const updatedParticipants = existingParticipants.map((p: any) => 
              p.name === participant.name 
                ? { ...p, ...participant, joinedAt: new Date() }
                : p
            );
            transaction.update(roomRef, { participants: updatedParticipants });
            return { success: true, updated: true };
          } else {
            const updatedParticipants = [...existingParticipants, participant];
            transaction.update(roomRef, { participants: updatedParticipants });
            return { success: true, added: true };
          }
        }
      });
      
      return result;
    } catch (error: any) {
      console.error('Transaction error:', error);
      if (error.code === 'aborted' && attempt < maxRetries - 1) {
        const delay = Math.random() * 1000 + (attempt * 500);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return { success: false, error };
    }
  }
  
  return { success: false, error: new Error('Transaction failed after max retries') };
};

export const updatePlayerVoteTransaction = async (roomId: string, playerName: string, vote: any, hasVoted: boolean) => {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const roomDoc = await transaction.get(roomRef);
        
        if (!roomDoc.exists()) {
          throw new Error('Room not found');
        }
        
        const roomData = roomDoc.data();
        const participants = roomData.participants || [];
        
        const updatedParticipants = participants.map((p: any) => 
          p.name === playerName 
            ? { ...p, vote, hasVoted }
            : p
        );
        
        transaction.update(roomRef, { participants: updatedParticipants });
        return { success: true };
      });
      
      return result;
    } catch (error: any) {
      console.error('Transaction error:', error);
      if (error.code === 'aborted' && attempt < maxRetries - 1) {
        const delay = Math.random() * 500 + (attempt * 200);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return { success: false, error };
    }
  }
  
  return { success: false, error: new Error('Vote transaction failed after max retries') };
};

export const removePlayerTransaction = async (roomId: string, playerName: string) => {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', roomId);
        const roomDoc = await transaction.get(roomRef);
        
        if (!roomDoc.exists()) {
          throw new Error('Room not found');
        }
        
        const roomData = roomDoc.data();
        const participants = roomData.participants || [];
        
        const updatedParticipants = participants.filter((p: any) => p.name !== playerName);
        
        transaction.update(roomRef, { participants: updatedParticipants });
        return { success: true };
      });
      
      return result;
    } catch (error: any) {
      console.error('Transaction error:', error);
      if (error.code === 'aborted' && attempt < maxRetries - 1) {
        const delay = Math.random() * 500 + (attempt * 200);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return { success: false, error };
    }
  }
  
  return { success: false, error: new Error('Remove player transaction failed after max retries') };
};
