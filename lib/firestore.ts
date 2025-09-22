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
  Unsubscribe
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
