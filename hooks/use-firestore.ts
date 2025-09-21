import { useState, useEffect } from 'react';
import { 
  addDocument, 
  getDocument, 
  getDocuments, 
  updateDocument, 
  deleteDocument 
} from '../lib/firestore';
import { QueryConstraint } from 'firebase/firestore';

export const useDocument = (collectionName: string, id: string | null) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

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
  }, [collectionName, id]);

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

  return { add, update, remove, loading, error };
};
